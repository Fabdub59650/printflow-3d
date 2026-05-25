// settings.js
const router = require('express').Router();
const db = require('../db');
const { logAction } = require('../history');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT key_name, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key_name] = r.value; });
    // Informations de version (non stockées en base)
    settings._version = '2.9.5';
    settings._build_date = '25/05/2026';
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    // Clés sensibles — ne pas loguer la valeur
    const sensitiveKeys = ['smtp_password','auth_password','backup_nas_password','nas_password'];
    // Labels lisibles pour les clés importantes
    const keyLabels = {
      smtp_host:          'Serveur SMTP',
      smtp_user:          'Email SMTP',
      smtp_password:      'Mot de passe SMTP',
      report_email:       'Email rapport',
      auth_enabled:       'Authentification',
      auth_password:      'Mot de passe app',
      backup_enabled:     'Sauvegarde auto',
      backup_destination: 'Destination sauvegarde',
      backup_nas_ip:      'IP NAS',
      show_prices:        'Affichage prix',
      show_locations:     'Affichage emplacements',
      quotes_enabled:     'Module devis',
      gallery_enabled:    'Module galerie',
      projects_enabled:   'Module projets',
      theme:              'Thème couleur',
      color_mode:         'Mode clair/sombre',
      electricity_rate:   'Tarif électricité',
    };
    const changed = [];
    for (const [k, v] of entries) {
      if (k.startsWith('_')) continue;
      if (v === undefined) continue;
      // Récupérer l'ancienne valeur pour détecter les changements
      const [[old]] = await db.query('SELECT value FROM settings WHERE key_name=?', [k]).catch(function(){ return [[null]]; });
      await db.query(
        'INSERT INTO settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        [k, String(v), String(v)]
      );
      // Loguer seulement les clés importantes qui ont changé
      if (keyLabels[k] && old?.value !== String(v)) {
        const label = keyLabels[k];
        const val   = sensitiveKeys.includes(k) ? '(modifié)' : String(v);
        changed.push(label + ' → ' + val);
      }
    }
    if (changed.length > 0) {
      await logAction('settings', 0, 'update', 'Paramètres modifiés : ' + changed.join(', '));
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// GET /api/settings/system-health — santé système Raspberry Pi
router.get('/system-health', async (req, res) => {
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const result = {};

    // ── Température CPU ───────────────────────────────────────────────────
    try {
      const tempRaw = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8').trim();
      result.cpu_temp = Math.round(parseInt(tempRaw) / 100) / 10; // en °C
    } catch(_) {
      try {
        const t = execSync('vcgencmd measure_temp 2>/dev/null', { timeout: 2000 }).toString();
        const m = t.match(/temp=([\d.]+)/);
        result.cpu_temp = m ? parseFloat(m[1]) : null;
      } catch(_) { result.cpu_temp = null; }
    }

    // ── Mémoire RAM ───────────────────────────────────────────────────────
    try {
      const memRaw = fs.readFileSync('/proc/meminfo', 'utf8');
      const total = parseInt(memRaw.match(/MemTotal:\s+(\d+)/)?.[1] || 0) * 1024;
      const avail = parseInt(memRaw.match(/MemAvailable:\s+(\d+)/)?.[1] || 0) * 1024;
      result.mem_total = total;
      result.mem_used  = total - avail;
      result.mem_pct   = total > 0 ? Math.round((total - avail) / total * 100) : 0;
    } catch(_) { result.mem_total = null; result.mem_used = null; result.mem_pct = null; }

    // ── Espace disque ─────────────────────────────────────────────────────
    try {
      const df = execSync('df -B1 / 2>/dev/null', { timeout: 3000 }).toString().split('\n')[1].split(/\s+/);
      result.disk_total = parseInt(df[1]);
      result.disk_used  = parseInt(df[2]);
      result.disk_free  = parseInt(df[3]);
      result.disk_pct   = parseInt(df[4]);
    } catch(_) { result.disk_total = null; result.disk_used = null; result.disk_free = null; result.disk_pct = null; }

    // ── Uptime ────────────────────────────────────────────────────────────
    try {
      const uptimeRaw = fs.readFileSync('/proc/uptime', 'utf8');
      result.uptime_s = Math.floor(parseFloat(uptimeRaw.split(' ')[0]));
    } catch(_) { result.uptime_s = null; }

    // ── Charge CPU ────────────────────────────────────────────────────────
    try {
      const loadRaw = fs.readFileSync('/proc/loadavg', 'utf8');
      result.load_1m  = parseFloat(loadRaw.split(' ')[0]);
      result.load_5m  = parseFloat(loadRaw.split(' ')[1]);
      result.load_15m = parseFloat(loadRaw.split(' ')[2]);
    } catch(_) { result.load_1m = null; }

    // ── Réseau IP ─────────────────────────────────────────────────────────
    try {
      const ip = execSync("hostname -I 2>/dev/null | awk '{print $1}'", { timeout: 2000 }).toString().trim();
      result.ip = ip || null;
    } catch(_) { result.ip = null; }

    // ── Version PrintFlow ─────────────────────────────────────────────────
    const [[vRow]] = await db.query("SELECT value FROM settings WHERE key_name='_version'").catch(function(){ return [[null]]; });
    result.printflow_version = vRow?.value || '—';

    // ── Statut service PrintFlow ──────────────────────────────────────────
    try {
      const status = execSync('systemctl is-active printflow 2>/dev/null', { timeout: 2000 }).toString().trim();
      result.service_status = status;
    } catch(_) { result.service_status = 'unknown'; }

    // ── OS ────────────────────────────────────────────────────────────────
    try {
      const raw = execSync('cat /etc/os-release 2>/dev/null', { timeout: 2000 }).toString();
      const m = raw.match(/PRETTY_NAME="([^"]+)"/);
      result.os = m ? m[1] : null;
    } catch(_) { result.os = null; }

    result.node_version = process.version;
    result.timestamp    = new Date().toISOString();

    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/settings/os-info — version du système d'exploitation
router.get('/os-info', async (req, res) => {
  try {
    const { execSync } = require('child_process');
    let os = '—';
    try {
      // Lire /etc/os-release (standard Linux)
      const raw = execSync('cat /etc/os-release 2>/dev/null', { timeout: 2000 }).toString();
      const prettyName = raw.match(/PRETTY_NAME="([^"]+)"/);
      if (prettyName) os = prettyName[1];
    } catch(_) {
      // Fallback : uname
      try { os = execSync('uname -srm', { timeout: 2000 }).toString().trim(); } catch(_) {}
    }
    // Version Node.js
    const nodeVersion = process.version;
    res.json({ os, node: nodeVersion });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/settings/purge-stats — compte les enregistrements par table
router.get('/purge-stats', async (req, res) => {
  try {
    const counts = {};
    const tables = [
      ['prints',            'SELECT COUNT(*) AS n FROM prints'],
      ['print_filaments',   'SELECT COUNT(*) AS n FROM print_filaments'],
      ['filament_weighings','SELECT COUNT(*) AS n FROM filament_weighings'],
      ['maintenance',       'SELECT COUNT(*) AS n FROM maintenance'],
      ['consumables',       'SELECT COUNT(*) AS n FROM consumables'],
      ['projects',          'SELECT COUNT(*) AS n FROM projects'],
      ['audit_log',         'SELECT COUNT(*) AS n FROM audit_log'],
      ['quotes',            'SELECT COUNT(*) AS n FROM quotes'],
      ['filaments',         'SELECT COUNT(*) AS n FROM filaments'],
      ['printers',          'SELECT COUNT(*) AS n FROM printers'],
      ['library_objects',   'SELECT COUNT(*) AS n FROM library_objects'],
      ['library_files',     'SELECT COUNT(*) AS n FROM library_files'],
    ];
    for (const [name, sql] of tables) {
      try {
        const [[row]] = await db.query(sql);
        counts[name] = row.n;
      } catch(_) { counts[name] = 0; }
    }
    res.json(counts);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/settings/purge — vider les tables sélectionnées
router.post('/purge', async (req, res) => {
  try {
    const { tables, confirm } = req.body;
    if (!confirm) return res.status(400).json({ error: 'Confirmation requise' });
    if (!Array.isArray(tables) || !tables.length)
      return res.status(400).json({ error: 'Aucune table sélectionnée' });

    // Tables autorisées uniquement — pas de paramètres ni de templates
    const ALLOWED = [
      'prints', 'print_filaments', 'filament_weighings',
      'maintenance', 'consumables', 'projects', 'audit_log',
      'filaments', 'printers', 'library_objects', 'library_files',
      'quotes',
    ];
    const invalid = tables.filter(function(t) { return !ALLOWED.includes(t); });
    if (invalid.length) return res.status(400).json({ error: 'Table non autorisée : ' + invalid.join(', ') });

    const deleted = {};
    const fs   = require('fs');
    const path = require('path');

    // Ordre respectant les FK — d'abord les enfants
    const ORDER = [
      'print_filaments', 'filament_weighings', 'maintenance',
      'consumables', 'audit_log',
      'prints',       // après print_filaments
      'projects',
      'quotes',
      'library_files', 'library_objects',
      'filaments', 'printers',
    ];

    for (const table of ORDER) {
      if (!tables.includes(table)) continue;

      // Supprimer les fichiers physiques si bibliothèque
      if (table === 'library_files') {
        try {
          const [[s]] = await db.query("SELECT value FROM settings WHERE key_name='library_path'");
          const libPath = s?.value || '/opt/printflow/library';
          const [files] = await db.query('SELECT file_path FROM library_files');
          for (const f of files) {
            try { fs.unlinkSync(path.join(libPath, f.file_path)); } catch(_) {}
          }
        } catch(_) {}
      }

      // Supprimer les photos d'impressions
      if (table === 'prints') {
        try {
          const [prints] = await db.query('SELECT photo_path FROM prints WHERE photo_path IS NOT NULL');
          for (const p of prints) {
            try { fs.unlinkSync(p.photo_path); } catch(_) {}
          }
        } catch(_) {}
      }

      // Supprimer les photos d'objets bibliothèque
      if (table === 'library_objects') {
        try {
          const [objs] = await db.query('SELECT photo_path FROM library_objects WHERE photo_path IS NOT NULL');
          for (const o of objs) {
            try { fs.unlinkSync(o.photo_path); } catch(_) {}
          }
        } catch(_) {}
      }

      // Disable FK checks temporairement pour les tables avec dépendances circulaires
      await db.query('SET FOREIGN_KEY_CHECKS=0');
      const [result] = await db.query('DELETE FROM ' + table);
      await db.query('SET FOREIGN_KEY_CHECKS=1');

      // Réinitialiser l'auto-increment
      try { await db.query('ALTER TABLE ' + table + ' AUTO_INCREMENT = 1'); } catch(_) {}

      deleted[table] = result.affectedRows;
    }

    res.json({ ok: true, deleted });
  } catch(e) {
    await db.query('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

// POST /api/settings/purge-by-date-stats — compter les enregistrements avant une date
router.post('/purge-by-date-stats', async (req, res) => {
  try {
    const { before_date, tables } = req.body;
    if (!before_date) return res.status(400).json({ error: 'Date requise' });
    if (!Array.isArray(tables) || !tables.length) return res.json({});

    const DATE_COLS = {
      prints:      'created_at',
      maintenance: 'performed_at',
      quotes:      'created_at',
      audit_log:   'created_at',
    };

    const counts = {};
    for (const table of tables) {
      const col = DATE_COLS[table];
      if (!col) { counts[table] = 0; continue; }
      try {
        const [[row]] = await db.query(
          'SELECT COUNT(*) AS n FROM ' + table + ' WHERE ' + col + ' < ?',
          [before_date]
        );
        counts[table] = row.n;
      } catch(_) { counts[table] = 0; }
    }
    res.json(counts);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/settings/purge-by-date — supprimer les données antérieures à une date
router.post('/purge-by-date', async (req, res) => {
  try {
    const { before_date, tables, confirm } = req.body;
    if (!confirm)      return res.status(400).json({ error: 'Confirmation requise' });
    if (!before_date)  return res.status(400).json({ error: 'Date requise' });
    if (!Array.isArray(tables) || !tables.length)
      return res.status(400).json({ error: 'Aucune table sélectionnée' });

    const ALLOWED_DATE = ['prints', 'maintenance', 'quotes', 'audit_log'];
    const invalid = tables.filter(function(t) { return !ALLOWED_DATE.includes(t); });
    if (invalid.length) return res.status(400).json({ error: 'Table non autorisée : ' + invalid.join(', ') });

    const DATE_COLS = {
      prints:      'created_at',
      maintenance: 'performed_at',
      quotes:      'created_at',
      audit_log:   'created_at',
    };

    const deleted = {};
    const fs   = require('fs');

    for (const table of tables) {
      const col = DATE_COLS[table];
      if (!col) continue;

      // Supprimer les photos des impressions concernées
      if (table === 'prints') {
        try {
          const [prints] = await db.query(
            'SELECT photo_path FROM prints WHERE photo_path IS NOT NULL AND created_at < ?',
            [before_date]
          );
          for (const p of prints) {
            try { fs.unlinkSync(p.photo_path); } catch(_) {}
          }
          // Supprimer aussi les print_filaments associés
          await db.query(
            'DELETE pf FROM print_filaments pf JOIN prints p ON p.id = pf.print_id WHERE p.created_at < ?',
            [before_date]
          );
        } catch(_) {}
      }

      const [result] = await db.query(
        'DELETE FROM ' + table + ' WHERE ' + col + ' < ?',
        [before_date]
      );
      deleted[table] = result.affectedRows;
    }

    res.json({ ok: true, deleted });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
