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

// GET /api/printers/:id/reliability — courbe de fiabilité par période
router.get('/:id/reliability', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const granularity = req.query.granularity || 'month'; // 'week' ou 'month'

    const format = granularity === 'week' ? '%Y-%u' : '%Y-%m';
    const label  = granularity === 'week' ? '%Y S%u'  : '%Y-%m';

    const [rows] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, ?) AS period,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS first_date,
        COUNT(*)                             AS total,
        SUM(status = 'done')                 AS success,
        SUM(status = 'failed')               AS failed,
        SUM(status = 'cancelled')            AS cancelled,
        ROUND(SUM(status='done') / COUNT(*) * 100, 1) AS rate,
        ROUND(SUM(actual_duration) / 60, 1)  AS hours
      FROM prints
      WHERE printer_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        AND status IN ('done','failed','cancelled')
      GROUP BY period
      ORDER BY period ASC
    `, [format, req.params.id, months]);

    // Moyenne globale sur la période
    const [[global]] = await db.query(`
      SELECT
        COUNT(*)                                        AS total,
        SUM(status='done')                              AS success,
        ROUND(SUM(status='done') / COUNT(*) * 100, 1)  AS avg_rate
      FROM prints
      WHERE printer_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
        AND status IN ('done','failed','cancelled')
    `, [req.params.id, months]);

    // Maintenance sur la même période (pour corrélation)
    const [maintenance] = await db.query(`
      SELECT performed_at, type, description
      FROM maintenance
      WHERE printer_id = ?
        AND performed_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      ORDER BY performed_at ASC
    `, [req.params.id, months]);

    res.json({ periods: rows, global, maintenance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create printer
router.post('/', async (req, res) => {
  try {
    const { name, model, ip_address, interface_type, interface_url, api_key,
            volume_x, volume_y, volume_z, nozzle_size, nozzle_count,
            temp_nozzle_max, temp_bed_max, location, notes, power_consumption, has_ams } = req.body;
    const [result] = await db.query(
      `INSERT INTO printers (name,model,ip_address,interface_type,interface_url,api_key,
        volume_x,volume_y,volume_z,nozzle_size,nozzle_count,temp_nozzle_max,temp_bed_max,location,notes,power_consumption,has_ams)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name,model,ip_address,interface_type,interface_url,api_key,
       volume_x,volume_y,volume_z,nozzle_size,nozzle_count,temp_nozzle_max,temp_bed_max,location,notes,power_consumption||null,has_ams||0]
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
            temp_nozzle_max, temp_bed_max, location, notes, status, power_consumption, has_ams } = req.body;
    await db.query(
      `UPDATE printers SET name=?,model=?,ip_address=?,interface_type=?,interface_url=?,api_key=?,
        volume_x=?,volume_y=?,volume_z=?,nozzle_size=?,nozzle_count=?,temp_nozzle_max=?,temp_bed_max=?,
        location=?,notes=?,status=?,power_consumption=?,has_ams=? WHERE id=?`,
      [name,model,ip_address,interface_type,interface_url,api_key,
       volume_x,volume_y,volume_z,nozzle_size,nozzle_count,temp_nozzle_max,temp_bed_max,
       location,notes,status,power_consumption||null,has_ams||0,req.params.id]
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
