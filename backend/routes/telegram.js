/**
 * routes/telegram.js — Routes API pour la configuration Telegram
 */

const router   = require('express').Router();
const db       = require('../db');
const telegram = require('../telegram');

// GET /api/telegram/config
router.get('/config', async (req, res) => {
  try {
    const cfg = await telegram.getTelegramConfig();
    // Masquer le token partiellement
    const token = cfg.token
      ? cfg.token.slice(0, 8) + '...' + cfg.token.slice(-4)
      : '';
    res.json({ ...cfg, token_masked: token, token: cfg.token ? '••••••••' : '' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/telegram/config — sauvegarder la config
router.post('/config', async (req, res) => {
  try {
    const { enabled, token, chat_id,
            notif_done, notif_failed, notif_stock, notif_maint } = req.body;

    const entries = [
      ['telegram_enabled',      String(enabled === true || enabled === 'true')],
      ['telegram_chat_id',      chat_id      || ''],
      ['telegram_notif_done',   String(notif_done   !== false && notif_done   !== 'false')],
      ['telegram_notif_failed', String(notif_failed !== false && notif_failed !== 'false')],
      ['telegram_notif_stock',  String(notif_stock  !== false && notif_stock  !== 'false')],
      ['telegram_notif_maint',  String(notif_maint  === true  || notif_maint  === 'true')],
    ];

    // Ne mettre à jour le token que s'il n'est pas masqué
    if (token && !token.includes('•')) {
      entries.push(['telegram_token', token]);
    }

    for (const [k, v] of entries) {
      await db.query(
        'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        [k, v, v]
      );
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/telegram/test — envoyer un message de test
router.post('/test', async (req, res) => {
  try {
    const { token, chat_id } = req.body;
    if (!token || token.includes('•') || !chat_id)
      return res.status(400).json({ error: 'Token et Chat ID requis' });
    const result = await telegram.testConnection(token, chat_id);
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
