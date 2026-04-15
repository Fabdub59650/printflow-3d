const router = require('express').Router();
const db = require('../db');
const { logAction } = require('../history');

router.get('/', async (req, res) => {
  try {
    const archived = req.query.archived === '1' ? 1 : 0;
    const [rows] = await db.query('SELECT * FROM filaments WHERE archived=? ORDER BY material, name', [archived]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM filaments WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Non trouvé' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const [result] = await db.query(
      `INSERT INTO filaments (name,brand,material,color_name,color_hex,diameter,
        temp_nozzle_min,temp_nozzle_max,temp_bed_min,temp_bed_max,
        weight_total,weight_remaining,price,spoolman_id,location,notes,
        finish_option,special_option,spool_weight,nfc_uid,spool_number,elegoo_subtype,
        parent_filament_id,spool_label)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [req.body.name, req.body.brand, req.body.material,
       req.body.color_name, req.body.color_hex, req.body.diameter||1.75,
       req.body.temp_nozzle_min, req.body.temp_nozzle_max,
       req.body.temp_bed_min, req.body.temp_bed_max,
       req.body.weight_total, req.body.weight_remaining||req.body.weight_total,
       req.body.price||null, req.body.spoolman_id||null,
       req.body.location, req.body.notes,
       req.body.finish_option||null, req.body.special_option||null,
       req.body.spool_weight||null, req.body.nfc_uid||null,
       req.body.spool_number||null, req.body.elegoo_subtype||null,
       req.body.parent_filament_id||null, req.body.spool_label||null]
    );
    const [rows] = await db.query('SELECT * FROM filaments WHERE id=?', [result.insertId]);
    await logAction('filament', result.insertId, 'create', 'Filament créé : ' + rows[0].name);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, brand, material, color_name, color_hex, diameter,
            temp_nozzle_min, temp_nozzle_max, temp_bed_min, temp_bed_max,
            weight_total, weight_remaining, price, spoolman_id, location, notes, archived,
            finish_option, special_option, spool_weight,
            parent_filament_id, spool_label } = req.body;

    const [[current]] = await db.query(
      'SELECT nfc_uid, spool_number, elegoo_subtype FROM filaments WHERE id=?',
      [req.params.id]
    );
    const nfc_uid        = 'nfc_uid'        in req.body ? (req.body.nfc_uid        || null) : (current?.nfc_uid        || null);
    const spool_number   = 'spool_number'   in req.body ? (req.body.spool_number   || null) : (current?.spool_number   || null);
    const elegoo_subtype = 'elegoo_subtype' in req.body ? (req.body.elegoo_subtype || null) : (current?.elegoo_subtype || null);

    await db.query(
      `UPDATE filaments SET name=?,brand=?,material=?,color_name=?,color_hex=?,diameter=?,
        temp_nozzle_min=?,temp_nozzle_max=?,temp_bed_min=?,temp_bed_max=?,
        weight_total=?,weight_remaining=?,price=?,spoolman_id=?,location=?,notes=?,archived=?,
        finish_option=?,special_option=?,spool_weight=?,nfc_uid=?,spool_number=?,elegoo_subtype=?,
        parent_filament_id=?,spool_label=?
       WHERE id=?`,
      [name,brand,material,color_name,color_hex,diameter,
       temp_nozzle_min,temp_nozzle_max,temp_bed_min,temp_bed_max,
       weight_total,weight_remaining,price,spoolman_id,location,notes,archived||0,
       finish_option||null,special_option||null,spool_weight||null,
       nfc_uid, spool_number, elegoo_subtype,
       parent_filament_id||null, spool_label||null,
       req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM filaments WHERE id=?', [req.params.id]);
    await logAction('filament', req.params.id, 'update', 'Filament modifié : ' + rows[0].name);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH: update remaining weight only (called after a print)
router.patch('/:id/use', async (req, res) => {
  try {
    const { grams } = req.body;
    await db.query(
      'UPDATE filaments SET weight_remaining = GREATEST(0, weight_remaining - ?) WHERE id=?',
      [grams, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [[fdel]] = await db.query('SELECT name FROM filaments WHERE id=?', [req.params.id]);
    await db.query('DELETE FROM filaments WHERE id=?', [req.params.id]);
    await logAction('filament', req.params.id, 'delete', 'Filament supprimé : ' + (fdel?.name||'?'));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/filaments/import-csv — import CSV
router.post('/import-csv', async (req, res) => {
  try {
    const { rows } = req.body; // tableau d'objets parsés côté frontend
    if (!Array.isArray(rows) || !rows.length)
      return res.status(400).json({ error: 'Aucune ligne valide' });

    let imported = 0, errors = [];
    for (const row of rows) {
      try {
        if (!row.name || !row.material) { errors.push('Ligne ignorée : nom/matière manquant'); continue; }
        await db.query(`
          INSERT INTO filaments
            (name, brand, material, color_hex, color_name, diameter,
             weight_total, weight_remaining, temp_nozzle_min, temp_nozzle_max,
             temp_bed_min, temp_bed_max, price, location, notes)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [row.name, row.brand||null, row.material,
           row.color_hex||null, row.color_name||null,
           parseFloat(row.diameter)||1.75,
           parseFloat(row.weight_total)||1000,
           parseFloat(row.weight_remaining)||(parseFloat(row.weight_total)||1000),
           row.temp_nozzle_min||null, row.temp_nozzle_max||null,
           row.temp_bed_min||null, row.temp_bed_max||null,
           row.price||null, row.location||null, row.notes||null]
        );
        imported++;
      } catch(e) { errors.push('Erreur ligne "' + row.name + '" : ' + e.message); }
    }
    res.json({ imported, errors });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Routes filaments recommandés bibliothèque
module.exports = router;
