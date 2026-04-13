// settings.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT key_name, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key_name] = r.value; });
    // Informations de version (non stockées en base)
    settings._version    = '1.9.0';
    settings._build_date = '13/04/2026';
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [k, v] of entries) {
      await db.query(
        'INSERT INTO settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        [k, v, v]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
      ['history_log',       'SELECT COUNT(*) AS n FROM history_log'],
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
      'maintenance', 'consumables', 'projects', 'history_log',
      'filaments', 'printers', 'library_objects', 'library_files',
    ];
    const invalid = tables.filter(function(t) { return !ALLOWED.includes(t); });
    if (invalid.length) return res.status(400).json({ error: 'Table non autorisée : ' + invalid.join(', ') });

    const deleted = {};
    const fs   = require('fs');
    const path = require('path');

    // Ordre respectant les FK — d'abord les enfants
    const ORDER = [
      'print_filaments', 'filament_weighings', 'maintenance',
      'consumables', 'history_log',
      'prints',       // après print_filaments
      'projects',
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

module.exports = router;
