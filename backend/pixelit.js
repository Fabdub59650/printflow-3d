/**
 * pixelit.js — Intégration PixelIt pour PrintFlow-3D v2.9.5
 * API REST : POST http://[ip]/api/screen
 */

const db = require('./db');

// ── Icônes 8x8 en pixels RGB565 ──────────────────────────────────────────
// Couleurs RGB565 : 0=noir, 63488=rouge, 2016=vert, 31=bleu, 65535=blanc, 65504=jaune, 64512=orange
const ICONS = {
  printer: [
    0,     0,     0,     0,     0,     0,     0,     0,
    0,  2016,  2016,  2016,  2016,  2016,  2016,     0,
    0,  2016, 65535, 65535, 65535, 65535,  2016,     0,
    0,  2016, 65535, 65535, 65535, 65535,  2016,     0,
    0,  2016,  2016,  2016,  2016,  2016,  2016,     0,
    0,  2016, 65535, 65535, 65535, 65535,  2016,     0,
    0,  2016, 65535, 65535, 65535, 65535,  2016,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
  ],
  check: [
    0,     0,     0,     0,     0,     0,     0,     0,
    0,     0,     0,     0,     0,  2016,     0,     0,
    0,     0,     0,     0,  2016,  2016,     0,     0,
    0,  2016,     0,  2016,  2016,     0,     0,     0,
    0,  2016,  2016,  2016,     0,     0,     0,     0,
    0,     0,  2016,     0,     0,     0,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
  ],
  cross: [
    0,     0,     0,     0,     0,     0,     0,     0,
    0, 63488,     0,     0,     0, 63488,     0,     0,
    0,     0, 63488,     0, 63488,     0,     0,     0,
    0,     0,     0, 63488,     0,     0,     0,     0,
    0,     0, 63488,     0, 63488,     0,     0,     0,
    0, 63488,     0,     0,     0, 63488,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
  ],
  spool: [
    0,     0,  2016,  2016,  2016,  2016,     0,     0,
    0,  2016,     0,     0,     0,     0,  2016,     0,
    2016,   0, 65535,     0,     0, 65535,     0,  2016,
    2016,   0,     0, 65535, 65535,     0,     0,  2016,
    2016,   0,     0, 65535, 65535,     0,     0,  2016,
    2016,   0, 65535,     0,     0, 65535,     0,  2016,
    0,  2016,     0,     0,     0,     0,  2016,     0,
    0,     0,  2016,  2016,  2016,  2016,     0,     0,
  ],
  warning: [
    0,     0,     0, 65504, 65504,     0,     0,     0,
    0,     0, 65504, 65504, 65504, 65504,     0,     0,
    0, 65504, 65504,     0,     0, 65504, 65504,     0,
    0, 65504, 65504,     0,     0, 65504, 65504,     0,
    0, 65504, 65504, 65504, 65504, 65504, 65504,     0,
    0,     0, 65504, 65504, 65504, 65504,     0,     0,
    0,     0,     0, 65504, 65504,     0,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
  ],
  stats: [
    0,     0,     0,     0,     0,     0,  2016,     0,
    0,     0,     0,     0,     0,  2016,  2016,     0,
    0,     0,     0,  2016,     0,  2016,  2016,     0,
    0,     0,  2016,  2016,  2016,  2016,  2016,     0,
    0,  2016,  2016,  2016,  2016,  2016,  2016,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
  ],
  cloud: [
    0,     0,  2016,  2016,     0,     0,     0,     0,
    0,  2016,  2016,  2016,  2016,  2016,     0,     0,
    2016, 2016,  2016,  2016,  2016,  2016,  2016,     0,
    0,  2016,  2016,  2016,  2016,  2016,  2016,     0,
    0,     0,  2016,  2016,     0,  2016,     0,     0,
    0,     0,     0,  2016,     0,  2016,     0,     0,
    0,     0,  2016,  2016,  2016,  2016,  2016,     0,
    0,     0,     0,     0,     0,     0,     0,     0,
  ],
};

// ── Envoi vers PixelIt ────────────────────────────────────────────────────
async function sendScreen(ip, payload) {
  if (!ip) return false;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`http://${ip}/api/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch(e) {
    // Log silencieux — ne pas polluer les logs si PixelIt hors ligne
    return false;
  }
}

// ── Charger la config PixelIt depuis la BDD ───────────────────────────────
async function getConfig() {
  try {
    const [rows] = await db.query(
      `SELECT key_name, value FROM settings WHERE key_name LIKE 'pixelit_%'`
    );
    const cfg = {};
    rows.forEach(r => { cfg[r.key_name.replace('pixelit_', '')] = r.value; });
    return cfg;
  } catch(_) { return {}; }
}

// ── Écrans disponibles ────────────────────────────────────────────────────

function screenClock(cfg) {
  return {
    switchAnimation: { aktiv: true, animation: 'fade' },
    clock: {
      show:         true,
      switchAktiv:  true,
      withSeconds:  false,
      switchSec:    6,
      hexColor:     cfg.clock_color || '#1E90FF',
    },
  };
}

function screenText(icon, text, color, scroll) {
  const payload = {
    switchAnimation: { aktiv: true, animation: 'fade' },
    text: {
      textString:      text,
      bigFont:         false,
      scrollText:      scroll !== false,
      scrollTextDelay: 60,
      centerText:      !scroll,
      position:        { x: 9, y: 1 },
      hexColor:        color || '#FFFFFF',
    },
  };
  if (icon && ICONS[icon]) {
    payload.bitmap = {
      data:     ICONS[icon],
      position: { x: 0, y: 0 },
      size:     { width: 8, height: 8 },
    };
  }
  return payload;
}

// ── Notifications événements ──────────────────────────────────────────────

async function notifyDone(printName, duration, material) {
  const cfg = await getConfig();
  if (cfg.enabled !== 'true') return;
  if (cfg.notif_done !== 'true') return;
  const mins = Math.round((parseInt(duration)||0));
  const h = Math.floor(mins/60);
  const m = mins % 60;
  const durStr = h > 0 ? `${h}h${m}m` : `${m}min`;
  const text = `OK: ${printName} ${durStr}`;
  await sendScreen(cfg.ip, screenText('check', text, '#00FF00', true));
}

async function notifyFailed(printName) {
  const cfg = await getConfig();
  if (cfg.enabled !== 'true') return;
  if (cfg.notif_failed !== 'true') return;
  await sendScreen(cfg.ip, screenText('cross', `ERREUR: ${printName}`, '#FF0000', true));
}

async function notifyProgress(printName, progress, remaining) {
  const cfg = await getConfig();
  if (cfg.enabled !== 'true') return;
  if (cfg.notif_progress !== 'true') return;
  const pct  = Math.round(progress || 0);
  const mins = Math.round(remaining || 0);
  const h = Math.floor(mins/60);
  const m = mins % 60;
  const remStr = h > 0 ? `${h}h${m}m` : `${m}m`;
  const text = `${pct}% ${remStr}`;
  const payload = {
    switchAnimation: { aktiv: true, animation: 'fade' },
    bitmap: {
      data:     ICONS.printer,
      position: { x: 0, y: 0 },
      size:     { width: 8, height: 8 },
    },
    text: {
      textString:      text,
      bigFont:         false,
      scrollText:      false,
      centerText:      false,
      position:        { x: 9, y: 1 },
      hexColor:        '#1E90FF',
    },
  };
  await sendScreen(cfg.ip, payload);
}

async function notifyStockAlert(filamentName, pct) {
  const cfg = await getConfig();
  if (cfg.enabled !== 'true') return;
  if (cfg.notif_stock !== 'true') return;
  await sendScreen(cfg.ip, screenText('spool', `Stock: ${filamentName} ${pct}%`, '#FF8C00', true));
}

// ── Rotation des écrans ───────────────────────────────────────────────────
let _rotationTimer = null;
let _rotationIndex = 0;

async function buildRotationScreens(cfg) {
  const screens = [];
  const order = (cfg.rotation_order || 'clock,stats,weather').split(',');

  for (const name of order) {
    const enabled = cfg['screen_' + name] !== 'false';
    if (!enabled) continue;

    if (name === 'clock') {
      screens.push({ name: 'clock', payload: screenClock(cfg), duration: parseInt(cfg.duration_clock)||10 });
    }

    if (name === 'stats') {
      try {
        const [rows] = await db.query(`
          SELECT COUNT(*) as total, SUM(status='done') as success,
                 ROUND(SUM(COALESCE(filament_used,0)),0) as grams
          FROM prints WHERE DATE(created_at) = CURDATE()
        `);
        const r = rows[0];
        const text = `Auj: ${r.success||0}/${r.total||0} impr. ${r.grams||0}g`;
        screens.push({ name: 'stats', payload: screenText('stats', text, '#00FF7F', true), duration: parseInt(cfg.duration_stats)||8 });
      } catch(_) {}
    }

    if (name === 'weather') {
      try {
        const lat  = cfg.weather_lat  || '50.6292';
        const lon  = cfg.weather_lon  || '3.0573';
        const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await resp.json();
        const temp = Math.round(data.current_weather?.temperature || 0);
        const wind = Math.round(data.current_weather?.windspeed   || 0);
        const text = `${temp}°C Vent:${wind}km/h`;
        screens.push({ name: 'weather', payload: screenText('cloud', text, '#00BFFF', true), duration: parseInt(cfg.duration_weather)||8 });
      } catch(_) {}
    }
  }
  return screens;
}

async function startRotation() {
  stopRotation();
  const cfg = await getConfig();
  if (cfg.enabled !== 'true') return; // Pas de log si non configuré
  if (cfg.rotation_enabled !== 'true') return;
  if (!cfg.ip) return;

  async function tick() {
    try {
      const screens = await buildRotationScreens(cfg);
      if (!screens.length) return;
      _rotationIndex = _rotationIndex % screens.length;
      const screen = screens[_rotationIndex];
      await sendScreen(cfg.ip, screen.payload);
      _rotationIndex++;
      _rotationTimer = setTimeout(tick, screen.duration * 1000);
    } catch(e) {
      _rotationTimer = setTimeout(tick, 30000);
    }
  }
  tick();
}

function stopRotation() {
  if (_rotationTimer) { clearTimeout(_rotationTimer); _rotationTimer = null; }
  _rotationIndex = 0;
}

async function restartRotation() {
  stopRotation();
  await startRotation();
}

module.exports = {
  sendScreen, getConfig, screenClock, screenText,
  notifyDone, notifyFailed, notifyProgress, notifyStockAlert,
  startRotation, stopRotation, restartRotation, ICONS,
};
