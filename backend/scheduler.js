/**
 * scheduler.js — Planification du rapport hebdomadaire
 * Utilise node-cron si disponible, sinon fallback sur setInterval
 */

const { sendWeeklyReport, getSmtpConfig } = require('./mailer');

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
