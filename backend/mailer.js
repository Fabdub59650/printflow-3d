/**
 * mailer.js — Envoi d'emails via SMTP (nodemailer)
 * Rapport hebdomadaire PrintFlow
 */

const db        = require('./db');
const { decrypt } = require('./crypto');

// Import nodemailer dynamiquement pour ne pas bloquer si non installé
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch(_) {}

// ── Récupérer la config SMTP depuis les settings ─────────────────────────
async function getSmtpConfig() {
  try {
    const [rows] = await db.query(
      "SELECT key_name, value FROM settings WHERE key_name LIKE 'smtp_%' OR key_name LIKE 'report_%'"
    );
    const s = {};
    rows.forEach(function(r) { s[r.key_name] = r.value; });
    return {
      enabled:     s.report_enabled === 'true',
      email:       s.report_email   || '',
      day:         s.report_day     || '1',      // 1=lundi, 5=vendredi
      hour:        s.report_hour    || '8',
      host:        s.smtp_host      || '',
      port:        parseInt(s.smtp_port || '587'),
      secure:      s.smtp_secure    === 'true',
      user:        s.smtp_user      || '',
      password:    decrypt(s.smtp_password),     // déchiffrement ici
      from:        s.smtp_from      || s.smtp_user || 'printflow@localhost',
    };
  } catch(e) {
    console.error('[Mailer] Erreur chargement config :', e.message);
    return { enabled: false };
  }
}

// ── Créer le transporter nodemailer ──────────────────────────────────────
async function createTransporter(cfg) {
  if (!nodemailer) throw new Error('nodemailer non installé (npm install nodemailer)');
  if (!cfg.host)   throw new Error('SMTP host non configuré');
  if (!cfg.user)   throw new Error('SMTP user non configuré');

  return nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   { user: cfg.user, pass: cfg.password },
    tls:    { rejectUnauthorized: false },
  });
}

// ── Collecter les données du rapport ─────────────────────────────────────
async function collectReportData() {
  const now   = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 19).replace('T', ' ');

  // Activité impressions
  const [[activity]] = await db.query(`
    SELECT
      COUNT(*)                                    AS total,
      SUM(status='done')                          AS success,
      SUM(status='failed')                        AS failed,
      ROUND(SUM(actual_duration)/60,1)            AS hours,
      ROUND(SUM(status='done')/COUNT(*)*100,1)    AS rate
    FROM prints
    WHERE created_at >= ? AND status IN ('done','failed','cancelled')
  `, [sinceStr]);

  // Consommation filaments (union multi-filaments)
  const [consumption] = await db.query(`
    SELECT f.name, f.material, f.color_hex,
           ROUND(SUM(src.used_g),1) AS total_g,
           f.price
    FROM (
      SELECT pf.filament_id, pf.quantity_actual AS used_g
      FROM print_filaments pf
      JOIN prints p ON p.id = pf.print_id
      WHERE p.created_at >= ? AND p.status = 'done'
      UNION ALL
      SELECT p.filament_id, p.filament_used
      FROM prints p
      WHERE p.created_at >= ? AND p.status = 'done'
        AND p.filament_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id = p.id)
    ) src
    JOIN filaments f ON f.id = src.filament_id
    GROUP BY f.id ORDER BY total_g DESC LIMIT 10
  `, [sinceStr, sinceStr]);

  // Coût total estimé
  const [[costRow]] = await db.query(`
    SELECT ROUND(SUM(src.used_g * f.price / 1000),2) AS total_cost
    FROM (
      SELECT pf.filament_id, pf.quantity_actual AS used_g
      FROM print_filaments pf JOIN prints p ON p.id=pf.print_id
      WHERE p.created_at >= ? AND p.status='done'
      UNION ALL
      SELECT p.filament_id, p.filament_used
      FROM prints p
      WHERE p.created_at >= ? AND p.status='done'
        AND p.filament_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id=p.id)
    ) src
    JOIN filaments f ON f.id=src.filament_id
  `, [sinceStr, sinceStr]);

  // Meilleure impression de la semaine
  const [[bestPrint]] = await db.query(`
    SELECT p.name, p.rating, p.layer_height, p.infill_percent, pr.name AS printer_name
    FROM prints p LEFT JOIN printers pr ON pr.id = p.printer_id
    WHERE p.created_at >= ? AND p.rating IS NOT NULL
    ORDER BY p.rating DESC, p.created_at DESC LIMIT 1
  `, [sinceStr]);

  // Alertes stock filament
  const [lowStock] = await db.query(`
    SELECT name, material, color_hex,
           ROUND(weight_remaining/weight_total*100,0) AS pct
    FROM filaments
    WHERE archived=0 AND weight_total > 0
      AND weight_remaining/weight_total < 0.2
    ORDER BY pct ASC LIMIT 5
  `);

  // Alertes consommables
  const [consumables] = await db.query(`SELECT * FROM consumables`);
  const consumableAlerts = [];
  for (const c of consumables) {
    const [[row]] = await db.query(`
      SELECT COALESCE(SUM(p.actual_duration),0)/60 AS hours
      FROM prints p WHERE p.printer_id=? AND p.status='done'
      ${c.reset_at ? 'AND p.finished_at >= ?' : ''}
    `, c.reset_at ? [c.printer_id, c.reset_at] : [c.printer_id]);
    const pct = Math.min(100, Math.round((row.hours / c.interval_hours) * 100));
    if (pct >= 80) {
      const [[pr]] = await db.query('SELECT name FROM printers WHERE id=?', [c.printer_id]);
      consumableAlerts.push({ ...c, hours_used: Math.round(row.hours), pct, printer_name: pr?.name });
    }
  }

  // Nouvelles entrées bibliothèque
  const [[libStats]] = await db.query(`
    SELECT COUNT(*) AS new_objects FROM library_objects WHERE created_at >= ?
  `, [sinceStr]);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().slice(0, 19).replace('T', ' ');
  const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

  // ── Dévis de la semaine ──────────────────────────────────────────────────
  const [[quotesStats]] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(status='accepted') AS accepted,
           SUM(status='sent')     AS sent,
           SUM(status='refused')  AS refused,
           ROUND(SUM(total_ht),2) AS total_ht,
           ROUND(SUM(CASE WHEN status='accepted' THEN total_ht ELSE 0 END),2) AS accepted_ht
    FROM quotes WHERE created_at >= ?
  `, [sinceStr]);

  const [recentQuotes] = await db.query(`
    SELECT q.client_name, q.total_ht, q.status, q.created_at,
           COUNT(qi.id) AS item_count
    FROM quotes q
    LEFT JOIN quote_items qi ON qi.quote_id = q.id
    WHERE q.created_at >= ?
    GROUP BY q.id
    ORDER BY q.created_at DESC LIMIT 5
  `, [sinceStr]);

  // ── Marge réelle des devis acceptés avec impressions liées ───────────────
  const [[marginStats]] = await db.query(`
    SELECT
      COUNT(DISTINCT qi.quote_id)                              AS quotes_with_links,
      ROUND(SUM(qi.qty * qi.unit_price), 2)                   AS total_estimated,
      ROUND(SUM(pr.filament_used * f.price / 1000), 2)        AS total_real_cost
    FROM quote_items qi
    JOIN quotes q    ON q.id  = qi.quote_id
    JOIN prints pr   ON pr.id = qi.print_id
    LEFT JOIN filaments f ON f.id = qi.filament_id
    WHERE q.status = 'accepted' AND qi.print_id IS NOT NULL
  `).catch(function(){ return [[null]]; });

  // ── Activité par imprimante ───────────────────────────────────────────────
  const [printerStats] = await db.query(`
    SELECT pr.name AS printer_name,
           COUNT(*) AS total,
           SUM(p.status='done') AS success,
           ROUND(SUM(p.actual_duration)/60, 1) AS hours,
           ROUND(SUM(p.filament_used), 0) AS filament_g
    FROM prints p
    JOIN printers pr ON pr.id = p.printer_id
    WHERE p.created_at >= ? AND p.status IN ('done','failed','cancelled')
    GROUP BY pr.id
    ORDER BY hours DESC
  `, [sinceStr]);

  // ── Consommation par matière ──────────────────────────────────────────────
  const [materialStats] = await db.query(`
    SELECT f.material,
           ROUND(SUM(src.used_g), 0) AS total_g
    FROM (
      SELECT pf.filament_id, pf.quantity_actual AS used_g
      FROM print_filaments pf JOIN prints p ON p.id = pf.print_id
      WHERE p.created_at >= ? AND p.status = 'done'
      UNION ALL
      SELECT p.filament_id, p.filament_used
      FROM prints p
      WHERE p.created_at >= ? AND p.status = 'done'
        AND p.filament_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id = p.id)
    ) src
    JOIN filaments f ON f.id = src.filament_id
    WHERE f.material IS NOT NULL
    GROUP BY f.material
    ORDER BY total_g DESC
  `, [sinceStr, sinceStr]);

  // ── Maintenance à venir (7 prochains jours) ───────────────────────────────
  const [upcomingMaint] = await db.query(`
    SELECT m.name AS task, pr.name AS printer_name,
           m.next_date, m.interval_type
    FROM maintenance_schedules m
    JOIN printers pr ON pr.id = m.printer_id
    WHERE m.next_date BETWEEN ? AND ?
      AND m.active = 1
    ORDER BY m.next_date ASC LIMIT 5
  `, [nowStr, nextWeekStr]).catch(function(){ return [[]]; });

  // ── Planning de la semaine à venir ───────────────────────────────────────
  const [upcomingPrints] = await db.query(`
    SELECT p.name, p.planned_at, p.estimated_duration,
           pr.name AS printer_name, f.name AS filament_name
    FROM prints p
    LEFT JOIN printers pr ON pr.id = p.printer_id
    LEFT JOIN filaments f  ON f.id  = p.filament_id
    WHERE p.status = 'planned'
      AND p.planned_at >= ? AND p.planned_at <= ?
    ORDER BY p.planned_at ASC LIMIT 10
  `, [nowStr, nextWeekStr]);

  return {
    period: { from: since, to: now },
    activity,
    consumption,
    totalCost:         costRow?.total_cost || 0,
    bestPrint,
    lowStock,
    consumableAlerts,
    newLibraryObjects: libStats?.new_objects || 0,
    quotesStats,
    recentQuotes,
    marginStats,
    printerStats,
    materialStats,
    upcomingMaint,
    upcomingPrints,
  };
}

// ── Template HTML du rapport ──────────────────────────────────────────────
function buildReportHtml(data, appName) {
  const fmt   = function(n) { return n !== null && n !== undefined ? n : '—'; };
  const fmtG  = function(g) { return g ? parseFloat(g).toFixed(0) + 'g' : '—'; };
  const fmtH  = function(h) { return h ? parseFloat(h).toFixed(1) + 'h' : '—'; };
  const stars = function(r) { return r ? '★'.repeat(r) + '☆'.repeat(5-r) : '—'; };
  const dateF = function(d) { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }); };

  const periodStr = dateF(data.period.from) + ' — ' + dateF(data.period.to);
  const rate      = data.activity?.rate || 0;
  const rateColor = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';

  const consumptionRows = (data.consumption || []).map(function(f) {
    const cost = f.price ? ' — ' + (parseFloat(f.total_g) * parseFloat(f.price) / 1000).toFixed(2) + '€' : '';
    return '<tr>' +
      '<td style="padding:6px 12px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + (f.color_hex||'#888') + ';margin-right:6px"></span>' + f.name + '</td>' +
      '<td style="padding:6px 12px;color:#6b7280">' + f.material + '</td>' +
      '<td style="padding:6px 12px;font-weight:500">' + fmtG(f.total_g) + cost + '</td>' +
    '</tr>';
  }).join('');

  // Consommation par matière
  const materialRows = (data.materialStats || []).map(function(m) {
    return '<tr>' +
      '<td style="padding:6px 12px;font-weight:500">' + m.material + '</td>' +
      '<td style="padding:6px 12px;text-align:right">' + fmtG(m.total_g) + '</td>' +
    '</tr>';
  }).join('');

  // Stats par imprimante
  const printerRows = (data.printerStats || []).map(function(p) {
    const rate = p.total > 0 ? Math.round(p.success / p.total * 100) : 0;
    const rCol = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
    return '<tr style="border-top:1px solid #f3f4f6">' +
      '<td style="padding:7px 10px;font-size:13px;font-weight:500">' + p.printer_name + '</td>' +
      '<td style="padding:7px 10px;font-size:13px;text-align:center">' + (p.total||0) + '</td>' +
      '<td style="padding:7px 10px;font-size:13px;text-align:center;color:' + rCol + ';font-weight:600">' + rate + '%</td>' +
      '<td style="padding:7px 10px;font-size:13px;text-align:right">' + fmtH(p.hours) + '</td>' +
      '<td style="padding:7px 10px;font-size:13px;text-align:right;color:#6b7280">' + fmtG(p.filament_g) + '</td>' +
    '</tr>';
  }).join('');

  const lowStockRows = (data.lowStock || []).map(function(f) {
    const col = f.pct < 10 ? '#ef4444' : '#f59e0b';
    return '<li style="margin:4px 0;color:' + col + '"><strong>' + f.name + '</strong> — ' + f.pct + '% restant</li>';
  }).join('');

  const consumableRows = (data.consumableAlerts || []).map(function(c) {
    const col = c.pct >= 100 ? '#ef4444' : '#f59e0b';
    return '<li style="margin:4px 0;color:' + col + '"><strong>' + c.printer_name + ' — ' + c.name + '</strong> — ' + c.hours_used + 'h / ' + c.interval_hours + 'h (' + c.pct + '%)</li>';
  }).join('');

  // Maintenance à venir
  const maintRows = (data.upcomingMaint || []).map(function(m) {
    const d = m.next_date ? new Date(m.next_date).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' }) : '—';
    return '<li style="margin:4px 0;color:#3b82f6"><strong>' + m.printer_name + ' — ' + m.task + '</strong> · ' + d + '</li>';
  }).join('');

  const hasAlerts = (data.lowStock?.length > 0) || (data.consumableAlerts?.length > 0);

  // Marge réelle globale
  const ms          = data.marginStats;
  const totalEst    = parseFloat(ms?.total_estimated || 0);
  const totalReal   = parseFloat(ms?.total_real_cost || 0);
  const totalMargin = Math.round((totalEst - totalReal) * 100) / 100;
  const marginPct   = totalEst > 0 ? Math.round(totalMargin / totalEst * 100) : 0;
  const marginCol   = totalMargin >= 0 ? '#10b981' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport ${appName} — ${periodStr}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

  <!-- En-tête -->
  <tr><td style="background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center">
    <div style="font-size:28px;margin-bottom:6px">🖨</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${appName}</h1>
    <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px">Rapport hebdomadaire · ${periodStr}</p>
  </td></tr>

  <!-- Métriques principales -->
  <tr><td style="background:#fff;padding:24px 32px">
    <h2 style="margin:0 0 16px;font-size:16px;color:#1f2937;font-weight:600">🖨 Activité de la semaine</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="text-align:center;background:#f9fafb;border-radius:10px;padding:16px;width:25%">
        <div style="font-size:28px;font-weight:700;color:#1f2937">${fmt(data.activity?.total) || 0}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Impressions</div>
      </td>
      <td style="width:12px"></td>
      <td style="text-align:center;background:#f9fafb;border-radius:10px;padding:16px;width:25%">
        <div style="font-size:28px;font-weight:700;color:${rateColor}">${fmt(data.activity?.rate) || 0}%</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Taux réussite</div>
      </td>
      <td style="width:12px"></td>
      <td style="text-align:center;background:#f9fafb;border-radius:10px;padding:16px;width:25%">
        <div style="font-size:28px;font-weight:700;color:#1f2937">${fmtH(data.activity?.hours)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Heures totales</div>
      </td>
      <td style="width:12px"></td>
      <td style="text-align:center;background:#f9fafb;border-radius:10px;padding:16px;width:25%">
        <div style="font-size:28px;font-weight:700;color:#3b82f6">${data.totalCost ? parseFloat(data.totalCost).toFixed(2)+'€' : '—'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Coût estimé</div>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Consommation filaments -->
  ${(data.consumption?.length > 0) ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1f2937;font-weight:600">🧵 Consommation filaments</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500">Filament</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500">Matière</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500">Consommé</th>
      </tr></thead>
      <tbody>${consumptionRows}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- Consommation par matière -->
  ${(data.materialStats?.length > 1) ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1f2937;font-weight:600">Consommation par matière</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr style="background:#f9fafb">
        <th style="padding:7px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500">Matière</th>
        <th style="padding:7px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:500">Consommé</th>
      </tr></thead>
      <tbody>${materialRows}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- Activité par imprimante -->
  ${(data.printerStats?.length > 0) ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1f2937;font-weight:600">Activité par imprimante</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr style="background:#f9fafb">
        <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:500">Imprimante</th>
        <th style="padding:7px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:500">Impressions</th>
        <th style="padding:7px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:500">Réussite</th>
        <th style="padding:7px 10px;text-align:right;font-size:11px;color:#6b7280;font-weight:500">Heures</th>
        <th style="padding:7px 10px;text-align:right;font-size:11px;color:#6b7280;font-weight:500">Filament</th>
      </tr></thead>
      <tbody>${printerRows}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- Meilleure impression -->
  ${data.bestPrint ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1f2937;font-weight:600">Meilleure impression de la semaine</h2>
    <div style="background:#fefce8;border:1px solid #fde047;border-radius:10px;padding:16px">
      <div style="font-size:15px;font-weight:600;color:#1f2937">${data.bestPrint.name}</div>
      <div style="font-size:20px;color:#f59e0b;margin:4px 0">${stars(data.bestPrint.rating)}</div>
      <div style="font-size:13px;color:#6b7280">
        ${data.bestPrint.printer_name ? 'Imprimante : ' + data.bestPrint.printer_name : ''}
        ${data.bestPrint.layer_height ? ' · Couche : ' + data.bestPrint.layer_height + 'mm' : ''}
        ${data.bestPrint.infill_percent ? ' · Remplissage : ' + data.bestPrint.infill_percent + '%' : ''}
      </div>
    </div>
  </td></tr>` : ''}

  <!-- Devis -->
  ${(data.quotesStats?.total > 0) ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 16px;font-size:16px;color:#1f2937;font-weight:600">Devis de la semaine</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="text-align:center;background:#f0fdf4;border-radius:10px;padding:14px;width:25%">
        <div style="font-size:24px;font-weight:700;color:#1f2937">${data.quotesStats.total||0}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Créés</div>
      </td>
      <td style="width:10px"></td>
      <td style="text-align:center;background:#f0fdf4;border-radius:10px;padding:14px;width:25%">
        <div style="font-size:24px;font-weight:700;color:#10b981">${data.quotesStats.accepted||0}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Acceptés</div>
      </td>
      <td style="width:10px"></td>
      <td style="text-align:center;background:#f0fdf4;border-radius:10px;padding:14px;width:25%">
        <div style="font-size:24px;font-weight:700;color:#3b82f6">${data.quotesStats.sent||0}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">Envoyés</div>
      </td>
      <td style="width:10px"></td>
      <td style="text-align:center;background:#f0fdf4;border-radius:10px;padding:14px;width:25%">
        <div style="font-size:24px;font-weight:700;color:#10b981">${data.quotesStats.accepted_ht ? parseFloat(data.quotesStats.accepted_ht).toFixed(2)+'€' : '—'}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px">CA accepté</div>
      </td>
    </tr>
    </table>
    ${(ms?.quotes_with_links > 0) ? `
    <div style="margin-top:14px;background:#f0fdf4;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:13px;font-weight:600;color:#1f2937">Marge réelle (devis liés à des impressions)</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">Estimé : ${totalEst.toFixed(2)} € · Coût réel : ${totalReal.toFixed(2)} €</div>
      </div>
      <div style="font-size:20px;font-weight:700;color:${marginCol}">${totalMargin >= 0 ? '+' : ''}${totalMargin.toFixed(2)} € (${marginPct}%)</div>
    </div>` : ''}
    ${data.recentQuotes?.length ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px">
      <thead><tr style="background:#f9fafb">
        <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:500">Client</th>
        <th style="padding:7px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:500">Articles</th>
        <th style="padding:7px 10px;text-align:right;font-size:11px;color:#6b7280;font-weight:500">Total HT</th>
        <th style="padding:7px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:500">Statut</th>
      </tr></thead>
      <tbody>${(data.recentQuotes||[]).map(function(q) {
        const statusColors = { draft:'#6b7280', sent:'#3b82f6', accepted:'#10b981', refused:'#ef4444' };
        const statusLabels = { draft:'Brouillon', sent:'Envoyé', accepted:'Accepté', refused:'Refusé' };
        return '<tr style="border-top:1px solid #f3f4f6">' +
          '<td style="padding:7px 10px;font-size:13px;font-weight:500">' + q.client_name + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:#6b7280;text-align:center">' + (q.item_count||0) + ' article' + (q.item_count>1?'s':'') + '</td>' +
          '<td style="padding:7px 10px;font-size:13px;text-align:right;font-weight:600">' + parseFloat(q.total_ht||0).toFixed(2) + ' €</td>' +
          '<td style="padding:7px 10px;text-align:center"><span style="font-size:11px;color:' + (statusColors[q.status]||'#6b7280') + ';font-weight:500">' + (statusLabels[q.status]||q.status) + '</span></td>' +
        '</tr>';
      }).join('')}</tbody>
    </table>` : ''}
  </td></tr>` : ''}

  <!-- Alertes + Maintenance à venir -->
  ${(hasAlerts || data.upcomingMaint?.length > 0) ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1f2937;font-weight:600">Alertes &amp; Maintenance</h2>
    ${lowStockRows ? '<p style="margin:0 0 6px;font-size:13px;font-weight:500;color:#6b7280">Stock filament faible :</p><ul style="margin:0 0 12px;padding-left:20px">' + lowStockRows + '</ul>' : ''}
    ${consumableRows ? '<p style="margin:0 0 6px;font-size:13px;font-weight:500;color:#6b7280">Consommables à remplacer :</p><ul style="margin:0 0 12px;padding-left:20px">' + consumableRows + '</ul>' : ''}
    ${maintRows ? '<p style="margin:0 0 6px;font-size:13px;font-weight:500;color:#6b7280">Maintenance à venir cette semaine :</p><ul style="margin:0;padding-left:20px">' + maintRows + '</ul>' : ''}
  </td></tr>` : ''}

  <!-- Planning semaine à venir -->
  ${(data.upcomingPrints?.length > 0) ? `
  <tr><td style="background:#fff;padding:0 32px 24px;border-top:1px solid #f3f4f6">
    <h2 style="margin:0 0 12px;font-size:16px;color:#1f2937;font-weight:600">📅 Planning — 7 prochains jours</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr style="background:#f9fafb">
        <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:500">Impression</th>
        <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:500">Date planifiée</th>
        <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:500">Imprimante</th>
        <th style="padding:7px 10px;text-align:right;font-size:11px;color:#6b7280;font-weight:500">Durée est.</th>
      </tr></thead>
      <tbody>${(data.upcomingPrints||[]).map(function(p) {
        const d = p.planned_at ? new Date(p.planned_at).toLocaleString('fr-FR', {
          weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
        }) : '—';
        const dur = p.estimated_duration ? Math.round(p.estimated_duration/60*10)/10 + 'h' : '—';
        return '<tr style="border-top:1px solid #f3f4f6">' +
          '<td style="padding:7px 10px;font-size:13px;font-weight:500">' + p.name + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:#3b82f6">' + d + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;color:#6b7280">' + (p.printer_name||'—') + '</td>' +
          '<td style="padding:7px 10px;font-size:12px;text-align:right">' + dur + '</td>' +
        '</tr>';
      }).join('')}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- Footer -->
  <tr><td style="background:#1f2937;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center">
    <p style="margin:0;color:#9ca3af;font-size:12px">${appName} · Rapport automatique hebdomadaire</p>
    <p style="margin:6px 0 0;color:#6b7280;font-size:11px">Ce rapport a été généré automatiquement. Ne pas répondre à cet email.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

// ── Envoyer le rapport ────────────────────────────────────────────────────
async function sendWeeklyReport(cfg) {
  if (!cfg) cfg = await getSmtpConfig();
  if (!cfg.enabled && !cfg._force) {
    console.log('[Mailer] Rapport désactivé');
    return { ok: false, reason: 'disabled' };
  }

  const [data, appNameRow] = await Promise.all([
    collectReportData(),
    db.query("SELECT value FROM settings WHERE key_name='app_name'").then(([r]) => r[0]?.value || 'PrintFlow'),
  ]);
  const appName = typeof appNameRow === 'string' ? appNameRow : 'PrintFlow';
  const html    = buildReportHtml(data, appName);

  const now     = new Date();
  const subject = '[' + appName + '] Rapport hebdomadaire — ' +
    now.toLocaleDateString('fr-FR', { day:'2-digit', month:'long' });

  const transporter = await createTransporter(cfg);
  const info = await transporter.sendMail({
    from:    '"' + appName + '" <' + cfg.from + '>',
    to:      cfg.email,
    subject: subject,
    html:    html,
  });

  console.log('[Mailer] Rapport envoyé :', info.messageId);
  return { ok: true, messageId: info.messageId };
}

// ── Test de connexion SMTP ────────────────────────────────────────────────
async function testSmtpConnection(cfg) {
  const transporter = await createTransporter(cfg);
  await transporter.verify();
  return { ok: true };
}

module.exports = { sendWeeklyReport, testSmtpConnection, getSmtpConfig, collectReportData };
