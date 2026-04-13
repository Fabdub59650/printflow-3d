/**
 * report.js — Routes API pour la gestion du rapport hebdomadaire
 */

const router  = require('express').Router();
const db      = require('../db');
const { encrypt, mask } = require('../crypto');
const { sendWeeklyReport, testSmtpConnection, getSmtpConfig } = require('../mailer');
const { restartScheduler } = require('../scheduler');

// GET /api/report/config — config actuelle (mot de passe masqué)
router.get('/config', async (req, res) => {
  try {
    const cfg = await getSmtpConfig();
    res.json({
      enabled:      cfg.enabled,
      email:        cfg.email,
      day:          cfg.day,
      hour:         cfg.hour,
      smtp_host:    cfg.host,
      smtp_port:    cfg.port,
      smtp_secure:  cfg.secure,
      smtp_user:    cfg.user,
      smtp_password: cfg.password ? mask(cfg.password) : '',  // toujours masqué
      smtp_from:    cfg.from,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/report/config — sauvegarder la config
router.put('/config', async (req, res) => {
  try {
    const {
      enabled, email, day, hour,
      smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from,
    } = req.body;

    const updates = {
      report_enabled: String(enabled === true || enabled === 'true'),
      report_email:   email   || '',
      report_day:     String(day   || '1'),
      report_hour:    String(hour  || '8'),
      smtp_host:      smtp_host    || '',
      smtp_port:      String(smtp_port || '587'),
      smtp_secure:    String(smtp_secure === true || smtp_secure === 'true'),
      smtp_user:      smtp_user    || '',
      smtp_from:      smtp_from    || smtp_user || '',
    };

    // Ne chiffrer le mot de passe que s'il est fourni et différent de '••••••••'
    if (smtp_password && smtp_password !== '••••••••' && !smtp_password.startsWith('•')) {
      updates.smtp_password = encrypt(smtp_password);
    }

    // Upsert toutes les clés
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        'INSERT INTO settings (key_name, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        [key, value, value]
      );
    }

    // Redémarrer le scheduler avec la nouvelle config
    await restartScheduler();

    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/report/test-smtp — tester la connexion SMTP
router.post('/test-smtp', async (req, res) => {
  try {
    const cfg = await getSmtpConfig();
    if (!cfg.host) return res.status(400).json({ error: 'SMTP non configuré' });
    await testSmtpConnection(cfg);
    res.json({ ok: true, message: 'Connexion SMTP réussie ✓' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/report/send-test — envoyer un rapport de test maintenant
router.post('/send-test', async (req, res) => {
  try {
    const cfg = await getSmtpConfig();
    if (!cfg.host)  return res.status(400).json({ error: 'SMTP non configuré' });
    if (!cfg.email) return res.status(400).json({ error: 'Email destinataire non configuré' });
    cfg._force = true; // forcer même si désactivé
    const result = await sendWeeklyReport(cfg);
    res.json({ ok: true, message: 'Rapport de test envoyé à ' + cfg.email });
  } catch(e) { res.status(500).json({ error: 'Erreur envoi : ' + e.message }); }
});

module.exports = router;
