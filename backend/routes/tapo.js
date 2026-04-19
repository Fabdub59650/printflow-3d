/**
 * tapo.js — Contrôle prises Tapo P100
 * Flux : cloudLogin -> listDevices -> getTapoDevice(deviceObject) -> turnOn/turnOff
 *
 * Note firmware 1.4.0+ : le protocole KLAP local est restreint aux apps officielles.
 * Le contrôle cloud fonctionne uniquement si les prises sont status=1 (online cloud).
 * Toggle d'activation dans Paramètres -> Intégrations -> Tapo.
 */

const router = require('express').Router();
const db     = require('../db');
const { encrypt, decrypt } = require('../crypto');

let tapoLib = null;
try {
  tapoLib = require('tp-link-tapo-connect');
} catch(_) {
  console.warn('[Tapo] tp-link-tapo-connect non installe');
}

let cloudCache   = null;
let cloudCacheTs = 0;
let devicesCache = {};
const CLOUD_TTL  = 10 * 60 * 1000;

async function getTapoCreds() {
  const [rows] = await db.query(
    "SELECT key_name, value FROM settings WHERE key_name IN ('tapo_email','tapo_password','tapo_enabled')"
  );
  const s = {};
  rows.forEach(r => { s[r.key_name] = r.value; });
  return {
    email:    s.tapo_email    || '',
    password: decrypt(s.tapo_password) || '',
    enabled:  s.tapo_enabled === 'true',
  };
}

async function getCloudAndDevices() {
  if (!tapoLib) throw new Error('tp-link-tapo-connect non installe');
  const now = Date.now();
  if (cloudCache && (now - cloudCacheTs) < CLOUD_TTL && Object.keys(devicesCache).length > 0)
    return { cloud: cloudCache, devices: devicesCache };
  const creds = await getTapoCreds();
  if (!creds.email || !creds.password)
    throw new Error('Identifiants Tapo non configures (Parametres -> Integrations)');
  cloudCache   = await tapoLib.cloudLogin(creds.email, creds.password);
  cloudCacheTs = now;
  const list   = await cloudCache.listDevices();
  devicesCache = {};
  list.forEach(d => { devicesCache[d.deviceMac] = d; });
  return { cloud: cloudCache, devices: devicesCache };
}

function invalidateCloud() { cloudCache = null; cloudCacheTs = 0; devicesCache = {}; }

// ── PUT credentials ───────────────────────────────────────────────────────
router.put('/tapo-credentials', async (req, res) => {
  try {
    const { email, password, enabled } = req.body;
    if (email !== undefined) {
      await db.query(
        'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        ['tapo_email', email, email]
      );
    }
    if (password && !password.startsWith('\u2022')) {
      const enc = encrypt(password);
      await db.query(
        'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        ['tapo_password', enc, enc]
      );
    }
    if (enabled !== undefined) {
      await db.query(
        'INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        ['tapo_enabled', String(enabled), String(enabled)]
      );
    }
    invalidateCloud();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET etat de la prise ──────────────────────────────────────────────────
router.get('/:id/tapo', async (req, res) => {
  try {
    const creds = await getTapoCreds();
    const [[printer]] = await db.query(
      'SELECT id, name, tapo_ip, tapo_mac, tapo_state FROM printers WHERE id=?',
      [req.params.id]
    );
    if (!printer)          return res.status(404).json({ error: 'Imprimante non trouvee' });
    if (!printer.tapo_ip)  return res.json({ configured: false });
    if (!printer.tapo_mac) return res.json({ configured: true, available: false,
      error: 'Prise non associee' });
    res.json({
      configured: true,
      available:  true,
      enabled:    creds.enabled,
      on:         printer.tapo_state === 1,
      ip:         printer.tapo_ip,
      mac:        printer.tapo_mac,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST allumer/eteindre ─────────────────────────────────────────────────
router.post('/:id/tapo', async (req, res) => {
  try {
    const creds = await getTapoCreds();
    if (!creds.enabled) {
      return res.status(503).json({
        error: 'Fonctionnalite Tapo desactivee',
        detail: 'Activez le controle des prises dans Parametres -> Integrations -> Tapo.'
      });
    }
    const { action } = req.body;
    if (!['on','off','toggle'].includes(action))
      return res.status(400).json({ error: 'action doit etre on, off ou toggle' });
    const [[printer]] = await db.query(
      'SELECT id, name, tapo_ip, tapo_mac, tapo_state FROM printers WHERE id=?',
      [req.params.id]
    );
    if (!printer)          return res.status(404).json({ error: 'Imprimante non trouvee' });
    if (!printer.tapo_ip)  return res.status(400).json({ error: 'Aucune prise configuree' });
    if (!printer.tapo_mac) return res.status(400).json({ error: 'Prise non associee' });
    if (!tapoLib)          return res.status(503).json({ error: 'Module non installe' });
    try {
      const { cloud, devices } = await getCloudAndDevices();
      const deviceObj = devices[printer.tapo_mac];
      if (!deviceObj) throw new Error('Prise introuvable dans le compte Tapo (MAC: ' + printer.tapo_mac + ')');
      const device = await cloud.getTapoDevice(deviceObj);
      const currentOn   = printer.tapo_state === 1;
      const targetState = action === 'toggle' ? !currentOn : action === 'on';
      if (targetState) { await device.turnOn(); } else { await device.turnOff(); }
      await db.query('UPDATE printers SET tapo_state=? WHERE id=?', [targetState ? 1 : 0, req.params.id]);
      res.json({ ok: true, on: targetState, printer: printer.name });
    } catch(e) {
      if (e.message.includes('401') || e.message.includes('login')) invalidateCloud();
      res.status(500).json({ error: 'Erreur prise : ' + e.message });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST test connexion ───────────────────────────────────────────────────
router.post('/:id/tapo/test', async (req, res) => {
  try {
    const ip = req.body.ip;
    if (!ip) return res.status(400).json({ error: 'IP requise' });
    if (!tapoLib) return res.status(503).json({ error: 'Module non installe' });
    const creds = await getTapoCreds();
    if (!creds.email || !creds.password) return res.status(400).json({
      error: 'Identifiants Tapo non configures. Parametres -> Integrations -> Tapo.'
    });
    invalidateCloud();
    const { devices } = await getCloudAndDevices();
    const tapoPluqs = Object.values(devices).filter(d => d.deviceType === 'SMART.TAPOPLUG');
    if (tapoPluqs.length === 0)
      return res.status(404).json({ error: 'Aucune prise Tapo trouvee sur ce compte' });
    res.json({
      ok: true, needSelection: true,
      devices: tapoPluqs.map(d => ({ alias: d.alias, mac: d.deviceMac, model: d.deviceModel, status: d.status }))
    });
  } catch(e) { res.status(500).json({ error: 'Erreur : ' + e.message }); }
});

// ── POST assign ───────────────────────────────────────────────────────────
router.post('/:id/tapo/assign', async (req, res) => {
  try {
    const { mac, alias } = req.body;
    if (!mac) return res.status(400).json({ error: 'MAC requis' });
    await db.query('UPDATE printers SET tapo_mac=?, tapo_state=0 WHERE id=?', [mac, req.params.id]);
    res.json({ ok: true, alias, mac });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
