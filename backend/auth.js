/**
 * auth.js — Middleware d'authentification simple par mot de passe
 * Activé/désactivé depuis les paramètres
 */
const db = require('./db');

let _authEnabled = false;
let _authPassword = '';
let _lastCheck = 0;

// Recharger les settings toutes les 30s
async function refreshAuth() {
  if (Date.now() - _lastCheck < 30000) return;
  _lastCheck = Date.now();
  try {
    const [rows] = await db.query(
      "SELECT key_name, value FROM settings WHERE key_name IN ('auth_enabled','auth_password')"
    );
    rows.forEach(r => {
      if (r.key_name === 'auth_enabled')  _authEnabled  = r.value === 'true';
      if (r.key_name === 'auth_password') _authPassword = r.value;
    });
  } catch(_) {}
}

// Middleware Express
async function authMiddleware(req, res, next) {
  try {
    await refreshAuth();
  } catch(_) { return next(); } // Si DB inaccessible, laisser passer

  if (!_authEnabled || !_authPassword) return next();

  // Vérifier le token de session (cookie, header ou query param)
  const token = req.headers['x-auth-token'] || req.cookies?.auth_token || req.query?.token;
  if (token && token === _authPassword) return next();

  res.status(401).json({ error: 'Non authentifié', auth_required: true });
}

// Route login
function setupAuthRoutes(router) {
  router.post('/login', async (req, res) => {
    await refreshAuth();
    if (!_authEnabled) return res.json({ ok: true, required: false });
    if (!_authPassword) return res.json({ ok: true, required: false });
    if (req.body.password === _authPassword) {
      res.json({ ok: true, token: _authPassword });
    } else {
      res.status(401).json({ error: 'Mot de passe incorrect' });
    }
  });

  router.get('/status', async (req, res) => {
    await refreshAuth();
    res.json({ enabled: _authEnabled, required: _authEnabled && !!_authPassword });
  });
}

module.exports = { authMiddleware, setupAuthRoutes };
