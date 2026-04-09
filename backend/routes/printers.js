const router = require('express').Router();
const { logAction } = require('../history');
const db = require('../db');

// GET all printers
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM printers ORDER BY name');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single printer
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM printers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Non trouvé' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET printer maintenance history
router.get('/:id/maintenance', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM maintenance WHERE printer_id = ? ORDER BY performed_at DESC', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET printer print history
router.get('/:id/prints', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, f.name as filament_name, f.color_hex, f.material
      FROM prints p
      LEFT JOIN filaments f ON p.filament_id = f.id
      WHERE p.printer_id = ?
      ORDER BY p.created_at DESC LIMIT 50
    `, [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create printer
router.post('/', async (req, res) => {
  try {
    const { name, model, ip_address, interface_type, interface_url, api_key,
            volume_x, volume_y, volume_z, nozzle_size, nozzle_count,
            temp_nozzle_max, temp_bed_max, location, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO printers (name,model,ip_address,interface_type,interface_url,api_key,
        volume_x,volume_y,volume_z,nozzle_size,nozzle_count,temp_nozzle_max,temp_bed_max,location,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name,model,ip_address,interface_type,interface_url,api_key,
       volume_x,volume_y,volume_z,nozzle_size,nozzle_count,temp_nozzle_max,temp_bed_max,location,notes]
    );
    const [rows] = await db.query('SELECT * FROM printers WHERE id = ?', [result.insertId]);
    await logAction('printer', result.insertId, 'create', 'Imprimante créée : ' + rows[0].name);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update printer
router.put('/:id', async (req, res) => {
  try {
    const { name, model, ip_address, interface_type, interface_url, api_key,
            volume_x, volume_y, volume_z, nozzle_size, nozzle_count,
            temp_nozzle_max, temp_bed_max, location, notes, status } = req.body;
    await db.query(
      `UPDATE printers SET name=?,model=?,ip_address=?,interface_type=?,interface_url=?,api_key=?,
        volume_x=?,volume_y=?,volume_z=?,nozzle_size=?,nozzle_count=?,temp_nozzle_max=?,temp_bed_max=?,
        location=?,notes=?,status=? WHERE id=?`,
      [name,model,ip_address,interface_type,interface_url,api_key,
       volume_x,volume_y,volume_z,nozzle_size,nozzle_count,temp_nozzle_max,temp_bed_max,
       location,notes,status,req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM printers WHERE id = ?', [req.params.id]);
    await logAction('printer', req.params.id, 'update', 'Imprimante modifiée : ' + rows[0].name);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH update status only
router.patch('/:id/status', async (req, res) => {
  try {
    await db.query('UPDATE printers SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE printer
router.delete('/:id', async (req, res) => {
  try {
    const [[pdel]] = await db.query('SELECT name FROM printers WHERE id=?', [req.params.id]);
    await db.query('DELETE FROM printers WHERE id = ?', [req.params.id]);
    await logAction('printer', req.params.id, 'delete', 'Imprimante supprimée : ' + (pdel?.name||'?'));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
