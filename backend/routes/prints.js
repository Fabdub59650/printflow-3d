const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const { status, printer_id, limit = 100 } = req.query;
    let sql = `SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex, f.material
               FROM prints p
               LEFT JOIN printers pr ON p.printer_id = pr.id
               LEFT JOIN filaments f ON p.filament_id = f.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND p.status=?'; params.push(status); }
    if (printer_id) { sql += ' AND p.printer_id=?'; params.push(printer_id); }
    sql += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex, f.material
      FROM prints p
      LEFT JOIN printers pr ON p.printer_id = pr.id
      LEFT JOIN filaments f ON p.filament_id = f.id
      WHERE p.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Non trouvé' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, printer_id, filament_id, file_name, status, estimated_duration,
            filament_used, layer_height, infill_percent, print_temp, bed_temp, notes,
            project_id, project_item_name } = req.body;
    const started_at = status === 'printing' ? new Date() : null;
    const [result] = await db.query(
      `INSERT INTO prints (name,printer_id,filament_id,file_name,status,estimated_duration,
        filament_used,layer_height,infill_percent,print_temp,bed_temp,notes,started_at,
        project_id,project_item_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name,printer_id,filament_id,file_name,status||'queued',estimated_duration,
       filament_used,layer_height,infill_percent,print_temp,bed_temp,notes,started_at,
       project_id||null,project_item_name||null]
    );
    if (printer_id && status === 'printing') {
      await db.query('UPDATE printers SET status=? WHERE id=?', ['printing', printer_id]);
    }
    // Recalculer statut projet si rattaché
    if (project_id) {
      const [[pj]] = await db.query('SELECT status_forced FROM projects WHERE id=?', [project_id]);
      if (pj && !pj.status_forced) {
        const s = await computeProjectStatus(project_id);
        await db.query('UPDATE projects SET status=? WHERE id=?', [s, project_id]);
      }
    }
    const [rows] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex
      FROM prints p LEFT JOIN printers pr ON p.printer_id=pr.id LEFT JOIN filaments f ON p.filament_id=f.id
      WHERE p.id=?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function computeProjectStatus(projectId) {
  const [[{ total, done, failed, cancelled, active }]] = await db.query(
    `SELECT COUNT(*) AS total,
       SUM(status='done') AS done, SUM(status='failed') AS failed,
       SUM(status='cancelled') AS cancelled,
       SUM(status IN ('printing','paused','queued')) AS active
     FROM prints WHERE project_id=?`, [projectId]
  );
  if (!total)   return 'draft';
  if (active > 0) return 'in_progress';
  if (done > 0 && done + failed + cancelled >= total) return 'done';
  if (done > 0) return 'in_progress';
  return 'draft';
}

router.put('/:id', async (req, res) => {
  try {
    const { name, printer_id, filament_id, file_name, status, progress,
            estimated_duration, actual_duration, filament_used,
            layer_height, infill_percent, print_temp, bed_temp, notes,
            project_id, project_item_name } = req.body;

    const [existing] = await db.query('SELECT * FROM prints WHERE id=?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Non trouvé' });
    const prev = existing[0];

    let started_at = prev.started_at;
    let finished_at = prev.finished_at;
    if (status === 'printing' && !started_at) started_at = new Date();
    if ((status === 'done' || status === 'failed' || status === 'cancelled') && !finished_at) finished_at = new Date();

    await db.query(
      `UPDATE prints SET name=?,printer_id=?,filament_id=?,file_name=?,status=?,progress=?,
        estimated_duration=?,actual_duration=?,filament_used=?,layer_height=?,
        infill_percent=?,print_temp=?,bed_temp=?,notes=?,started_at=?,finished_at=?,
        project_id=?,project_item_name=? WHERE id=?`,
      [name,printer_id,filament_id,file_name,status,progress||0,
       estimated_duration,actual_duration,filament_used,layer_height,
       infill_percent,print_temp,bed_temp,notes,started_at,finished_at,
       project_id||null,project_item_name||null,req.params.id]
    );

    // Update printer stats when print finishes
    if ((status === 'done' || status === 'failed') && prev.status === 'printing') {
      const durH = actual_duration ? actual_duration / 60 : 0;
      const grams = filament_used || 0;
      const success = status === 'done' ? 1 : 0;
      await db.query(
        `UPDATE printers SET status='idle', total_prints=total_prints+1,
          total_success=total_success+?,
          total_hours=total_hours+?,
          total_grams=total_grams+?
         WHERE id=?`,
        [success, durH, grams, printer_id]
      );
      if (filament_id && grams > 0) {
        await db.query('UPDATE filaments SET weight_remaining=GREATEST(0,weight_remaining-?) WHERE id=?', [grams, filament_id]);
      }
    }

    const [rows] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex
      FROM prints p LEFT JOIN printers pr ON p.printer_id=pr.id LEFT JOIN filaments f ON p.filament_id=f.id
      WHERE p.id=?`, [req.params.id]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM prints WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
