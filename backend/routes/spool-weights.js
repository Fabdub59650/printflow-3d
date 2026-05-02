/**
 * spool-weights.js — Base de référence des poids de bobines vides
 */

const router = require('express').Router();
const db     = require('../db');

// GET /api/spool-weights — liste complète
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM spool_weights ORDER BY brand, model'
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/spool-weights/brands — liste des fabricants distincts
router.get('/brands', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT brand FROM spool_weights ORDER BY brand'
    );
    res.json(rows.map(function(r){ return r.brand; }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/spool-weights/by-brand/:brand — modèles d'un fabricant
router.get('/by-brand/:brand', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM spool_weights WHERE brand=? ORDER BY model',
      [req.params.brand]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/spool-weights — ajouter une entrée
router.post('/', async (req, res) => {
  try {
    const { brand, model, weight_g, spool_size_g, diameter_mm, notes } = req.body;
    if (!brand || !weight_g) return res.status(400).json({ error: 'Fabricant et poids requis' });
    const [result] = await db.query(
      'INSERT INTO spool_weights (brand, model, weight_g, spool_size_g, diameter_mm, notes) VALUES (?,?,?,?,?,?)',
      [brand, model||null, weight_g, spool_size_g||1000, diameter_mm||1.75, notes||null]
    );
    const [[row]] = await db.query('SELECT * FROM spool_weights WHERE id=?', [result.insertId]);
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/spool-weights/:id — modifier
router.put('/:id', async (req, res) => {
  try {
    const { brand, model, weight_g, spool_size_g, diameter_mm, notes } = req.body;
    await db.query(
      'UPDATE spool_weights SET brand=?, model=?, weight_g=?, spool_size_g=?, diameter_mm=?, notes=? WHERE id=?',
      [brand, model||null, weight_g, spool_size_g||1000, diameter_mm||1.75, notes||null, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM spool_weights WHERE id=?', [req.params.id]);
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/spool-weights/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM spool_weights WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
