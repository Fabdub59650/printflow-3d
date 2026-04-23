/**
 * schedule.js — Planning d'impression
 */

const router = require('express').Router();
const db     = require('../db');

// GET /api/schedule — liste chronologique
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*,
             pr.name AS printer_name,
             f.name  AS filament_name, f.material, f.color_hex
      FROM print_schedule s
      LEFT JOIN printers  pr ON pr.id = s.printer_id
      LEFT JOIN filaments f  ON f.id  = s.filament_id
      ORDER BY s.planned_at ASC
    `);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/schedule — créer
router.post('/', async (req, res) => {
  try {
    const { title, description, printer_id, filament_id, planned_at, duration_h } = req.body;
    if (!title)      return res.status(400).json({ error: 'Titre requis' });
    if (!planned_at) return res.status(400).json({ error: 'Date planifiée requise' });
    const [result] = await db.query(`
      INSERT INTO print_schedule (title, description, printer_id, filament_id, planned_at, duration_h)
      VALUES (?,?,?,?,?,?)
    `, [title, description||null, printer_id||null, filament_id||null, planned_at, duration_h||0]);
    const [[s]] = await db.query('SELECT * FROM print_schedule WHERE id=?', [result.insertId]);
    res.json(s);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/schedule/:id — modifier
router.put('/:id', async (req, res) => {
  try {
    const { title, description, printer_id, filament_id, planned_at, duration_h, status, print_id } = req.body;
    await db.query(`
      UPDATE print_schedule SET
        title=?, description=?, printer_id=?, filament_id=?,
        planned_at=?, duration_h=?, status=?, print_id=?
      WHERE id=?
    `, [title, description||null, printer_id||null, filament_id||null,
        planned_at, duration_h||0, status||'planned', print_id||null, req.params.id]);
    const [[s]] = await db.query('SELECT * FROM print_schedule WHERE id=?', [req.params.id]);
    res.json(s);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/schedule/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM print_schedule WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
