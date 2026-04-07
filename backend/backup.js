/**
 * backup.js — Service de sauvegarde automatique de la base de données
 * - Planning configurable via cron expression (ex: "0 2 * * *" = 2h du matin)
 * - Rétention configurable (nb de fichiers à conserver)
 * - Dossier de sauvegarde configurable depuis les paramètres
 * - Sauvegarde manuelle possible via API
 */

const { exec } = require('child_process');
const fs        = require('fs');
const path      = require('path');
const db        = require('./db');

const DEFAULT_BACKUP_PATH    = '/opt/printflow/backups';
const DEFAULT_SCHEDULE       = '0 2 * * *'; // 2h du matin tous les jours
const DEFAULT_KEEP           = 7;           // 7 fichiers conservés
const DEFAULT_LIBRARY_PATH   = process.env.LIBRARY_PATH || '/opt/printflow/library';

let _cronTimer = null;
let _lastBackup = null;
let _backupStatus = 'idle'; // 'idle' | 'running' | 'success' | 'error'
let _lastError = null;

// ── Lecture des settings ──────────────────────────────────
async function getBackupSettings() {
  try {
    const [rows] = await db.query(
      "SELECT key_name, value FROM settings WHERE key_name LIKE 'backup_%'"
    );
    const s = {};
    rows.forEach(r => { s[r.key_name] = r.value; });
    return {
      enabled:         s.backup_enabled === 'true',
      path:            s.backup_path     || DEFAULT_BACKUP_PATH,
      schedule:        s.backup_schedule || DEFAULT_SCHEDULE,
      keep:            parseInt(s.backup_keep) || DEFAULT_KEEP,
      libraryEnabled:  s.backup_library_enabled === 'true',
      libraryPath:     s.library_path || DEFAULT_LIBRARY_PATH,
    };
  } catch (_) {
    return { enabled: false, path: DEFAULT_BACKUP_PATH, schedule: DEFAULT_SCHEDULE, keep: DEFAULT_KEEP, libraryEnabled: false, libraryPath: DEFAULT_LIBRARY_PATH };
  }
}

// ── Lecture config MariaDB depuis .env ────────────────────
function getDbConfig() {
  return {
    host:   process.env.DB_HOST     || 'localhost',
    user:   process.env.DB_USER     || 'printflow',
    pass:   process.env.DB_PASSWORD || 'printflow_secret',
    name:   process.env.DB_NAME     || 'printflow',
  };
}

// ── Effectuer une sauvegarde ──────────────────────────────
async function runBackup() {
  const settings = await getBackupSettings();
  const dbConf   = getDbConfig();

  // Créer le dossier si nécessaire
  if (!fs.existsSync(settings.path)) {
    fs.mkdirSync(settings.path, { recursive: true });
  }

  const now      = new Date();
  const stamp    = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `printflow_${stamp}.sql`;
  const filepath = path.join(settings.path, filename);

  _backupStatus = 'running';
  console.log(`[Backup] Démarrage sauvegarde → ${filepath}`);

  return new Promise((resolve, reject) => {
    const cmd = `mysqldump -h ${dbConf.host} -u ${dbConf.user} -p${dbConf.pass} ${dbConf.name} > "${filepath}"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        _backupStatus = 'error';
        _lastError    = err.message;
        console.error('[Backup] Erreur :', err.message);
        // Supprimer le fichier vide/corrompu
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(err);
        return;
      }

      _backupStatus = 'success';
      _lastBackup   = { filename, filepath, date: now.toISOString(), size: fs.statSync(filepath).size };
      _lastError    = null;
      console.log(`[Backup] Succès : ${filename} (${(_lastBackup.size / 1024).toFixed(0)} Ko)`);

      // Nettoyage : supprimer les anciens fichiers au-delà de la rétention
      cleanOldBackups(settings.path, settings.keep);

      // Sauvegarde de la bibliothèque si activée
      if (settings.libraryEnabled) {
        backupLibrary(settings).then(() => resolve(_lastBackup)).catch(() => resolve(_lastBackup));
      } else {
        resolve(_lastBackup);
      }
    });
  });
}

// ── Nettoyage des anciennes sauvegardes ───────────────────
function cleanOldBackups(backupPath, keep) {
  try {
    const files = fs.readdirSync(backupPath)
      .filter(f => f.startsWith('printflow_') && f.endsWith('.sql'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupPath, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // Plus récent en premier

    const toDelete = files.slice(keep);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(backupPath, f.name));
      console.log(`[Backup] Supprimé (rétention) : ${f.name}`);
    });
  } catch (e) { console.error('[Backup] Erreur nettoyage :', e.message); }
}

// ── Sauvegarde de la bibliothèque ────────────────────────
async function backupLibrary(settings) {
  if (!fs.existsSync(settings.libraryPath)) {
    console.warn('[Backup] Bibliothèque introuvable :', settings.libraryPath);
    return;
  }
  const now      = new Date();
  const stamp    = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `printflow_library_${stamp}.tar.gz`;
  const filepath = path.join(settings.path, filename);

  return new Promise((resolve, reject) => {
    const cmd = `tar -czf "${filepath}" -C "${path.dirname(settings.libraryPath)}" "${path.basename(settings.libraryPath)}"`;
    exec(cmd, (err) => {
      if (err) {
        console.error('[Backup] Erreur bibliothèque :', err.message);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(err);
        return;
      }
      const size = fs.statSync(filepath).size;
      console.log(`[Backup] Bibliothèque : ${filename} (${(size/1024/1024).toFixed(1)} Mo)`);
      cleanOldLibraryBackups(settings.path, settings.keep);
      resolve({ filename, filepath, size });
    });
  });
}

// ── Nettoyage anciennes sauvegardes bibliothèque ──────────
function cleanOldLibraryBackups(backupPath, keep) {
  try {
    const files = fs.readdirSync(backupPath)
      .filter(f => f.startsWith('printflow_library_') && f.endsWith('.tar.gz'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupPath, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
    files.slice(keep).forEach(f => {
      fs.unlinkSync(path.join(backupPath, f.name));
      console.log(`[Backup] Supprimé bibliothèque (rétention) : ${f.name}`);
    });
  } catch (e) { console.error('[Backup] Erreur nettoyage bibliothèque :', e.message); }
}

// ── Lister les sauvegardes existantes ────────────────────
function listBackups(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) return [];
    return fs.readdirSync(backupPath)
      .filter(f => (f.startsWith('printflow_') && f.endsWith('.sql')) ||
                   (f.startsWith('printflow_library_') && f.endsWith('.tar.gz')))
      .map(f => {
        const stat = fs.statSync(path.join(backupPath, f));
        const type = f.endsWith('.tar.gz') ? 'library' : 'database';
        return { filename: f, size: stat.size, date: stat.mtime.toISOString(), type };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (_) { return []; }
}

// ── Parser une expression cron simple (min heure * * *) ──
function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hour] = parts;
  const m = parseInt(min),  h = parseInt(hour);
  if (isNaN(m) || isNaN(h)) return null;
  return { hour: h, minute: m };
}

// ── Calculer le prochain déclenchement ────────────────────
function nextTrigger(schedule) {
  const parsed = parseCron(schedule);
  if (!parsed) return null;
  const now  = new Date();
  const next = new Date();
  next.setHours(parsed.hour, parsed.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

// ── Démarrer le planificateur ─────────────────────────────
function scheduleTick(settings) {
  if (_cronTimer) clearTimeout(_cronTimer);
  if (!settings.enabled) return;

  const next = nextTrigger(settings.schedule);
  if (!next) return;

  const delay = next.getTime() - Date.now();
  console.log(`[Backup] Prochaine sauvegarde : ${next.toLocaleString('fr-FR')} (dans ${Math.round(delay/60000)} min)`);

  _cronTimer = setTimeout(async () => {
    try { await runBackup(); } catch (_) {}
    // Replanifier pour le lendemain
    const newSettings = await getBackupSettings();
    scheduleTick(newSettings);
  }, delay);
}

// ── Démarrer le service ───────────────────────────────────
async function startBackup() {
  const settings = await getBackupSettings();
  if (settings.enabled) {
    console.log('[Backup] Service démarré — schedule:', settings.schedule);
    scheduleTick(settings);
  } else {
    console.log('[Backup] Service désactivé');
  }
}

// ── Redémarrer après changement de settings ───────────────
async function restartScheduler() {
  if (_cronTimer) { clearTimeout(_cronTimer); _cronTimer = null; }
  const settings = await getBackupSettings();
  if (settings.enabled) scheduleTick(settings);
}

// ── Routes API ────────────────────────────────────────────
function setupRoutes(router) {

  // GET /api/backup/status
  router.get('/status', async (req, res) => {
    try {
      const settings = await getBackupSettings();
      const backups  = listBackups(settings.path);
      const next     = settings.enabled ? nextTrigger(settings.schedule) : null;
      res.json({
        enabled:    settings.enabled,
        schedule:   settings.schedule,
        keep:       settings.keep,
        path:       settings.path,
        status:     _backupStatus,
        lastBackup: _lastBackup,
        lastError:  _lastError,
        nextBackup: next ? next.toISOString() : null,
        backups,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/backup/run — sauvegarde manuelle
  router.post('/run', async (req, res) => {
    if (_backupStatus === 'running')
      return res.status(409).json({ error: 'Sauvegarde déjà en cours' });
    try {
      const result = await runBackup();
      res.json({ ok: true, backup: result });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/backup/download/:filename — télécharger une sauvegarde
  router.get('/download/:filename', async (req, res) => {
    try {
      const settings = await getBackupSettings();
      const filename  = path.basename(req.params.filename); // sécurité
      const filepath  = path.join(settings.path, filename);
      if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Fichier non trouvé' });
      if (!filename.startsWith('printflow_') || (!filename.endsWith('.sql') && !filename.endsWith('.tar.gz')))
        return res.status(400).json({ error: 'Fichier invalide' });
      const mime = filename.endsWith('.tar.gz') ? 'application/gzip' : 'application/sql';
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', mime);
      fs.createReadStream(filepath).pipe(res);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/backup/:filename — supprimer une sauvegarde
  router.delete('/:filename', async (req, res) => {
    try {
      const settings = await getBackupSettings();
      const filename  = path.basename(req.params.filename);
      const filepath  = path.join(settings.path, filename);
      if (!filename.startsWith('printflow_') || (!filename.endsWith('.sql') && !filename.endsWith('.tar.gz')))
        return res.status(400).json({ error: 'Fichier invalide' });
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/backup/settings — mettre à jour et replanifier
  router.post('/settings', async (req, res) => {
    try {
      const { enabled, path: bPath, schedule, keep, libraryEnabled } = req.body;
      const entries = [
        ['backup_enabled',          String(enabled)],
        ['backup_path',             bPath    || DEFAULT_BACKUP_PATH],
        ['backup_schedule',         schedule || DEFAULT_SCHEDULE],
        ['backup_keep',             String(parseInt(keep) || DEFAULT_KEEP)],
        ['backup_library_enabled',  String(libraryEnabled === true || libraryEnabled === 'true')],
      ];
      for (const [k, v] of entries) {
        await db.query(
          'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
          [k, v, v]
        );
      }
      await restartScheduler();
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/backup/export-full — export complet BDD + bibliothèque + config en .tar.gz
  router.get('/export-full', async (req, res) => {
    const { exec } = require('child_process');
    const os   = require('os');
    const settings = await getBackupSettings();
    const dbConf   = getDbConfig();

    const now    = new Date();
    const stamp  = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const tmpDir = path.join(os.tmpdir(), 'printflow_export_' + stamp);
    const outFile = path.join(os.tmpdir(), 'printflow_export_' + stamp + '.tar.gz');

    try {
      // Créer dossier temporaire
      const fs = require('fs');
      fs.mkdirSync(tmpDir, { recursive: true });

      // 1. Dump base de données
      const sqlFile = path.join(tmpDir, 'database.sql');
      await new Promise((resolve, reject) => {
        const cmd = `mysqldump -h ${dbConf.host} -u ${dbConf.user} -p${dbConf.pass} ${dbConf.name} > "${sqlFile}"`;
        exec(cmd, err => err ? reject(err) : resolve());
      });

      // 2. Export config (settings depuis la BDD)
      const [settingRows] = await db.query('SELECT key_name, value FROM settings');
      const configObj = {};
      settingRows.forEach(r => {
        // Ne pas exporter le mot de passe en clair
        if (r.key_name !== 'auth_password') configObj[r.key_name] = r.value;
      });
      configObj._export_date    = now.toISOString();
      configObj._export_version = '1.6.0';
      fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify(configObj, null, 2));

      // 3. Copier la bibliothèque si elle existe
      const libraryPath = settings.libraryPath || process.env.LIBRARY_PATH || '/opt/printflow/library';
      let hasLibrary = false;
      if (fs.existsSync(libraryPath)) {
        await new Promise((resolve, reject) => {
          exec(`cp -r "${libraryPath}" "${tmpDir}/library"`, err => err ? reject(err) : resolve());
        });
        hasLibrary = true;
      }

      // 4. Créer l'archive .tar.gz
      await new Promise((resolve, reject) => {
        exec(`tar -czf "${outFile}" -C "${path.dirname(tmpDir)}" "${path.basename(tmpDir)}"`,
          err => err ? reject(err) : resolve()
        );
      });

      // 5. Envoyer le fichier
      const filename = 'printflow_export_' + stamp + '.tar.gz';
      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
      res.setHeader('Content-Type', 'application/gzip');
      const stream = fs.createReadStream(outFile);
      stream.pipe(res);
      stream.on('end', () => {
        // Nettoyage
        try { exec('rm -rf "' + tmpDir + '" "' + outFile + '"'); } catch(_) {}
      });
    } catch(e) {
      console.error('[Export] Erreur :', e.message);
      try { exec('rm -rf "' + tmpDir + '" "' + outFile + '"'); } catch(_) {}
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { startBackup, setupRoutes, restartScheduler };
