/**
 * backup.js — Service de sauvegarde automatique de la base de données
 * - Planning configurable via cron expression (ex: "0 2 * * *" = 2h du matin)
 * - Rétention configurable (nb de fichiers à conserver)
 * - Dossier de sauvegarde configurable depuis les paramètres
 * - Sauvegarde manuelle possible via API
 */

const { exec, execSync } = require('child_process');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');
const db        = require('./db');
const multer    = require('multer');
const restoreUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500*1024*1024 } });

const DEFAULT_BACKUP_PATH    = '/opt/printflow/backups';
const DEFAULT_SCHEDULE       = '0 2 * * *'; // 2h du matin tous les jours
const DEFAULT_KEEP           = 7;           // 7 fichiers conservés
const DEFAULT_LIBRARY_PATH   = process.env.LIBRARY_PATH || '/opt/printflow/library';
const INSTALL_DIR            = '/opt/printflow';

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
      libraryEnabled:  s.backup_library_enabled !== 'false',
      libraryPath:     s.library_path || DEFAULT_LIBRARY_PATH,
      // NAS
      destination:     s.backup_destination  || 'local',
      nasIp:           s.backup_nas_ip       || '',
      nasShare:        s.backup_nas_share    || '',
      nasUser:         s.backup_nas_user     || '',
      nasPassword:     s.backup_nas_password || '',
      nasFolder:       s.backup_nas_folder   || '/printflow',
      reportEmail:     s.backup_report_email !== 'false',
    };
  } catch (_) {
    return { enabled: false, path: DEFAULT_BACKUP_PATH, schedule: DEFAULT_SCHEDULE,
             keep: DEFAULT_KEEP, libraryEnabled: true, libraryPath: DEFAULT_LIBRARY_PATH,
             destination: 'local', nasIp:'', nasShare:'', nasUser:'', nasPassword:'',
             nasFolder:'/printflow', reportEmail: true };
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

// ── Montage NAS SMB ───────────────────────────────────────
function mountNas(cfg, mountPoint) {
  return new Promise(function(resolve, reject) {
    try { execSync('umount -l "' + mountPoint + '" 2>/dev/null'); } catch(_) {}
    fs.mkdirSync(mountPoint, { recursive: true });
    const share = '//' + cfg.nasIp + '/' + cfg.nasShare;
    const opts  = ['iocharset=utf8','file_mode=0755','dir_mode=0755'];
    if (cfg.nasUser) {
      opts.push('username=' + cfg.nasUser);
      if (cfg.nasPassword) opts.push('password=' + cfg.nasPassword);
    } else { opts.push('guest'); }
    const cmd = 'mount -t cifs "' + share + '" "' + mountPoint + '" -o ' + opts.join(',');
    exec(cmd, function(err) {
      if (err) reject(new Error('Erreur montage NAS : ' + err.message));
      else resolve();
    });
  });
}

function unmountNas(mountPoint) {
  try { execSync('umount -l "' + mountPoint + '" 2>/dev/null'); } catch(_) {}
  try { fs.rmdirSync(mountPoint); } catch(_) {}
}

function getDirSize(dir) {
  try {
    const out = execSync('du -sb "' + dir + '" 2>/dev/null || echo 0').toString();
    return parseInt(out.split('\t')[0]) || 0;
  } catch(_) { return 0; }
}

function formatSize(bytes) {
  if (!bytes || bytes < 1024)      return bytes + ' o';
  if (bytes < 1024*1024)           return Math.round(bytes/1024) + ' Ko';
  if (bytes < 1024*1024*1024)      return (bytes/1024/1024).toFixed(1) + ' Mo';
  return (bytes/1024/1024/1024).toFixed(2) + ' Go';
}

// ── Rapport email ─────────────────────────────────────────
async function sendBackupReport(report) {
  try {
    const { getSmtpConfig, createTransporter } = require('./mailer');
    const cfg = await getSmtpConfig();
    if (!cfg.host || !cfg.email) return;

    const [[appRow]] = await db.query(
      "SELECT value FROM settings WHERE key_name='app_name'"
    ).catch(function(){ return [[{value:'PrintFlow-3D'}]]; });
    const appName = appRow?.value || 'PrintFlow-3D';

    const ok      = report.success;
    const dmin    = Math.floor(report.duration / 60);
    const dsec    = report.duration % 60;
    const durStr  = dmin > 0 ? dmin + 'min ' + dsec + 's' : dsec + 's';
    const subject = (ok ? '[OK] ' : '[ERREUR] ') +
      'Sauvegarde ' + appName + ' — ' + report.date + ' ' + report.time;

    const html = ok ? `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:system-ui,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px}
  h2{color:#16a34a;margin-bottom:4px}.badge{display:inline-block;padding:3px 12px;
  border-radius:20px;font-size:12px;font-weight:600;background:#dcfce7;color:#16a34a;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  td{padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
  td:first-child{color:#6b7280;width:45%}td:last-child{font-weight:500}
  .sec{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;
       letter-spacing:0.06em;padding:12px 0 4px;border-top:1px solid #e5e7eb}
  .footer{margin-top:24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}
</style></head><body>
<h2>Sauvegarde réussie</h2><span class="badge">OK</span>
<table>
  <tr><td class="sec" colspan="2">Informations</td></tr>
  <tr><td>Date</td><td>${report.date} à ${report.time}</td></tr>
  <tr><td>Type</td><td>${report.type}</td></tr>
  <tr><td>Durée</td><td>${durStr}</td></tr>
  <tr><td>Destination</td><td>${report.destination}</td></tr>
  <tr><td class="sec" colspan="2">Contenu sauvegardé</td></tr>
  <tr><td>Base de données</td><td>${formatSize(report.dbSize)}</td></tr>
  <tr><td>Photos</td><td>${report.photoCount} nouveau(x) — ${formatSize(report.photoSize)}</td></tr>
  <tr><td>Bibliothèque</td><td>${report.libCount} nouveau(x) — ${formatSize(report.libSize)}</td></tr>
  <tr><td>Espace total</td><td>${formatSize(report.totalSize)}</td></tr>
  ${report.deleted.length ? `<tr><td class="sec" colspan="2">Rétention</td></tr>
  <tr><td>${report.deleted.length} supprimée(s)</td><td style="font-size:11px;color:#6b7280">${report.deleted.join('<br>')}</td></tr>` : ''}
</table>
<div class="footer">${appName} — Rapport de sauvegarde automatique</div>
</body></html>` : `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body{font-family:system-ui,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px}
  h2{color:#dc2626}.badge{display:inline-block;padding:3px 12px;border-radius:20px;
  font-size:12px;font-weight:600;background:#fee2e2;color:#dc2626;margin-bottom:16px}
  .err{background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;
       font-family:monospace;font-size:13px;color:#991b1b;margin:16px 0}
  .footer{margin-top:24px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}
</style></head><body>
<h2>Échec de la sauvegarde</h2><span class="badge">ERREUR</span>
<p style="color:#6b7280;font-size:13px">Sauvegarde du ${report.date} à ${report.time}</p>
<div class="err">${report.error}</div>
<div class="footer">${appName} — Rapport de sauvegarde automatique</div>
</body></html>`;

    let nodemailer = null;
    try { nodemailer = require('nodemailer'); } catch(_) { return; }
    const transporter = await createTransporter(cfg);
    await transporter.sendMail({ from: cfg.user, to: cfg.email, subject, html });
    console.log('[Backup] Rapport email envoyé à', cfg.email);
  } catch(e) { console.error('[Backup] Erreur envoi mail:', e.message); }
}

// ── Effectuer une sauvegarde incrémentielle ───────────────
async function runBackup() {
  const settings  = await getBackupSettings();
  const dbConf    = getDbConfig();
  const startTime = Date.now();

  const now    = new Date();
  const stamp  = now.toISOString().slice(0,10) + '_' +
                 String(now.getHours()).padStart(2,'0') + '-' +
                 String(now.getMinutes()).padStart(2,'0');

  const report = {
    stamp, success: false, error: null, type: 'Incrémentielle',
    date: now.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}),
    time: String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),
    dbSize: 0, photoCount: 0, photoSize: 0, libCount: 0, libSize: 0,
    totalSize: 0, deleted: [], destination: '', duration: 0,
  };

  let mountPoint = null;
  let backupRoot = null;

  _backupStatus = 'running';

  try {
    // ── Destination ──────────────────────────────────────
    if (settings.destination === 'nas') {
      if (!settings.nasIp || !settings.nasShare)
        throw new Error('Configuration NAS incomplète (IP ou partage manquant)');
      mountPoint = '/tmp/printflow_nas_' + Date.now();
      await mountNas(settings, mountPoint);
      backupRoot = path.join(mountPoint, settings.nasFolder.replace(/^\//, ''));
      report.destination = '//' + settings.nasIp + '/' + settings.nasShare + settings.nasFolder;
    } else {
      backupRoot = settings.path;
      report.destination = settings.path;
    }
    fs.mkdirSync(backupRoot, { recursive: true });

    // ── Trouver la dernière sauvegarde ───────────────────
    const existing = fs.readdirSync(backupRoot)
      .filter(function(d){ return /^\d{4}-\d{2}-\d{2}_/.test(d); })
      .filter(function(d){ return fs.statSync(path.join(backupRoot,d)).isDirectory(); })
      .sort();
    const lastBackup = existing.length > 0 ? path.join(backupRoot, existing[existing.length-1]) : null;
    if (!lastBackup) report.type = 'Complète (première sauvegarde)';

    const destDir = path.join(backupRoot, stamp);
    fs.mkdirSync(destDir, { recursive: true });

    // ── 1. Base de données (toujours complète, compressée) ─
    const dbFile = path.join(destDir, 'database.sql.gz');
    await new Promise(function(resolve, reject) {
      const cmd = 'mysqldump -h' + dbConf.host + ' -u' + dbConf.user +
        ' -p' + dbConf.pass + ' --single-transaction ' + dbConf.name +
        ' | gzip > "' + dbFile + '"';
      exec(cmd, function(err){ if(err) reject(new Error(err.message)); else resolve(); });
    });
    report.dbSize = fs.statSync(dbFile).size;

    // ── 2. Photos (rsync incrémentiel avec hard links) ───
    const PHOTOS_DIR = path.join(INSTALL_DIR, 'frontend', 'uploads', 'photos');
    if (fs.existsSync(PHOTOS_DIR)) {
      const photosDest = path.join(destDir, 'photos');
      fs.mkdirSync(photosDest, { recursive: true });
      let cmd = 'rsync -a --stats';
      if (lastBackup && fs.existsSync(path.join(lastBackup, 'photos')))
        cmd += ' --link-dest="' + path.join(lastBackup, 'photos') + '"';
      cmd += ' "' + PHOTOS_DIR + '/" "' + photosDest + '/"';
      const out = await new Promise(function(resolve){
        exec(cmd, function(err, stdout){ resolve(stdout||''); });
      });
      const m = out.match(/Number of regular files transferred: (\d+)/);
      report.photoCount = m ? parseInt(m[1]) : 0;
      report.photoSize  = getDirSize(photosDest);
    }

    // ── 3. Bibliothèque (rsync incrémentiel) ─────────────
    if (settings.libraryEnabled && fs.existsSync(settings.libraryPath)) {
      const libDest = path.join(destDir, 'library');
      fs.mkdirSync(libDest, { recursive: true });
      let cmd = 'rsync -a --stats';
      if (lastBackup && fs.existsSync(path.join(lastBackup, 'library')))
        cmd += ' --link-dest="' + path.join(lastBackup, 'library') + '"';
      cmd += ' "' + settings.libraryPath + '/" "' + libDest + '/"';
      const out = await new Promise(function(resolve){
        exec(cmd, function(err, stdout){ resolve(stdout||''); });
      });
      const m = out.match(/Number of regular files transferred: (\d+)/);
      report.libCount = m ? parseInt(m[1]) : 0;
      report.libSize  = getDirSize(libDest);
    }

    // ── Manifest ────────────────────────────────────────
    fs.writeFileSync(path.join(destDir,'manifest.json'), JSON.stringify({
      stamp, date: now.toISOString(), type: report.type,
      dbSize: report.dbSize, photoCount: report.photoCount, libCount: report.libCount,
    }, null, 2));

    // ── Rétention ────────────────────────────────────────
    const allDirs = fs.readdirSync(backupRoot)
      .filter(function(d){ return /^\d{4}-\d{2}-\d{2}_/.test(d); })
      .filter(function(d){ return fs.statSync(path.join(backupRoot,d)).isDirectory(); })
      .sort();
    if (allDirs.length > settings.keep) {
      const toDelete = allDirs.slice(0, allDirs.length - settings.keep);
      for (const dir of toDelete) {
        await new Promise(function(resolve){
          exec('rm -rf "' + path.join(backupRoot, dir) + '"', resolve);
        });
        report.deleted.push(dir);
        console.log('[Backup] Supprimé (rétention) :', dir);
      }
    }

    report.totalSize = getDirSize(backupRoot);
    report.success   = true;
    _backupStatus    = 'success';
    _lastBackup      = { stamp, date: now.toISOString(), dbSize: report.dbSize };
    _lastError       = null;
    console.log('[Backup] OK —', stamp, '(' + Math.round((Date.now()-startTime)/1000) + 's)');

  } catch(e) {
    report.error  = e.message;
    report.success = false;
    _backupStatus = 'error';
    _lastError    = e.message;
    console.error('[Backup] ERREUR :', e.message);
  } finally {
    if (mountPoint) unmountNas(mountPoint);
  }

  report.duration = Math.round((Date.now() - startTime) / 1000);

  // Sauvegarder le statut
  await db.query(
    'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
    ['backup_last_run', now.toISOString(), now.toISOString()]
  ).catch(function(){});
  await db.query(
    'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
    ['backup_last_status', report.success ? 'ok' : 'error:'+report.error,
     report.success ? 'ok' : 'error:'+report.error]
  ).catch(function(){});

  // Rapport email
  if (settings.reportEmail) {
    sendBackupReport(report).catch(function(){});
  }

  return report;
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
      const next     = settings.enabled ? nextTrigger(settings.schedule) : null;
      // Lister les sauvegardes (dossiers horodatés)
      let backups = [];
      try {
        const root = settings.path;
        if (fs.existsSync(root)) {
          backups = fs.readdirSync(root)
            .filter(function(d){ return /^\d{4}-\d{2}-\d{2}_/.test(d); })
            .filter(function(d){ return fs.statSync(path.join(root,d)).isDirectory(); })
            .sort().reverse()
            .map(function(d) {
              const manifest = path.join(root, d, 'manifest.json');
              let info = { stamp: d };
              try { info = Object.assign(info, JSON.parse(fs.readFileSync(manifest))); } catch(_) {}
              return info;
            });
        }
      } catch(_) {}
      const [[lastRun]]    = await db.query("SELECT value FROM settings WHERE key_name='backup_last_run'").catch(function(){ return [[null]]; });
      const [[lastStatus]] = await db.query("SELECT value FROM settings WHERE key_name='backup_last_status'").catch(function(){ return [[null]]; });
      res.json({
        enabled:     settings.enabled,
        schedule:    settings.schedule,
        keep:        settings.keep,
        path:        settings.path,
        destination: settings.destination,
        nasIp:       settings.nasIp,
        nasShare:    settings.nasShare,
        nasFolder:   settings.nasFolder,
        reportEmail: settings.reportEmail,
        status:      _backupStatus,
        lastBackup:  _lastBackup,
        lastError:   _lastError,
        lastRun:     lastRun?.value || null,
        lastStatus:  lastStatus?.value || null,
        nextBackup:  next ? next.toISOString() : null,
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
      const { enabled, path: bPath, schedule, keep, libraryEnabled,
              destination, nasIp, nasShare, nasUser, nasPassword, nasFolder,
              reportEmail } = req.body;
      const entries = [
        ['backup_enabled',          String(enabled)],
        ['backup_path',             bPath       || DEFAULT_BACKUP_PATH],
        ['backup_schedule',         schedule    || DEFAULT_SCHEDULE],
        ['backup_keep',             String(parseInt(keep) || DEFAULT_KEEP)],
        ['backup_library_enabled',  String(libraryEnabled === true || libraryEnabled === 'true')],
        ['backup_destination',      destination || 'local'],
        ['backup_nas_ip',           nasIp       || ''],
        ['backup_nas_share',        nasShare    || ''],
        ['backup_nas_user',         nasUser     || ''],
        ['backup_nas_password',     nasPassword || ''],
        ['backup_nas_folder',       nasFolder   || '/printflow'],
        ['backup_report_email',     String(reportEmail !== false && reportEmail !== 'false')],
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

  // POST /api/backup/test-nas — tester la connexion NAS
  router.post('/test-nas', async (req, res) => {
    const { nasIp, nasShare, nasUser, nasPassword, nasFolder } = req.body;
    if (!nasIp || !nasShare)
      return res.status(400).json({ ok: false, message: 'IP et partage requis' });
    const mountPoint = '/tmp/printflow_nas_test_' + Date.now();
    try {
      await mountNas({ nasIp, nasShare, nasUser, nasPassword }, mountPoint);
      // Test écriture
      const folder = path.join(mountPoint, (nasFolder||'printflow').replace(/^\//, ''));
      fs.mkdirSync(folder, { recursive: true });
      const testFile = path.join(folder, '.printflow_test');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      unmountNas(mountPoint);
      res.json({ ok: true, message: 'Connexion NAS réussie — accès en lecture/écriture confirmé' });
    } catch(e) {
      unmountNas(mountPoint);
      res.json({ ok: false, message: e.message });
    }
  });

  // GET /api/backup/export-full — export complet BDD + bibliothèque + config en .tar.gz
  router.get('/export-full', async (req, res) => {
    const { exec } = require('child_process');
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
      configObj._export_version = '1.9.0';
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

  // POST /api/backup/restore — restaurer depuis un fichier uploadé
  // POST /api/backup/restore — restaurer BDD depuis .sql ou export complet .tar.gz
  router.post('/restore', restoreUpload.single('backup'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier recu' });
    const filename = req.file.originalname;
    const buffer   = req.file.buffer;
    // Lire config DB depuis .env
    const cfg = { user: 'printflow', password: '', database: 'printflow' };
    try {
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      envContent.split('\n').forEach(function(line) {
        const eq = line.indexOf('=');
        if (eq < 0) return;
        const k = line.substring(0, eq).trim();
        const v = line.substring(eq + 1).trim();
        if (k === 'DB_USER')     cfg.user     = v;
        if (k === 'DB_PASSWORD') cfg.password = v;
        if (k === 'DB_NAME')     cfg.database = v;
      });
    } catch(_) {}

    const runSQL = function(sqlPath) {
      return new Promise(function(resolve, reject) {
        exec('mysql -u' + cfg.user + ' -p' + cfg.password + ' ' + cfg.database + ' < "' + sqlPath + '"',
          function(err) { if (err) reject(new Error(err.message)); else resolve(); });
      });
    };

    try {
      // Cas 1 : fichier .sql
      if (filename.endsWith('.sql')) {
        const tmpSql = path.join(os.tmpdir(), 'pf_restore_' + Date.now() + '.sql');
        fs.writeFileSync(tmpSql, buffer);
        try { await runSQL(tmpSql); } finally { try { fs.unlinkSync(tmpSql); } catch(_) {} }
        return res.json({ ok: true, type: 'sql', message: 'Base de donnees restauree' });
      }
      // Cas 2 : archive .tar.gz
      if (filename.endsWith('.tar.gz')) {
        const tmpDir = path.join(os.tmpdir(), 'pf_restore_' + Date.now());
        const tmpTar = tmpDir + '.tar.gz';
        fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(tmpTar, buffer);
        await new Promise(function(resolve, reject) {
          exec('tar -xzf "' + tmpTar + '" -C "' + tmpDir + '"',
            function(err) { if (err) reject(new Error(err.message)); else resolve(); });
        });
        // Chercher le fichier SQL récursivement
        var walk = function(dir) {
          var out = [];
          fs.readdirSync(dir).forEach(function(f) {
            var p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) out = out.concat(walk(p));
            else out.push(p);
          });
          return out;
        };
        var files   = walk(tmpDir);
        var sqlFile = files.find(function(f) { return f.endsWith('.sql'); });
        if (!sqlFile) {
          fs.rmSync(tmpDir, { recursive: true }); fs.unlinkSync(tmpTar);
          return res.status(400).json({ error: 'Pas de fichier SQL dans archive' });
        }
        try { await runSQL(sqlFile); } catch(e) {
          fs.rmSync(tmpDir, { recursive: true }); fs.unlinkSync(tmpTar); throw e;
        }
        // Restaurer bibliotheque si presente
        var libraryRestored = false;
        var libTar = files.find(function(f) { return f.includes('library') && f.endsWith('.tar.gz'); });
        if (libTar) {
          try {
            var settings = await getBackupSettings();
            var libPath  = settings.libraryPath || DEFAULT_LIBRARY_PATH;
            await new Promise(function(resolve) {
              exec('tar -xzf "' + libTar + '" -C "' + path.dirname(libPath) + '"', function() { resolve(); });
            });
            libraryRestored = true;
          } catch(_) {}
        }
        fs.rmSync(tmpDir, { recursive: true }); fs.unlinkSync(tmpTar);
        return res.json({ ok: true, type: 'full', libraryRestored: libraryRestored,
          message: 'Restauration complete' + (libraryRestored ? ' (BDD + bibliotheque)' : ' (BDD)') });
      }
      return res.status(400).json({ error: 'Format non supporte (.sql ou .tar.gz uniquement)' });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });


  return router;
}

module.exports = { startBackup, setupRoutes, restartScheduler };
