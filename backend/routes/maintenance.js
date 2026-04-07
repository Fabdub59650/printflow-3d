// maintenance.js
const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*, p.name as printer_name FROM maintenance m
      LEFT JOIN printers p ON m.printer_id=p.id
      ORDER BY m.performed_at DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { printer_id, type, description, performed_at, next_due, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO maintenance (printer_id,type,description,performed_at,next_due,notes) VALUES (?,?,?,?,?,?)',
      [printer_id, type, description, performed_at, next_due||null, notes]
    );
    if (printer_id && notes) {
      await db.query('UPDATE printers SET notes=? WHERE id=?', [notes, printer_id]);
    }
    const [rows] = await db.query('SELECT m.*, p.name as printer_name FROM maintenance m LEFT JOIN printers p ON m.printer_id=p.id WHERE m.id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM maintenance WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
