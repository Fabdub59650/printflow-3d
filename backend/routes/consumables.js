/**
 * consumables.js — Gestion des consommables d'imprimantes
 *
 * Les heures sont calculées dynamiquement en additionnant actual_duration
 * des impressions done depuis la dernière réinitialisation (reset_at).
 */

const router = require('express').Router();
const db     = require('../db');

// Calcule les heures d'impression depuis la dernière réinitialisation
async function computeHours(printerId, resetAt) {
  const sinceClause = resetAt
    ? 'AND p.finished_at >= ?'
    : '';
  const params = resetAt
    ? [printerId, resetAt]
    : [printerId];
  const [[row]] = await db.query(`
    SELECT COALESCE(SUM(p.actual_duration), 0) / 60 AS hours
    FROM prints p
    WHERE p.printer_id = ?
      AND p.status = 'done'
      AND p.actual_duration IS NOT NULL
      ${sinceClause}
  `, params);
  return Math.round((parseFloat(row.hours) || 0) * 10) / 10;
}

// GET /api/consumables?printer_id=X — liste avec heures calculées
router.get('/', async (req, res) => {
  try {
    const { printer_id } = req.query;
    let sql = `SELECT c.*, pr.name AS printer_name
               FROM consumables c
               JOIN printers pr ON pr.id = c.printer_id`;
    const params = [];
    if (printer_id) { sql += ' WHERE c.printer_id=?'; params.push(printer_id); }
    sql += ' ORDER BY pr.name, c.name';
    const [rows] = await db.query(sql, params);

    // Calculer les heures pour chaque consommable
    const result = await Promise.all(rows.map(async function(c) {
      const hours_used = await computeHours(c.printer_id, c.reset_at);
      const pct        = Math.min(100, Math.round(hours_used / c.interval_hours * 100));
      const status     = pct >= 100 ? 'critical' : pct >= 80 ? 'warning' : 'ok';
      return Object.assign({}, c, { hours_used, pct, status });
    }));

    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/consumables/alerts — consommables dépassant 80%
router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, pr.name AS printer_name
      FROM consumables c
      JOIN printers pr ON pr.id = c.printer_id
      ORDER BY pr.name, c.name
    `);
    const alerts = [];
    for (const c of rows) {
      const hours_used = await computeHours(c.printer_id, c.reset_at);
      const pct        = Math.min(100, Math.round(hours_used / c.interval_hours * 100));
      if (pct >= 80) {
        const status = pct >= 100 ? 'critical' : 'warning';
        alerts.push(Object.assign({}, c, { hours_used, pct, status }));
      }
    }
    // Tri : critique d'abord, puis par % décroissant
    alerts.sort(function(a, b) { return b.pct - a.pct; });
    res.json(alerts);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/consumables/templates — modèles prédéfinis
router.get('/templates', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM consumable_templates ORDER BY name');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/consumables/templates — créer un modèle
router.post('/templates', async (req, res) => {
  try {
    const { name, default_hours, description } = req.body;
    if (!name || !default_hours)
      return res.status(400).json({ error: 'name et default_hours requis' });
    const [result] = await db.query(
      'INSERT INTO consumable_templates (name, default_hours, description) VALUES (?,?,?)',
      [name, parseInt(default_hours), description || null]
    );
    const [[t]] = await db.query('SELECT * FROM consumable_templates WHERE id=?', [result.insertId]);
    res.status(201).json(t);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/consumables/templates/:id — modifier un modèle
router.put('/templates/:id', async (req, res) => {
  try {
    const { name, default_hours, description } = req.body;
    await db.query(
      'UPDATE consumable_templates SET name=?, default_hours=?, description=? WHERE id=?',
      [name, parseInt(default_hours), description || null, req.params.id]
    );
    const [[t]] = await db.query('SELECT * FROM consumable_templates WHERE id=?', [req.params.id]);
    res.json(t);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/consumables/templates/:id — supprimer un modèle
router.delete('/templates/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM consumable_templates WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/consumables — créer un consommable
router.post('/', async (req, res) => {
  try {
    const { printer_id, name, interval_hours, notes } = req.body;
    if (!printer_id || !name || !interval_hours)
      return res.status(400).json({ error: 'printer_id, name et interval_hours requis' });
    const [result] = await db.query(
      'INSERT INTO consumables (printer_id, name, interval_hours, notes) VALUES (?,?,?,?)',
      [printer_id, name, parseInt(interval_hours), notes || null]
    );
    const [[c]] = await db.query('SELECT * FROM consumables WHERE id=?', [result.insertId]);
    const hours_used = await computeHours(c.printer_id, c.reset_at);
    const pct        = Math.min(100, Math.round(hours_used / c.interval_hours * 100));
    res.status(201).json(Object.assign({}, c, { hours_used, pct, status: 'ok' }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/consumables/:id — modifier un consommable
router.put('/:id', async (req, res) => {
  try {
    const { name, interval_hours, notes } = req.body;
    await db.query(
      'UPDATE consumables SET name=?, interval_hours=?, notes=? WHERE id=?',
      [name, parseInt(interval_hours), notes || null, req.params.id]
    );
    const [[c]] = await db.query('SELECT * FROM consumables WHERE id=?', [req.params.id]);
    const hours_used = await computeHours(c.printer_id, c.reset_at);
    const pct        = Math.min(100, Math.round(hours_used / c.interval_hours * 100));
    res.json(Object.assign({}, c, { hours_used, pct, status: pct >= 100 ? 'critical' : pct >= 80 ? 'warning' : 'ok' }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/consumables/:id/reset — réinitialiser le compteur
router.patch('/:id/reset', async (req, res) => {
  try {
    const now = new Date();
    await db.query('UPDATE consumables SET reset_at=? WHERE id=?', [now, req.params.id]);
    const [[c]] = await db.query('SELECT *, 0 AS hours_used, 0 AS pct FROM consumables WHERE id=?', [req.params.id]);
    res.json(Object.assign({}, c, { hours_used: 0, pct: 0, status: 'ok',
      message: 'Compteur réinitialisé le ' + now.toLocaleDateString('fr-FR') }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/consumables/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM consumables WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
