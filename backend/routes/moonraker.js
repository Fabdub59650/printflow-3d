/**
 * moonraker.js — Proxy temps réel vers l'API Moonraker des imprimantes Klipper
 * Port 80 sur les Neptune 4 Pro/Plus (Fluidd + Moonraker)
 */

const router = require('express').Router();
const db     = require('../db');
const http   = require('http');
const https  = require('https');

// Requête HTTP simple vers l'imprimante locale
function fetchJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const mod  = url.startsWith('https') ? https : http;
    const req  = mod.get(url, { timeout: timeoutMs || 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON invalide')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Construire l'URL Moonraker selon le type d'interface
function buildMoonrakerUrl(printer) {
  const base = printer.interface_url
    ? printer.interface_url.replace(/\/$/, '')
    : 'http://' + printer.ip_address;
  return base;
}

// GET /api/moonraker/:id/status — températures + progression temps réel
router.get('/:id/status', async (req, res) => {
  try {
    const [[printer]] = await db.query(
      'SELECT id, name, ip_address, interface_type, interface_url FROM printers WHERE id=?',
      [req.params.id]
    );
    if (!printer) return res.status(404).json({ error: 'Imprimante non trouvée' });

    // Vérifier que c'est bien une interface Moonraker/Klipper
    if (!['moonraker', 'fluidd', 'mainsail', 'klipper'].includes(
        (printer.interface_type || '').toLowerCase())) {
      return res.json({ available: false, reason: 'Interface non Moonraker' });
    }

    const baseUrl = buildMoonrakerUrl(printer);
    const queryUrl = baseUrl + '/printer/objects/query?' +
      'extruder=temperature,target,power&' +
      'heater_bed=temperature,target,power&' +
      'print_stats=state,filename,print_duration,total_duration,filament_used&' +
      'display_status=progress,message&' +
      'virtual_sdcard=progress,file_position,file_size';

    try {
      const data = await fetchJson(queryUrl, 4000);
      const s    = data?.result?.status || {};

      const extruder  = s.extruder    || {};
      const bed       = s.heater_bed  || {};
      const stats     = s.print_stats || {};
      const display   = s.display_status || {};
      const sdcard    = s.virtual_sdcard || {};

      // Calculer le temps restant
      const progress  = display.progress || sdcard.progress || 0;
      const duration  = stats.print_duration || 0;
      let   remaining = null;
      if (progress > 0.01 && duration > 0) {
        remaining = Math.round((duration / progress) * (1 - progress));
      }

      res.json({
        available:   true,
        state:       stats.state || 'standby', // standby, printing, paused, complete, error
        filename:    stats.filename || null,
        progress:    Math.round((progress || 0) * 100),
        duration:    Math.round(duration / 60),     // minutes
        remaining:   remaining !== null ? Math.round(remaining / 60) : null, // minutes
        filament_mm: Math.round(stats.filament_used || 0),
        extruder: {
          temp:   Math.round((extruder.temperature || 0) * 10) / 10,
          target: Math.round((extruder.target      || 0) * 10) / 10,
        },
        bed: {
          temp:   Math.round((bed.temperature || 0) * 10) / 10,
          target: Math.round((bed.target      || 0) * 10) / 10,
        },
        message: display.message || null,
      });
    } catch(e) {
      res.json({ available: false, reason: e.message });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
