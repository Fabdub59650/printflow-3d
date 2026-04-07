require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const proxy   = require('express-http-proxy');

const app        = express();
const PORT       = process.env.PORT || 3000;
const nfcService    = require('./nfc');
const backupService = require('./backup');
const { authMiddleware, setupAuthRoutes } = require('./auth');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static frontend (avant auth — les assets ne nécessitent pas d'auth)
app.use(express.static(path.join(__dirname, '../frontend')));

// Auth routes (avant le middleware — sinon /api/auth/login serait bloqué)
const authRouter = require('express').Router();
setupAuthRoutes(authRouter);
app.use('/api/auth', authRouter);

// Auth middleware — s'applique aux routes /api/* sauf /api/auth et /api/nfc/events (SSE)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/nfc/events')) return next(); // SSE — pas d'auth
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

// NFC
const nfcRouter = require('express').Router();
nfcService.setupRoutes(nfcRouter);
app.use('/api/nfc', nfcRouter);

// Backup
const backupRouter = require('express').Router();
backupService.setupRoutes(backupRouter);
app.use('/api/backup', backupRouter);

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
  setTimeout(() => {
    try { nfcService.startNFC(); }
    catch(e) { console.warn('[NFC] Non disponible au démarrage:', e.message); }
  }, 3000);
  backupService.startBackup().catch(e => console.warn('[Backup] Erreur démarrage:', e.message));
});
