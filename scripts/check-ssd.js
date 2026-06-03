#!/usr/bin/env node
/**
 * check-ssd.js — Surveillance du SSD /mnt/data
 * Envoie une alerte Telegram si le SSD n'est pas monté
 * ou si l'espace disque est critique.
 *
 * Usage : node /opt/printflow/scripts/check-ssd.js
 * Cron  : toutes les 5 minutes via systemd timer
 */

'use strict';

const fs            = require('fs');
const { execSync }  = require('child_process');
const path          = require('path');

// ── Configuration ─────────────────────────────────────────
const SSD_MOUNT      = '/mnt/data';
const CRITICAL_PATHS = [
  '/mnt/data/library',
  '/mnt/data/prints',
  '/mnt/data/backups',
];
const WARN_PERCENT   = 90;   // Alerte si disque > 90% plein
const FLAG_FILE      = '/tmp/printflow-ssd-alert.flag';

// ── Helpers ───────────────────────────────────────────────
function isMounted(mountPoint) {
  try {
    const mounts = fs.readFileSync('/proc/mounts', 'utf8');
    return mounts.split('\n').some(line => line.includes(` ${mountPoint} `));
  } catch {
    return false;
  }
}

function getDiskUsagePercent(mountPoint) {
  try {
    const out = execSync(`df ${mountPoint} --output=pcent | tail -1`).toString().trim();
    return parseInt(out.replace('%', ''));
  } catch {
    return null;
  }
}

function getDiskAvail(mountPoint) {
  try {
    const out = execSync(`df -h ${mountPoint} --output=avail | tail -1`).toString().trim();
    return out;
  } catch {
    return '?';
  }
}

async function getTelegramConfig() {
  try {
    const { getTelegramConfig } = require('/opt/printflow/backend/telegram');
    return await getTelegramConfig();
  } catch {
    return null;
  }
}

async function sendTelegramAlert(message) {
  const config = await getTelegramConfig();
  if (!config || !config.enabled || !config.token || !config.chat_id) {
    console.log('[SSD] Telegram non configuré, alerte ignorée');
    return;
  }
  const { sendMessage } = require('/opt/printflow/backend/telegram');
  // sendMessage n'est pas exporté, on appelle l'API directement
  const https = require('https');
  const body = JSON.stringify({
    chat_id:    config.chat_id,
    text:       message,
    parse_mode: 'HTML',
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path:     `/bot${config.token}/sendMessage`,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', (e) => { console.error('[SSD] Telegram error:', e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  const alerts = [];

  // 1. Vérifier le montage
  if (!isMounted(SSD_MOUNT)) {
    alerts.push(`🔴 <b>SSD non monté !</b>\n<code>${SSD_MOUNT}</code> est inaccessible.\nLes fichiers STL, photos et backups sont indisponibles.`);
  } else {
    // 2. Vérifier les sous-dossiers critiques
    for (const p of CRITICAL_PATHS) {
      if (!fs.existsSync(p)) {
        alerts.push(`⚠️ <b>Dossier manquant</b>\n<code>${p}</code> n'existe pas sur le SSD.`);
      }
    }

    // 3. Vérifier l'espace disque
    const pct = getDiskUsagePercent(SSD_MOUNT);
    if (pct !== null && pct >= WARN_PERCENT) {
      const avail = getDiskAvail(SSD_MOUNT);
      alerts.push(`⚠️ <b>SSD presque plein</b>\nUtilisation : ${pct}%\nEspace libre : ${avail}`);
    }
  }

  if (alerts.length === 0) {
    // Tout va bien — supprimer le flag d'alerte si présent
    if (fs.existsSync(FLAG_FILE)) {
      fs.unlinkSync(FLAG_FILE);
      // Envoyer une notification de retour à la normale
      await sendTelegramAlert('✅ <b>PrintFlow SSD</b>\nLe disque SSD est de nouveau opérationnel.');
    }
    console.log('[SSD] OK — disque monté et opérationnel');
    return;
  }

  // Des alertes — envoyer seulement si pas déjà alerté
  const alreadyAlerted = fs.existsSync(FLAG_FILE);
  if (!alreadyAlerted) {
    const message = `🖨️ <b>PrintFlow — Alerte SSD</b>\n\n${alerts.join('\n\n')}`;
    console.log('[SSD] ALERTE:', alerts.join(' | '));
    await sendTelegramAlert(message);
    fs.writeFileSync(FLAG_FILE, new Date().toISOString());
  } else {
    console.log('[SSD] Alerte déjà envoyée, pas de doublon');
  }

  process.exit(1);
}

main().catch(e => { console.error('[SSD]', e.message); process.exit(1); });
