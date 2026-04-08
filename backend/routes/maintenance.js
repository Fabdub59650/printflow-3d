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

router.get('/:id', async (req, res) => {
  try {
    const [[m]] = await db.query(
      `SELECT m.*,p.name AS printer_name FROM maintenance m
       LEFT JOIN printers p ON p.id=m.printer_id WHERE m.id=?`, [req.params.id]
    );
    if (!m) return res.status(404).json({ error: 'Non trouvé' });
    res.json(m);
  } catch(e) { res.status(500).json({ error: e.message }); }
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

router.put('/:id', async (req, res) => {
  try {
    const { printer_id, type, performed_at, next_due, description, notes } = req.body;
    await db.query(
      `UPDATE maintenance SET printer_id=?,type=?,performed_at=?,next_due=?,description=?,notes=? WHERE id=?`,
      [printer_id||null, type, performed_at, next_due||null, description||null, notes||null, req.params.id]
    );
    const [[m]] = await db.query('SELECT * FROM maintenance WHERE id=?', [req.params.id]);
    res.json(m);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /maintenance/:id/done — marquer comme fait (efface next_due)
router.patch('/:id/done', async (req, res) => {
  try {
    await db.query('UPDATE maintenance SET next_due=NULL WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM maintenance WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
