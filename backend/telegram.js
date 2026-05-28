/**
 * telegram.js — Notifications Telegram pour PrintFlow-3D
 * Utilise l'API Bot Telegram (requête HTTPS simple, pas de lib externe)
 */

const https = require('https');
const db    = require('./db');

// ── Lecture config ────────────────────────────────────────────────────────

async function getTelegramConfig() {
  try {
    const [rows] = await db.query(
      "SELECT key_name, value FROM settings WHERE key_name LIKE 'telegram_%'"
    );
    const s = {};
    rows.forEach(function(r){ s[r.key_name] = r.value; });
    return {
      enabled:       s.telegram_enabled       === 'true',
      token:         s.telegram_token         || '',
      chat_id:       s.telegram_chat_id       || '',
      notif_done:    s.telegram_notif_done    !== 'false',
      notif_failed:  s.telegram_notif_failed  !== 'false',
      notif_stock:   s.telegram_notif_stock   !== 'false',
      notif_maint:   s.telegram_notif_maint   !== 'false',
      notif_daily:   s.telegram_notif_daily   !== 'false',
    };
  } catch(_) {
    return { enabled: false, token: '', chat_id: '' };
  }
}

// ── Envoi d'un message ────────────────────────────────────────────────────

function sendMessage(token, chatId, text) {
  return new Promise(function(resolve, reject) {
    const body = JSON.stringify({
      chat_id:    chatId,
      text:       text,
      parse_mode: 'HTML',
    });
    const options = {
      hostname: 'api.telegram.org',
      path:     '/bot' + token + '/sendMessage',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(d){ data += d; });
      res.on('end', function() {
        try {
          const json = JSON.parse(data);
          if (json.ok) resolve(json);
          else reject(new Error(json.description || 'Erreur Telegram'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Notification publique ─────────────────────────────────────────────────

function sendPhoto(token, chatId, photoPath, caption) {
  return new Promise(function(resolve, reject) {
    const fs   = require('fs');
    const path = require('path');
    if (!fs.existsSync(photoPath)) return resolve();

    const formBoundary = '----FormBoundary' + Date.now();
    const fileData     = fs.readFileSync(photoPath);
    const fileName     = path.basename(photoPath);
    const mimeType     = fileName.match(/\.png$/i) ? 'image/png' : 'image/jpeg';

    const bodyParts = [];
    bodyParts.push(
      '--' + formBoundary + '\r\n' +
      'Content-Disposition: form-data; name="chat_id"\r\n\r\n' +
      chatId + '\r\n'
    );
    if (caption) {
      bodyParts.push(
        '--' + formBoundary + '\r\n' +
        'Content-Disposition: form-data; name="caption"\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n\r\n' +
        caption + '\r\n'
      );
      bodyParts.push(
        '--' + formBoundary + '\r\n' +
        'Content-Disposition: form-data; name="parse_mode"\r\n\r\n' +
        'HTML\r\n'
      );
    }
    bodyParts.push(
      '--' + formBoundary + '\r\n' +
      'Content-Disposition: form-data; name="photo"; filename="' + fileName + '"\r\n' +
      'Content-Type: ' + mimeType + '\r\n\r\n'
    );

    const header = Buffer.from(bodyParts.join(''));
    const footer = Buffer.from('\r\n--' + formBoundary + '--\r\n');
    const body   = Buffer.concat([header, fileData, footer]);

    const options = {
      hostname: 'api.telegram.org',
      path:     '/bot' + token + '/sendPhoto',
      method:   'POST',
      headers:  {
        'Content-Type':   'multipart/form-data; boundary=' + formBoundary,
        'Content-Length': body.length,
      },
    };
    const https = require('https');
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(d){ data += d; });
      res.on('end', function() {
        try {
          const r = JSON.parse(data);
          if (r.ok) resolve(r);
          else reject(new Error('Telegram sendPhoto: ' + r.description));
        } catch(_) { resolve(); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, function(){ req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function notify(type, data) {
  try {
    const cfg = await getTelegramConfig();
    if (!cfg.enabled || !cfg.token || !cfg.chat_id) return;

    // Vérifier si ce type de notif est activé
    const typeMap = {
      done:          cfg.notif_done,
      failed:        cfg.notif_failed,
      stock:         cfg.notif_stock,
      maint:         cfg.notif_maint,
      daily:         cfg.notif_daily !== false,
      maint_preview: cfg.notif_maint,
    };
    if (!typeMap[type]) return;

    const [[appRow]] = await db.query(
      "SELECT value FROM settings WHERE key_name='app_name'"
    ).catch(function(){ return [[{value:'PrintFlow-3D'}]]; });
    const appName = appRow?.value || 'PrintFlow-3D';

    let text = '';

    if (type === 'done') {
      const dur = data.duration
        ? (Math.floor(data.duration/60) > 0 ? Math.floor(data.duration/60)+'h ' : '') +
          (data.duration%60) + 'min'
        : '';
      text = '<b>' + appName + '</b> — Impression terminee !\n\n' +
        '✅ <b>' + (data.name||'Sans nom') + '</b>\n' +
        (data.printer   ? '🖨 ' + data.printer + '\n' : '') +
        (dur            ? '⏱ Duree : ' + dur + '\n' : '') +
        (data.filament  ? '🧵 ' + data.filament + '\n' : '') +
        (data.grams     ? '⚖ ' + Math.round(data.grams) + 'g consommes\n' : '') +
        (data.real_cost ? '💰 Cout reel : ' + parseFloat(data.real_cost).toFixed(2) + ' EUR\n' : '') +
        (data.rating    ? '⭐ Note : ' + '★'.repeat(data.rating) + '\n' : '');

      // Envoyer photo si disponible
      if (data.photo_path && require('fs').existsSync(data.photo_path)) {
        await sendPhoto(cfg.token, cfg.chat_id, data.photo_path, text);
        return; // Photo envoyée avec caption — pas besoin d'envoyer texte séparément
      }
    }

    else if (type === 'failed') {
      text = '<b>' + appName + '</b> — Impression echouee\n\n' +
        '❌ <b>' + (data.name||'Sans nom') + '</b>\n' +
        (data.printer ? '🖨 ' + data.printer + '\n' : '') +
        (data.reason ? '⚠ ' + data.reason + '\n' : '');
    }

    else if (type === 'stock') {
      text = '<b>' + appName + '</b> — Stock faible !\n\n' +
        '🧵 <b>' + data.name + '</b>\n' +
        '📉 ' + Math.round(data.remaining) + 'g restants (' + data.pct + '%)\n' +
        (data.location ? '📍 ' + data.location : '');
    }

    else if (type === 'maint') {
      text = '<b>' + appName + '</b> — Maintenance a prevoir\n\n' +
        '🔧 <b>' + (data.printer||'Imprimante') + '</b>\n' +
        '📋 ' + (data.type||'').replace(/_/g,' ') + '\n' +
        (data.due ? '📅 Echeance : ' + data.due : '');
    }

    else if (type === 'daily') {
      const d = data;
      text = '<b>' + appName + '</b> — Resume du jour\n\n' +
        '📊 <b>' + new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'2-digit',month:'long'}) + '</b>\n\n' +
        (d.count > 0 ? '🖨 ' + d.count + ' impression' + (d.count>1?'s':'') + ' (' + d.done + ' reussie' + (d.done>1?'s':'') + ')\n' : '🖨 Aucune impression aujourd\'hui\n') +
        (d.hours > 0 ? '⏱ ' + d.hours + 'h de chauffe\n' : '') +
        (d.grams > 0 ? '🧵 ' + Math.round(d.grams) + 'g consommes\n' : '') +
        (d.cost  > 0 ? '💰 Cout reel : ' + parseFloat(d.cost).toFixed(2) + ' EUR\n' : '') +
        (d.low_stock && d.low_stock.length > 0 ? '\n⚠ Stock faible : ' + d.low_stock.join(', ') : '');
    }

    else if (type === 'maint_preview') {
      text = '<b>' + appName + '</b> — Maintenance demain !\n\n' +
        '🔧 <b>' + (data.printer||'Imprimante') + '</b>\n' +
        '📋 ' + (data.task||'').replace(/_/g,' ') + '\n' +
        '📅 Echeance dans moins de 24h\n' +
        (data.hours_left ? '⏱ ' + data.hours_left + 'h restantes sur ' + data.interval + 'h' : '');
    }

    if (!text) return;

    await sendMessage(cfg.token, cfg.chat_id, text);
    console.log('[Telegram] Notification envoyee :', type);
  } catch(e) {
    console.error('[Telegram] Erreur :', e.message);
  }
}

// ── Test de connexion ─────────────────────────────────────────────────────

async function testConnection(token, chatId) {
  const [[appRow]] = await db.query(
    "SELECT value FROM settings WHERE key_name='app_name'"
  ).catch(function(){ return [[{value:'PrintFlow-3D'}]]; });
  const appName = appRow?.value || 'PrintFlow-3D';

  const text = '✅ <b>' + appName + '</b> connecte a Telegram !\n\n' +
    'Les notifications sont configurees correctement.\n' +
    'Vous recevrez des alertes pour :\n' +
    '- Fin d\'impression\n- Echec d\'impression\n' +
    '- Stock faible\n- Maintenance';

  await sendMessage(token, chatId, text);
  return { ok: true, message: 'Message de test envoye avec succes' };
}

// ── Surveillance Moonraker (polling) ──────────────────────────────────────

const _prevMoonrakerState = {}; // { printerId: lastState }

async function checkMoonrakerNotifications(printers) {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.token || !cfg.chat_id) return;
  if (!cfg.notif_done && !cfg.notif_failed) return;

  const https2 = require('https');
  const http2  = require('http');

  for (const printer of printers) {
    if (!['moonraker','fluidd','mainsail','klipper'].includes(printer.interface_type)) continue;
    if (!printer.ip_address) continue;

    try {
      const status = await fetchMoonrakerStatus(printer);
      const prev   = _prevMoonrakerState[printer.id];
      const curr   = status.state;

      if (prev === 'printing' && curr === 'complete') {
        // Récupérer les données complètes depuis la BDD si possible
        let printData = { name: status.filename || 'Impression', printer: printer.name,
          duration: status.duration, filament: null,
          grams: status.filament_mm ? Math.round(status.filament_mm / 1000 * 2.4) : null };
        try {
          const [[dbPrint]] = await db.query(
            'SELECT p.name, p.actual_duration, p.filament_used, p.real_cost, p.photo_path, p.rating, f.name AS filament_name ' +
            'FROM prints p LEFT JOIN filaments f ON f.id=p.filament_id ' +
            'WHERE p.printer_id=? AND p.status="done" ORDER BY p.finished_at DESC LIMIT 1',
            [printer.id]
          );
          if (dbPrint) {
            printData.name      = dbPrint.name || printData.name;
            printData.duration  = dbPrint.actual_duration || printData.duration;
            printData.grams     = dbPrint.filament_used ? parseFloat(dbPrint.filament_used) : printData.grams;
            printData.filament  = dbPrint.filament_name || null;
            printData.real_cost = dbPrint.real_cost || null;
            printData.photo_path = dbPrint.photo_path || null;
            printData.rating    = dbPrint.rating || null;
          }
        } catch(_) {}
        await notify('done', printData);
        // PixelIt notification
        try {
          const pixelit = require('./pixelit');
          await pixelit.notifyDone(
            printData.name || 'Impression',
            printData.actual_duration || 0,
            printData.material || ''
          );
        } catch(_) {}
      } else if (prev === 'printing' && curr === 'error') {
        await notify('failed', {
          name:    status.filename || 'Impression',
          printer: printer.name,
          reason:  'Erreur Klipper',
        });
        // PixelIt notification
        try {
          const pixelit = require('./pixelit');
          await pixelit.notifyFailed(status.filename || 'Impression');
        } catch(_) {}
      }

      _prevMoonrakerState[printer.id] = curr;
    } catch(_) {}
  }
}

function fetchMoonrakerStatus(printer) {
  return new Promise(function(resolve, reject) {
    const url = 'http://' + printer.ip_address + '/printer/objects/query?' +
      'print_stats=state,filename,print_duration,filament_used&display_status=progress';
    const lib = printer.ip_address.startsWith('https') ? require('https') : require('http');
    const req = require('http').get(url, function(res) {
      let data = '';
      res.on('data', function(d){ data += d; });
      res.on('end', function() {
        try {
          const json  = JSON.parse(data);
          const stats = json.result?.status?.print_stats || {};
          resolve({
            state:       stats.state || 'standby',
            filename:    stats.filename || null,
            duration:    Math.round((stats.print_duration||0) / 60),
            filament_mm: stats.filament_used || 0,
          });
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, function(){ req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Vérification stock faible ─────────────────────────────────────────────

const _notifiedStock = new Set(); // éviter les doublons

async function checkStockNotifications() {
  const cfg = await getTelegramConfig();
  if (!cfg.enabled || !cfg.token || !cfg.chat_id || !cfg.notif_stock) return;

  try {
    const [[threshRow]] = await db.query(
      "SELECT value FROM settings WHERE key_name='alert_stock_threshold'"
    ).catch(function(){ return [[{value:'15'}]]; });
    const threshold = parseInt(threshRow?.value || '15');

    const [filaments] = await db.query(
      'SELECT id, name, weight_remaining, weight_total, location FROM filaments WHERE archived=0'
    );

    for (const f of filaments) {
      const pct = f.weight_total > 0
        ? Math.round(f.weight_remaining / f.weight_total * 100)
        : 0;

      if (pct <= threshold && pct > 0 && !_notifiedStock.has(f.id)) {
        await notify('stock', {
          name:      f.name,
          remaining: f.weight_remaining,
          pct:       pct,
          location:  f.location,
        });
        _notifiedStock.add(f.id);
      } else if (pct > threshold) {
        // Réinitialiser si le stock a été rechargé
        _notifiedStock.delete(f.id);
      }
    }
  } catch(e) {
    console.error('[Telegram] Erreur vérif stock :', e.message);
  }
}

module.exports = { notify, testConnection, getTelegramConfig, checkMoonrakerNotifications, checkStockNotifications };
