const router = require('express').Router();
const fetch = require('node-fetch');
const db = require('../db');

async function getSpoolmanUrl() {
  const [rows] = await db.query("SELECT value FROM settings WHERE key_name='spoolman_url'");
  return rows.length ? rows[0].value : (process.env.SPOOLMAN_URL || 'http://localhost:7912');
}

// GET /api/spoolman/spools
router.get('/spools', async (req, res) => {
  try {
    const base = await getSpoolmanUrl();
    const r = await fetch(`${base}/api/v1/spool?allow_archived=false`);
    if (!r.ok) return res.status(r.status).json({ error: 'Spoolman inaccessible' });
    res.json(await r.json());
  } catch (e) { res.status(503).json({ error: `Spoolman inaccessible: ${e.message}` }); }
});

// GET /api/spoolman/filaments
router.get('/filaments', async (req, res) => {
  try {
    const base = await getSpoolmanUrl();
    const r = await fetch(`${base}/api/v1/filament`);
    if (!r.ok) return res.status(r.status).json({ error: 'Spoolman inaccessible' });
    res.json(await r.json());
  } catch (e) { res.status(503).json({ error: `Spoolman inaccessible: ${e.message}` }); }
});

// POST /api/spoolman/sync — import Spoolman spools into local filaments table
router.post('/sync', async (req, res) => {
  try {
    const base = await getSpoolmanUrl();
    const r = await fetch(`${base}/api/v1/spool?allow_archived=false`);
    if (!r.ok) return res.status(r.status).json({ error: 'Spoolman inaccessible' });
    const spools = await r.json();

    let imported = 0, updated = 0;
    for (const spool of spools) {
      const fil = spool.filament;
      const name = `${fil.vendor?.name || ''} ${fil.name || fil.material}`.trim();
      const colorHex = fil.color_hex ? `#${fil.color_hex}` : '#cccccc';
      const remaining = spool.remaining_weight ?? (spool.weight - (spool.used_weight || 0));

      const [existing] = await db.query('SELECT id FROM filaments WHERE spoolman_id=?', [spool.id]);
      if (existing.length) {
        await db.query(
          'UPDATE filaments SET weight_remaining=?, name=?, color_hex=? WHERE spoolman_id=?',
          [remaining, name, colorHex, spool.id]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO filaments (name, brand, material, color_name, color_hex, diameter,
             weight_total, weight_remaining, spoolman_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [name, fil.vendor?.name||'', fil.material||'PLA', fil.name||'', colorHex,
           fil.diameter||1.75, spool.weight||1000, remaining, spool.id]
        );
        imported++;
      }
    }
    res.json({ ok: true, imported, updated, total: spools.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/spoolman/use/:spoolmanId — report consumption to Spoolman
router.post('/use/:spoolmanId', async (req, res) => {
  try {
    const { grams } = req.body;
    const base = await getSpoolmanUrl();
    const r = await fetch(`${base}/api/v1/spool/${req.params.spoolmanId}/use`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ use_weight: grams })
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Erreur Spoolman' });
    res.json({ ok: true });
  } catch (e) { res.status(503).json({ error: e.message }); }
});

// GET /api/spoolman/status — check connectivity
router.get('/status', async (req, res) => {
  try {
    // Vérifier si Spoolman est activé
    const [[enabledRow]] = await db.query(
      "SELECT value FROM settings WHERE key_name='spoolman_enabled'"
    );
    if (!enabledRow || enabledRow.value !== 'true') {
      return res.json({ connected: false, enabled: false });
    }
    const base = await getSpoolmanUrl();
    const r = await fetch(`${base}/api/v1/info`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return res.json({ connected: false, enabled: true, url: base });
    const info = await r.json();
    res.json({ connected: true, enabled: true, url: base, version: info.version });
  } catch (e) {
    const base = await getSpoolmanUrl();
    res.json({ connected: false, enabled: true, url: base, error: e.message });
  }
});

module.exports = router;
