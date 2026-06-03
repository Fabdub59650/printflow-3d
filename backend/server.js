require('dotenv').config();
require('./logger'); // Charger en premier pour capturer toutes les erreurs
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const proxy   = require('express-http-proxy');

const app        = express();
const PORT       = process.env.PORT || 3000;
const nfcService    = require('./nfc');
const backupService = require('./backup');
const { authMiddleware, setupAuthRoutes } = require('./auth');
const historyService = require('./history');

app.use(cors({
  origin: function(origin, cb) {
    // Autoriser localhost (kiosque), les requêtes sans origine (curl, mobile) et le LAN
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return cb(null, true);
    }
    cb(null, true); // Autoriser tout (réseau local privé)
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static frontend (avant auth — les assets ne nécessitent pas d'auth)
app.use(express.static(path.join(__dirname, '../frontend')));

// Favicon SVG
// Mode kiosque — écran tactile dédié
app.get('/kiosk', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/kiosk.html'));
});

app.get('/favicon.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, '../frontend/favicon.svg'));
});

// Routes documentation API
app.get('/api-docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/api-docs.html'));
});
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  res.sendFile(path.join(__dirname, '../frontend/openapi.yaml'));
});

// Auth routes (avant le middleware — sinon /api/auth/login serait bloqué)
const authRouter = require('express').Router();
setupAuthRoutes(authRouter);
app.use('/api/auth', authRouter);

// Auth middleware — s'applique aux routes /api/* sauf /api/auth et /api/nfc/events (SSE)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/nfc/events')) return next(); // SSE — pas d'auth
  // Localhost toujours autorisé (kiosque tactile sur le Pi)
  const ip = req.ip || req.connection.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
  authMiddleware(req, res, next);
});

// API routes
app.use('/api/printers',    require('./routes/printers'));
app.use('/api/filaments',   require('./routes/filaments'));
app.use('/api/prints',      require('./routes/prints'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/stats',       require('./routes/stats'));
app.use('/api/settings',    require('./routes/settings'));
app.use('/api/spoolman',    require('./routes/spoolman'));
app.use('/api/projects',    require('./routes/projects'));
app.use('/api/weighings',   require('./routes/weighings'));
app.use('/api/library',     require('./routes/library'));
app.use('/api/library',     require('./routes/library-export'));

// Consommables imprimantes
app.use('/api/consumables', require('./routes/consumables'));

// Recherche globale
app.use('/api/search', require('./routes/search'));

// Export CSV
app.use('/api/export', require('./routes/export'));

// Alertes bobines
app.use('/api/alerts', require('./routes/alerts'));

// Moonraker — suivi temps réel imprimantes Klipper
app.use('/api/moonraker', require('./routes/moonraker'));

// Tapo P100 — prises connectées
app.use('/api/tapo',     require('./routes/tapo'));

// Devis client
app.use('/api/quotes',    require('./routes/quotes'));
app.use('/api/schedule',      require('./routes/schedule'));
app.use('/api/spool-weights', require('./routes/spool-weights'));
app.use('/api/updater',      require('./routes/updater'));
app.use('/api/excel',        require('./routes/excel-export'));
app.use('/api/logs',             require('./routes/logs'));
app.use('/api/print-templates', require('./routes/print-templates'));
app.use('/api/pixelit',         require('./routes/pixelit'));
// Rapport hebdomadaire
app.use('/api/report', require('./routes/report'));

// TigerTag Scale webhook
const tigertagRouter = require('express').Router();
tigertagRouter.use(require('./routes/tigertag'));
app.use('/api/tigertag', tigertagRouter);

// Historique
const historyRouter = require('express').Router();
historyService.setupRoutes(historyRouter);
app.use('/api/history', historyRouter);

// NFC
const nfcRouter = require('express').Router();
nfcService.setupRoutes(nfcRouter);
app.use('/api/nfc', nfcRouter);

// Backup
const backupRouter = require('express').Router();
backupService.setupRoutes(backupRouter);
app.use('/api/backup', backupRouter);

// Telegram
app.use('/api/telegram', require('./routes/telegram'));

// Printer interface proxy
app.use('/printer-proxy/:printerId', async (req, res, next) => {
  const db = require('./db');
  try {
    const [rows] = await db.query('SELECT interface_url FROM printers WHERE id = ?', [req.params.printerId]);
    if (!rows.length || !rows[0].interface_url)
      return res.status(404).json({ error: 'Imprimante introuvable ou URL non définie' });
    const targetUrl = rows[0].interface_url.replace(/\/$/, '');
    const proxyFn   = proxy(targetUrl, {
      proxyReqPathResolver: req => req.url || '/',
      userResHeaderDecorator: (headers) => {
        headers['x-frame-options']         = 'ALLOWALL';
        headers['content-security-policy'] = '';
        return headers;
      }
    });
    return proxyFn(req, res, next);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`PrintFlow backend running on port ${PORT}`);
  // Persister la version en base pour le système de mise à jour automatique
  const db = require('./db');
  const CURRENT_VERSION = '2.9.8';
  db.query(
    "INSERT INTO settings (key_name,value) VALUES ('_version',?) ON DUPLICATE KEY UPDATE value=?",
    [CURRENT_VERSION, CURRENT_VERSION]
  ).catch(e => console.warn('[Version] Impossible de persister la version:', e.message));
  setTimeout(() => {
    try { nfcService.startNFC(); }
    catch(e) { console.warn('[NFC] Non disponible au démarrage:', e.message); }
  }, 3000);
  backupService.startBackup().catch(e => console.warn('[Backup] Erreur démarrage:', e.message));
  // Démarrer la rotation PixelIt
  setTimeout(async () => {
    try {
      const { startRotation } = require('./pixelit');
      await startRotation();
      console.log('[PixelIt] Rotation démarrée');
    } catch(e) { console.warn('[PixelIt] Non disponible:', e.message); }
  }, 5000);
});

// ── Démarrer le scheduler du rapport hebdomadaire ─────────────────────────
try {
  const { startScheduler } = require('./scheduler');
  startScheduler().catch(function(e) { console.warn('[Scheduler]', e.message); });
} catch(e) { console.warn('[Scheduler] Non disponible :', e.message); }

// ── Polling Telegram — surveillance Moonraker + stock ─────────────────────
(function startTelegramPolling() {
  const telegram = require('./telegram');
  const db       = require('./db');

  // Vérification stock toutes les heures
  setInterval(async function() {
    await telegram.checkStockNotifications().catch(function(){});
  }, 60 * 60 * 1000);

  // Surveillance Moonraker toutes les 30 secondes
  setInterval(async function() {
    try {
      const [printers] = await db.query(
        "SELECT id, name, ip_address, interface_type FROM printers WHERE status != 'offline'"
      );
      await telegram.checkMoonrakerNotifications(printers);
    } catch(_) {}
  }, 30 * 1000);

  // Vérification stock au démarrage (après 30s)
  setTimeout(async function() {
    await telegram.checkStockNotifications().catch(function(){});
  }, 30 * 1000);

  console.log('[Telegram] Polling démarré (Moonraker 30s, stock 1h)');
})();
