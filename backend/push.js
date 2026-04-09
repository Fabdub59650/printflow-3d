/**
 * push.js — Service de notifications push (Web Push API)
 * Utilise web-push pour envoyer des notifications aux abonnés
 */
const db = require('./db');

// ── Clés VAPID (générées à l'installation) ───────────────
let _vapidKeys = null;

async function getVapidKeys() {
  if (_vapidKeys) return _vapidKeys;
  try {
    const [rows] = await db.query(
      "SELECT key_name, value FROM settings WHERE key_name IN ('vapid_public','vapid_private')"
    );
    const s = {};
    rows.forEach(r => { s[r.key_name] = r.value; });
    if (s.vapid_public && s.vapid_private) {
      _vapidKeys = { publicKey: s.vapid_public, privateKey: s.vapid_private };
      return _vapidKeys;
    }
  } catch(_) {}
  return null;
}

// ── Envoyer une notification à tous les abonnés ───────────
async function sendPushToAll(title, body, url = '/') {
  let webpush;
  try { webpush = require('web-push'); } catch(_) {
    console.warn('[Push] web-push non installé — npm install web-push');
    return;
  }
  const keys = await getVapidKeys();
  if (!keys) return;

  webpush.setVapidDetails(
    'mailto:admin@printflow.local',
    keys.publicKey,
    keys.privateKey
  );

  const [subs] = await db.query('SELECT * FROM push_subscriptions').catch(() => [[]]);
  const payload = JSON.stringify({ title, body, url, tag: 'printflow-alert' });

  let sent = 0, removed = 0;
  for (const sub of subs) {
    try {
      // Normaliser les clés en base64url (remplacer + par - et / par _)
      const p256dh = sub.p256dh.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const auth   = sub.auth.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh, auth }
      };
      await webpush.sendNotification(subscription, payload);
      sent++;
    } catch(e) {
      if (e.statusCode === 410 || e.statusCode === 404) {
        // Abonnement expiré — supprimer
        await db.query('DELETE FROM push_subscriptions WHERE id=?', [sub.id]).catch(()=>{});
        removed++;
      }
    }
  }
  console.log(`[Push] Envoyé ${sent} notification(s), ${removed} abonnement(s) supprimé(s)`);
}

// ── Vérifier les alertes stock et notifier ────────────────
async function checkStockAlerts() {
  try {
    const [[setting]] = await db.query(
      "SELECT value FROM settings WHERE key_name='stock_alert_enabled'"
    ).catch(() => [[null]]);
    if (!setting || setting.value !== 'true') return;

    const [[threshSetting]] = await db.query(
      "SELECT value FROM settings WHERE key_name='stock_alert_threshold'"
    ).catch(() => [[null]]);
    const threshold = parseInt(threshSetting?.value) || 20;

    const [rows] = await db.query(`
      SELECT name, material, weight_remaining, weight_total,
             ROUND((weight_remaining/weight_total)*100) AS pct
      FROM filaments
      WHERE archived=0 AND weight_total>0
        AND (weight_remaining/weight_total)*100 <= ?
      ORDER BY (weight_remaining/weight_total) ASC LIMIT 5
    `, [threshold]);

    if (!rows.length) return;

    const names = rows.map(f => `${f.name} (${f.pct}%)`).join(', ');
    await sendPushToAll(
      '⚠ Stock filament faible',
      `${rows.length} bobine(s) sous ${threshold}% : ${names}`,
      '/#dashboard'
    );
  } catch(e) { console.error('[Push] Erreur alerte stock:', e.message); }
}

// ── Routes API ────────────────────────────────────────────
function setupRoutes(router) {
  // GET /api/push/vapid-public — clé publique pour le client
  router.get('/vapid-public', async (req, res) => {
    const keys = await getVapidKeys();
    if (!keys) return res.json({ available: false });
    res.json({ available: true, publicKey: keys.publicKey });
  });

  // POST /api/push/subscribe — enregistrer un abonnement
  router.post('/subscribe', async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys) return res.status(400).json({ error: 'Données manquantes' });
      await db.query(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE p256dh=VALUES(p256dh), auth=VALUES(auth)`,
        [endpoint, keys.p256dh, keys.auth]
      );
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/push/unsubscribe — supprimer un abonnement
  router.delete('/unsubscribe', async (req, res) => {
    try {
      await db.query('DELETE FROM push_subscriptions WHERE endpoint=?', [req.body.endpoint]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/push/test — test de notification
  router.post('/test', async (req, res) => {
    try {
      let webpush;
      try { webpush = require('web-push'); }
      catch(_) { return res.status(500).json({ error: 'web-push non installé — relancez npm install' }); }

      const keys = await getVapidKeys();
      if (!keys || !keys.publicKey) return res.status(500).json({ error: 'Clés VAPID manquantes' });

      const [subs] = await db.query('SELECT * FROM push_subscriptions').catch(() => [[]]);
      if (!subs.length) return res.status(400).json({ error: 'Aucun abonnement actif — activez les notifications d\'abord' });

      webpush.setVapidDetails('mailto:admin@printflow.local', keys.publicKey, keys.privateKey);
      const payload = JSON.stringify({ title: 'PrintFlow 3D', body: 'Notifications push actives ✓', url: '/', tag: 'printflow-test' });

      let sent = 0, errors = [];
      for (const sub of subs) {
        try {
          const p256dh = sub.p256dh.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          const auth   = sub.auth.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh, auth } }, payload);
          sent++;
        } catch(e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await db.query('DELETE FROM push_subscriptions WHERE id=?', [sub.id]).catch(()=>{});
          } else {
            errors.push(e.message);
          }
        }
      }
      if (sent === 0) return res.status(500).json({ error: 'Envoi échoué : ' + (errors[0] || 'erreur inconnue') });
      res.json({ ok: true, sent });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { setupRoutes, sendPushToAll, checkStockAlerts };
