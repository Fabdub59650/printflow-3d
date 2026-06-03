/**
 * routes/pixelit.js — Routes API PixelIt pour PrintFlow-3D v2.9.5
 */

const router   = require('express').Router();
const db       = require('../db');
const pixelit  = require('../pixelit');

// GET /api/pixelit/config — lire la configuration
router.get('/config', async (req, res) => {
  try {
    const cfg = await pixelit.getConfig();
    res.json(cfg);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pixelit/config — sauvegarder la configuration
router.post('/config', async (req, res) => {
  try {
    const allowed = [
      'enabled', 'ip', 'brightness',
      'rotation_enabled', 'rotation_order',
      'screen_clock', 'screen_stats', 'screen_weather',
      'duration_clock', 'duration_stats', 'duration_weather',
      'notif_done', 'notif_failed', 'notif_progress', 'notif_stock',
      'duration_notif_done', 'duration_notif_failed',
      'clock_color', 'weather_lat', 'weather_lon', 'weather_city',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await db.query(
          `INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value=?`,
          [`pixelit_${key}`, req.body[key], req.body[key]]
        );
      }
    }

    // Redémarrer la rotation avec la nouvelle config
    await pixelit.restartRotation();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pixelit/test — envoyer un écran de test
router.post('/test', async (req, res) => {
  try {
    const cfg = await pixelit.getConfig();
    if (!cfg.ip) return res.status(400).json({ error: 'IP non configurée' });

    const payload = {
      switchAnimation: { aktiv: true, animation: 'fade' },
      text: {
        textString:      'PrintFlow OK!',
        bigFont:         false,
        scrollText:      true,
        scrollTextDelay: 60,
        position:        { x: 0, y: 1 },
        hexColor:        '#00FF7F',
      },
    };
    const ok = await pixelit.sendScreen(cfg.ip, payload);
    if (ok) res.json({ ok: true });
    else res.status(502).json({ error: 'PixelIt ne répond pas' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pixelit/screen — envoyer un écran personnalisé
router.post('/screen', async (req, res) => {
  try {
    const cfg = await pixelit.getConfig();
    if (!cfg.ip) return res.status(400).json({ error: 'IP non configurée' });
    const ok = await pixelit.sendScreen(cfg.ip, req.body);
    res.json({ ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pixelit/brightness — régler la luminosité
router.post('/brightness', async (req, res) => {
  try {
    const cfg = await pixelit.getConfig();
    if (!cfg.ip) return res.status(400).json({ error: 'IP non configurée' });
    const brightness = Math.min(255, Math.max(0, Math.round((parseInt(req.body.value)||50) * 2.55)));
    const ok = await pixelit.sendScreen(cfg.ip, { brightness });
    res.json({ ok });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pixelit/restart-rotation
router.post('/restart-rotation', async (req, res) => {
  try {
    await pixelit.restartRotation();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
