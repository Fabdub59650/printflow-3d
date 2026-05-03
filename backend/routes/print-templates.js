/**
 * print-templates.js — Modèles d'impression réutilisables
 */

const router = require('express').Router();
const db     = require('../db');

// GET /api/print-templates — liste tous les modèles
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM print_templates ORDER BY use_count DESC, name ASC'
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/print-templates/:id
router.get('/:id', async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT * FROM print_templates WHERE id=?', [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Non trouvé' });
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/print-templates — créer un modèle
router.post('/', async (req, res) => {
  try {
    const { name, material, temp_nozzle, temp_bed, layer_height,
            infill_percent, print_speed, fan_speed, supports, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const [result] = await db.query(
      `INSERT INTO print_templates
        (name, material, temp_nozzle, temp_bed, layer_height,
         infill_percent, print_speed, fan_speed, supports, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [name, material||null, temp_nozzle||null, temp_bed||null,
       layer_height||null, infill_percent||null, print_speed||null,
       fan_speed||null, supports?1:0, notes||null]
    );
    const [[row]] = await db.query(
      'SELECT * FROM print_templates WHERE id=?', [result.insertId]
    );
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/print-templates/:id — modifier
router.put('/:id', async (req, res) => {
  try {
    const { name, material, temp_nozzle, temp_bed, layer_height,
            infill_percent, print_speed, fan_speed, supports, notes } = req.body;
    await db.query(
      `UPDATE print_templates SET name=?,material=?,temp_nozzle=?,temp_bed=?,
       layer_height=?,infill_percent=?,print_speed=?,fan_speed=?,supports=?,notes=?
       WHERE id=?`,
      [name, material||null, temp_nozzle||null, temp_bed||null,
       layer_height||null, infill_percent||null, print_speed||null,
       fan_speed||null, supports?1:0, notes||null, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT * FROM print_templates WHERE id=?', [req.params.id]
    );
    res.json(row);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/print-templates/:id/use — incrémenter le compteur d'utilisation
router.post('/:id/use', async (req, res) => {
  try {
    await db.query(
      'UPDATE print_templates SET use_count=use_count+1 WHERE id=?', [req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/print-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM print_templates WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
