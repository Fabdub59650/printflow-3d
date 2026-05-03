/**
 * scheduler.js — Planification du rapport hebdomadaire
 * Utilise node-cron si disponible, sinon fallback sur setInterval
 */

const { sendWeeklyReport, getSmtpConfig } = require('./mailer');
const db = require('./db');

let cronJob = null;

// ── Démarrer le scheduler ─────────────────────────────────────────────────
async function startScheduler() {
  await restartScheduler();
}

// ── (Re)démarrer selon la config actuelle ────────────────────────────────
async function restartScheduler() {
  // Arrêter l'ancien job si existant
  if (cronJob) {
    try { cronJob.stop(); } catch(_) {}
    cronJob = null;
  }

  const cfg = await getSmtpConfig();
  if (!cfg.enabled) {
    console.log('[Scheduler] Rapport hebdomadaire désactivé');
    return;
  }

  // Essayer node-cron
  let nodeCron = null;
  try { nodeCron = require('node-cron'); } catch(_) {}

  const day  = parseInt(cfg.day)  || 1;   // 1=lundi, 7=dimanche
  const hour = parseInt(cfg.hour) || 8;

  if (nodeCron) {
    // Cron: "0 <hour> * * <day>"  (0=dimanche en cron, donc day-1 pour lundi=1)
    const cronDay  = day === 7 ? 0 : day;  // node-cron: 0=dimanche,1=lundi...6=samedi
    const expr     = '0 ' + hour + ' * * ' + cronDay;
    console.log('[Scheduler] Rapport planifié :', expr, '(node-cron)');
    cronJob = nodeCron.schedule(expr, async function() {
      console.log('[Scheduler] Envoi du rapport hebdomadaire…');
      try {
        const result = await sendWeeklyReport();
        console.log('[Scheduler] Rapport envoyé :', result);
      } catch(e) {
        console.error('[Scheduler] Erreur envoi rapport :', e.message);
      }
    }, { timezone: 'Europe/Paris' });
  } else {
    // Fallback : vérifier toutes les heures si c'est le bon moment
    console.log('[Scheduler] node-cron non disponible, fallback toutes les heures');
    cronJob = {
      _interval: setInterval(async function() {
        const now = new Date();
        // 0=dim, 1=lun... en JS — ajuster pour correspondre à notre convention 1=lun
        const jsDay  = now.getDay() === 0 ? 7 : now.getDay();
        if (jsDay === day && now.getHours() === hour && now.getMinutes() < 5) {
          try { await sendWeeklyReport(); } catch(e) { console.error('[Scheduler]', e.message); }
        }
      }, 5 * 60 * 1000), // vérifier toutes les 5 minutes
      stop: function() { clearInterval(this._interval); }
    };
  }
}

module.exports = { startScheduler, restartScheduler };

// ── Résumé quotidien Telegram (20h chaque jour) ───────────────────────────
async function sendDailySummary() {
  try {
    const { notify } = require('./telegram');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0,19).replace('T',' ');

    const [[stats]] = await db.query(`
      SELECT COUNT(*) AS count, SUM(status='done') AS done,
             ROUND(SUM(actual_duration)/60,1) AS hours,
             ROUND(SUM(filament_used),0) AS grams,
             ROUND(SUM(real_cost),2) AS cost
      FROM prints WHERE created_at >= ? AND status IN ('done','failed','cancelled')
    `, [todayStr]);

    const [lowStock] = await db.query(`
      SELECT name FROM filaments
      WHERE archived=0 AND weight_total>0
        AND weight_remaining/weight_total < 0.15
      ORDER BY weight_remaining/weight_total ASC LIMIT 3
    `);

    await notify('daily', {
      count:     parseInt(stats.count || 0),
      done:      parseInt(stats.done  || 0),
      hours:     parseFloat(stats.hours || 0),
      grams:     parseFloat(stats.grams || 0),
      cost:      parseFloat(stats.cost  || 0),
      low_stock: lowStock.map(function(f){ return f.name; }),
    });
  } catch(e) { console.error('[Scheduler] Résumé quotidien :', e.message); }
}

// ── Alerte maintenance préventive (vérification toutes les heures) ────────
async function checkMaintenancePreview() {
  try {
    const { notify } = require('./telegram');
    // Maintenances dont l'échéance est dans moins de 24h et pas encore notifiées
    const [maintenances] = await db.query(`
      SELECT ms.id, ms.name AS task, ms.interval_hours,
             pr.name AS printer,
             ROUND(pr.total_hours - COALESCE(ms.last_reset_hours,0), 1) AS hours_used,
             ROUND(ms.interval_hours - (pr.total_hours - COALESCE(ms.last_reset_hours,0)), 1) AS hours_left
      FROM maintenance_schedules ms
      JOIN printers pr ON pr.id = ms.printer_id
      WHERE ms.active = 1
        AND (pr.total_hours - COALESCE(ms.last_reset_hours,0)) >= (ms.interval_hours - 24)
        AND (pr.total_hours - COALESCE(ms.last_reset_hours,0)) < ms.interval_hours
        AND (ms.last_preview_notif IS NULL OR ms.last_preview_notif < DATE_SUB(NOW(), INTERVAL 20 HOUR))
    `).catch(function(){ return [[]]; });

    for (const m of maintenances) {
      await notify('maint_preview', {
        printer:    m.printer,
        task:       m.task,
        hours_left: m.hours_left > 0 ? m.hours_left : 0,
        interval:   m.interval_hours,
      });
      // Marquer comme notifiée
      await db.query(
        'UPDATE maintenance_schedules SET last_preview_notif=NOW() WHERE id=?', [m.id]
      ).catch(function(){});
    }
  } catch(e) { console.error('[Scheduler] Maintenance preview :', e.message); }
}

// Démarrer les crons Telegram additionnels
try {
  const nodeCron = require('node-cron');
  const db = require('./db');

  // Résumé quotidien à 20h
  nodeCron.schedule('0 20 * * *', sendDailySummary, { timezone: 'Europe/Paris' });
  console.log('[Scheduler] Résumé quotidien Telegram : 20h00');

  // Vérification maintenance préventive toutes les heures
  nodeCron.schedule('0 * * * *', checkMaintenancePreview, { timezone: 'Europe/Paris' });
  console.log('[Scheduler] Vérification maintenance préventive : toutes les heures');
} catch(_) {}
