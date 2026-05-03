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

// GET /api/report/monthly?month=2026-04 — données pour le rapport mensuel PDF
router.get('/monthly', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split('-').map(Number);
    const dateFrom = month + '-01';
    const dateTo   = new Date(year, mon, 0).toISOString().slice(0, 10); // dernier jour du mois

    // ── Impressions du mois ─────────────────────────────────────────────
    const [prints] = await db.query(`
      SELECT p.*, pr.name AS printer_name,
        f.name AS filament_name, f.color_hex, f.material
      FROM prints p
      LEFT JOIN printers pr ON pr.id = p.printer_id
      LEFT JOIN filaments f  ON f.id  = p.filament_id
      WHERE DATE(p.created_at) BETWEEN ? AND ?
        AND p.status IN ('done','failed','cancelled')
      ORDER BY p.created_at DESC
    `, [dateFrom, dateTo]);

    // Stats impressions
    const total     = prints.length;
    const success   = prints.filter(function(p) { return p.status === 'done'; }).length;
    const failed    = prints.filter(function(p) { return p.status === 'failed'; }).length;
    const cancelled = prints.filter(function(p) { return p.status === 'cancelled'; }).length;
    const hours     = Math.round(prints.reduce(function(s, p) { return s + (parseFloat(p.actual_duration)||0); }, 0) / 60 * 10) / 10;
    const grams     = Math.round(prints.reduce(function(s, p) { return s + (parseFloat(p.filament_used)||0); }, 0));
    const avgNote   = prints.filter(function(p) { return p.rating; }).length
      ? Math.round(prints.filter(function(p) { return p.rating; }).reduce(function(s,p) { return s+p.rating; }, 0) / prints.filter(function(p) { return p.rating; }).length * 10) / 10
      : null;
    const realCost       = Math.round(prints.filter(function(p){ return p.real_cost; }).reduce(function(s,p){ return s+parseFloat(p.real_cost||0); },0)*100)/100;
    const realCostMat    = Math.round(prints.reduce(function(s,p){ return s+parseFloat(p.real_filament_cost||0); },0)*100)/100;
    const realCostElec   = Math.round(prints.reduce(function(s,p){ return s+parseFloat(p.real_electricity_cost||0); },0)*100)/100;
    const avgCostPrint   = success > 0 ? Math.round(realCost / success * 100) / 100 : 0;

    // ── Par imprimante ─────────────────────────────────────────────────
    const byPrinter = {};
    prints.forEach(function(p) {
      const key = p.printer_name || 'Non assignée';
      if (!byPrinter[key]) byPrinter[key] = { name: key, count: 0, hours: 0, success: 0 };
      byPrinter[key].count++;
      byPrinter[key].hours   += parseFloat(p.actual_duration||0) / 60;
      byPrinter[key].success += p.status === 'done' ? 1 : 0;
    });
    const printerStats = Object.values(byPrinter)
      .map(function(p) { p.hours = Math.round(p.hours * 10)/10; return p; })
      .sort(function(a,b) { return b.count - a.count; });

    // ── Par filament/matière ────────────────────────────────────────────
    const byMaterial = {};
    prints.forEach(function(p) {
      const mat = p.material || 'Inconnu';
      if (!byMaterial[mat]) byMaterial[mat] = { material: mat, count: 0, grams: 0 };
      byMaterial[mat].count++;
      byMaterial[mat].grams += parseFloat(p.filament_used||0);
    });
    const materialStats = Object.values(byMaterial)
      .map(function(m) { m.grams = Math.round(m.grams); return m; })
      .sort(function(a,b) { return b.grams - a.grams; });

    // Top filaments (par grammes)
    const byFilament = {};
    prints.forEach(function(p) {
      if (!p.filament_name) return;
      const key = p.filament_name;
      if (!byFilament[key]) byFilament[key] = { name: key, color_hex: p.color_hex, grams: 0 };
      byFilament[key].grams += parseFloat(p.filament_used||0);
    });
    const topFilaments = Object.values(byFilament)
      .map(function(f) { f.grams = Math.round(f.grams); return f; })
      .sort(function(a,b) { return b.grams - a.grams; })
      .slice(0, 5);

    // ── Photos du mois (4★ et 5★) ──────────────────────────────────────
    const gallery = prints.filter(function(p) { return p.photo_path && (p.rating||0) >= 4; });

    // ── Maintenance du mois ────────────────────────────────────────────
    const [maintenance] = await db.query(`
      SELECT m.*, pr.name AS printer_name
      FROM maintenance m
      LEFT JOIN printers pr ON pr.id = m.printer_id
      WHERE m.performed_at BETWEEN ? AND ?
      ORDER BY m.performed_at DESC
    `, [dateFrom, dateTo]);

    // ── Devis du mois (si activé) ──────────────────────────────────────
    const [quotes] = await db.query(`
      SELECT * FROM quotes
      WHERE DATE(created_at) BETWEEN ? AND ?
      ORDER BY created_at DESC
    `, [dateFrom, dateTo]).catch(function() { return [[]]; });

    const quotesAccepted = quotes.filter(function(q) { return q.status === 'accepted'; });
    const caAccepted     = Math.round(quotesAccepted.reduce(function(s,q) { return s + parseFloat(q.total_ht||0); }, 0) * 100) / 100;

    // ── Mois précédent pour comparaison ───────────────────────────────
    const prevMonth = new Date(year, mon - 2, 1);
    const prevFrom  = prevMonth.toISOString().slice(0, 7) + '-01';
    const prevTo    = new Date(year, mon - 1, 0).toISOString().slice(0, 10);
    const [[prevStats]] = await db.query(`
      SELECT COUNT(*) AS total,
        SUM(status='done') AS success,
        ROUND(SUM(COALESCE(actual_duration,0))/60, 1) AS hours,
        ROUND(SUM(COALESCE(filament_used,0))) AS grams
      FROM prints
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND status IN ('done','failed','cancelled')
    `, [prevFrom, prevTo]);

    // ── App name ──────────────────────────────────────────────────────
    const [[appNameRow]] = await db.query("SELECT value FROM settings WHERE key_name='app_name'").catch(function(){ return [[{value:'PrintFlow-3D'}]]; });

    // Taux de réussite 12 derniers mois pour graphique
    const [successHistory] = await db.query(`
      SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,
             COUNT(*) AS total, SUM(status='done') AS success,
             ROUND(SUM(status='done')/COUNT(*)*100,1) AS rate
      FROM prints
      WHERE status IN ('done','failed','cancelled')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month ASC
    `).catch(function(){ return [[]]; });

    // Prédiction stock (filaments critiques)
    const [stockPred] = await db.query(`
      SELECT f.id, f.name, f.brand, f.material, f.color_hex,
             f.weight_remaining, f.weight_total,
             ROUND(f.weight_remaining/NULLIF(f.weight_total,0)*100,0) AS stock_pct,
             ROUND(SUM(p.filament_used)/30*7,1) AS weekly_rate_g
      FROM filaments f
      LEFT JOIN prints p ON p.filament_id=f.id
        AND p.status='done' AND p.created_at >= DATE_SUB(NOW(),INTERVAL 30 DAY)
      WHERE f.archived=0
      GROUP BY f.id
      HAVING stock_pct < 25 OR weekly_rate_g > 0
      ORDER BY stock_pct ASC LIMIT 8
    `).catch(function(){ return [[]]; });

    res.json({
      month, dateFrom, dateTo,
      appName: appNameRow?.value || 'PrintFlow-3D',
      stats: { total, success, failed, cancelled, hours, grams, avgNote,
               rate: total > 0 ? Math.round(success/total*100) : 0,
               realCost, realCostMat, realCostElec, avgCostPrint },
      prevStats,
      printerStats,
      materialStats,
      topFilaments,
      prints,
      gallery,
      maintenance,
      quotes,
      quotesAccepted,
      caAccepted,
      successHistory,
      stockPred,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

