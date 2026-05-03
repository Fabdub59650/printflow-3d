const router = require('express').Router();
const db = require('../db');
const { logAction } = require('../history');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const DEFAULT_PRINTS_PHOTO_DIR = process.env.PRINTS_PHOTO_DIR || '/opt/printflow/prints';

async function getPrintsPhotoDir() {
  try {
    const [[s]] = await db.query("SELECT value FROM settings WHERE key_name='prints_photo_path'");
    return (s && s.value) ? s.value : DEFAULT_PRINTS_PHOTO_DIR;
  } catch(_) { return DEFAULT_PRINTS_PHOTO_DIR; }
}

const printPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = await getPrintsPhotoDir();
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, 'print_' + req.params.id + '_' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Image uniquement'));
  }
});

// POST /api/prints/:id/photo — uploader une photo de résultat
router.post('/:id/photo', printPhotoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    // Supprimer l'ancienne photo si elle existe
    const [[print]] = await db.query('SELECT photo_path FROM prints WHERE id=?', [req.params.id]);
    if (print?.photo_path) {
      try { fs.unlinkSync(print.photo_path); } catch(_) {}
    }
    await db.query('UPDATE prints SET photo_path=? WHERE id=?', [req.file.path, req.params.id]);
    res.json({ ok: true, photo_path: req.file.path,
      photo_url: '/api/prints/' + req.params.id + '/photo' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/prints/:id/photo — servir la photo
router.get('/:id/photo', async (req, res) => {
  try {
    const [[print]] = await db.query('SELECT photo_path FROM prints WHERE id=?', [req.params.id]);
    if (!print?.photo_path || !fs.existsSync(print.photo_path))
      return res.status(404).json({ error: 'Pas de photo' });
    res.sendFile(print.photo_path);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/prints/:id/rating — noter une impression
router.patch('/:id/rating', async (req, res) => {
  try {
    const rating = req.body.rating !== null && req.body.rating !== undefined
      ? Math.min(5, Math.max(1, parseInt(req.body.rating)))
      : null;
    await db.query('UPDATE prints SET rating=? WHERE id=?', [rating, req.params.id]);
    res.json({ ok: true, rating });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/prints/:id/rating — noter une impression
router.patch('/:id/rating', async (req, res) => {
  try {
    const rating = (req.body.rating !== null && req.body.rating !== undefined)
      ? Math.min(5, Math.max(1, parseInt(req.body.rating)))
      : null;
    await db.query('UPDATE prints SET rating=? WHERE id=?', [rating, req.params.id]);
    res.json({ ok: true, rating });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/prints/:id/photo — supprimer la photo
router.delete('/:id/photo', async (req, res) => {
  try {
    const [[print]] = await db.query('SELECT photo_path FROM prints WHERE id=?', [req.params.id]);
    if (print?.photo_path) { try { fs.unlinkSync(print.photo_path); } catch(_) {} }
    await db.query('UPDATE prints SET photo_path=NULL WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});



router.get('/', async (req, res) => {
  try {
    const { status, printer_id, limit = 100 } = req.query;
    let sql = `SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex, f.material,
               lo.name as library_object_name,
               lf.name as library_file_name
               FROM prints p
               LEFT JOIN printers pr ON p.printer_id = pr.id
               LEFT JOIN filaments f ON p.filament_id = f.id
               LEFT JOIN library_objects lo ON p.library_object_id = lo.id
               LEFT JOIN library_files lf ON p.library_file_id = lf.id
               WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND p.status=?'; params.push(status); }
    if (printer_id) { sql += ' AND p.printer_id=?'; params.push(printer_id); }
    sql += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await db.query(sql, params);
    // Enrichir chaque impression avec ses filaments multiples
    if (rows.length > 0) {
      const ids = rows.map(function(r) { return r.id; });
      const [pf] = await db.query(
        `SELECT pf.*, f.name as filament_name, f.color_hex, f.material
         FROM print_filaments pf
         JOIN filaments f ON f.id = pf.filament_id
         WHERE pf.print_id IN (?) ORDER BY pf.print_id, pf.sort_order`, [ids]
      );
      const pfMap = {};
      pf.forEach(function(r) {
        if (!pfMap[r.print_id]) pfMap[r.print_id] = [];
        pfMap[r.print_id].push(r);
      });
      rows.forEach(function(r) { r.filaments = pfMap[r.id] || []; });
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex, f.material,
             lo.name as library_object_name, lf.name as library_file_name
      FROM prints p
      LEFT JOIN printers pr ON p.printer_id = pr.id
      LEFT JOIN filaments f ON p.filament_id = f.id
      LEFT JOIN library_objects lo ON p.library_object_id = lo.id
      LEFT JOIN library_files lf ON p.library_file_id = lf.id
      WHERE p.id=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Non trouvé' });
    const print = rows[0];
    // Charger les filaments multiples
    const [pf] = await db.query(
      `SELECT pf.*, f.name as filament_name, f.color_hex, f.material, f.price
       FROM print_filaments pf
       JOIN filaments f ON f.id = pf.filament_id
       WHERE pf.print_id=? ORDER BY pf.sort_order`, [print.id]
    );
    print.filaments = pf;

    // Ajouter tarif électricité et prix/kg pour affichage du détail coût
    const [[elecRow]] = await db.query(
      "SELECT value FROM settings WHERE key_name='quote_electricity_rate'"
    ).catch(function(){ return [[null]]; });
    print.electricity_rate = elecRow?.value ? parseFloat(elecRow.value) / 60 : null; // €/min

    // Prix/kg du filament principal
    if (print.filament_id) {
      const [[filRow]] = await db.query(
        'SELECT price, weight_total FROM filaments WHERE id=?', [print.filament_id]
      ).catch(function(){ return [[null]]; });
      print.price_per_kg = filRow?.price && filRow?.weight_total
        ? parseFloat(filRow.price) / (parseFloat(filRow.weight_total) / 1000)
        : null;
    }

    res.json(print);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, printer_id, filament_id, file_name, status, estimated_duration,
            filament_used, layer_height, infill_percent, print_temp, bed_temp, notes,
            project_id, project_item_name, library_object_id, library_file_id, planned_at } = req.body;
    const started_at = status === 'printing' ? new Date() : null;
    const [result] = await db.query(
      `INSERT INTO prints (name,printer_id,filament_id,file_name,status,estimated_duration,
        filament_used,layer_height,infill_percent,print_temp,bed_temp,notes,started_at,
        project_id,project_item_name,library_object_id,library_file_id,planned_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name,printer_id,filament_id,file_name,status||'queued',estimated_duration,
       filament_used,layer_height,infill_percent,print_temp,bed_temp,notes,started_at,
       project_id||null,project_item_name||null,library_object_id||null,library_file_id||null,
       planned_at ? planned_at.replace('T',' ').replace('Z','').slice(0,19) : null]
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
    // Sauvegarder les filaments multiples si fournis
    const filaments = req.body.filaments;
    if (Array.isArray(filaments) && filaments.length > 0) {
      for (let i = 0; i < filaments.length; i++) {
        const pf = filaments[i];
        if (!pf.filament_id) continue;
        await db.query(
          'INSERT INTO print_filaments (print_id, filament_id, sort_order, quantity_estimated, quantity_actual, notes) VALUES (?,?,?,?,?,?)',
          [result.insertId, pf.filament_id, i+1, pf.quantity_estimated||null, pf.quantity_actual||null, pf.notes||null]
        );
      }
      // Déduire le stock pour chaque filament
      for (const pf of filaments) {
        if (pf.filament_id && pf.quantity_actual) {
          await db.query(
            'UPDATE filaments SET weight_remaining=GREATEST(0,weight_remaining-?) WHERE id=?',
            [pf.quantity_actual, pf.filament_id]
          );
        }
      }
    }
    await logAction('print', result.insertId, 'create', 'Impression créée : ' + rows[0].name);
    // Recharger avec filaments
    const [[created]] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex
      FROM prints p LEFT JOIN printers pr ON p.printer_id=pr.id LEFT JOIN filaments f ON p.filament_id=f.id
      WHERE p.id=?`, [result.insertId]);
    const [createdPf] = await db.query(
      'SELECT pf.*, f.name as filament_name, f.color_hex FROM print_filaments pf JOIN filaments f ON f.id=pf.filament_id WHERE pf.print_id=? ORDER BY pf.sort_order',
      [result.insertId]
    );
    created.filaments = createdPf;
    res.status(201).json(created);
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

// ── Calcul du coût réel d'une impression ─────────────────────────────────

async function calcRealCost(printId, filamentId, printerId, filamentUsedG, actualDurationMin) {
  try {
    let filamentPrice = 0, powerW = 0, elecRate = 0.20;

    if (filamentId) {
      const [[f]] = await db.query('SELECT price FROM filaments WHERE id=?', [filamentId]);
      filamentPrice = parseFloat(f?.price || 0);
    }
    if (printerId) {
      const [[p]] = await db.query('SELECT power_consumption FROM printers WHERE id=?', [printerId]);
      powerW = parseFloat(p?.power_consumption || 0);
    }
    const [[elec]] = await db.query("SELECT value FROM settings WHERE key_name='quote_electricity_rate'");
    elecRate = parseFloat(elec?.value || 0.20);

    const filamentCost    = (parseFloat(filamentUsedG || 0) / 1000) * filamentPrice;
    const electricityCost = (parseFloat(actualDurationMin || 0) / 60) * (powerW / 1000) * elecRate;
    const realCost        = filamentCost + electricityCost;

    await db.query(
      'UPDATE prints SET real_cost=?, real_filament_cost=?, real_electricity_cost=? WHERE id=?',
      [
        Math.round(realCost        * 10000) / 10000,
        Math.round(filamentCost    * 10000) / 10000,
        Math.round(electricityCost * 10000) / 10000,
        printId,
      ]
    );
    return { realCost, filamentCost, electricityCost, filamentPrice, powerW, elecRate };
  } catch(e) {
    console.error('[prints] Erreur calcul coût réel :', e.message);
    return null;
  }
}

router.put('/:id', async (req, res) => {
  try {
    const { name, printer_id, filament_id, file_name, status, progress,
            estimated_duration, actual_duration, filament_used,
            layer_height, infill_percent, print_temp, bed_temp, notes,
            project_id, project_item_name, library_object_id, library_file_id,
            planned_at } = req.body;

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
        project_id=?,project_item_name=?,library_object_id=?,library_file_id=?,
        planned_at=? WHERE id=?`,
      [name,printer_id,filament_id,file_name,status,progress||0,
       estimated_duration,actual_duration,filament_used,layer_height,
       infill_percent,print_temp,bed_temp,notes,started_at,finished_at,
       project_id||null,project_item_name||null,
       'library_object_id' in req.body ? (req.body.library_object_id||null) : prev.library_object_id,
       'library_file_id' in req.body ? (req.body.library_file_id||null) : prev.library_file_id,
       planned_at !== undefined ? (planned_at ? planned_at.replace('T',' ').replace('Z','').slice(0,19) : null) : prev.planned_at,
       req.params.id]
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

    // Calculer le coût réel quand l'impression est terminée
    if (status === 'done' && (filament_used || actual_duration)) {
      await calcRealCost(req.params.id, filament_id, printer_id, filament_used, actual_duration);
    }

    const [rows] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex
      FROM prints p LEFT JOIN printers pr ON p.printer_id=pr.id LEFT JOIN filaments f ON p.filament_id=f.id
      WHERE p.id=?`, [req.params.id]);
    // Mettre à jour les filaments multiples si fournis
    const filaments = req.body.filaments;
    if (Array.isArray(filaments)) {
      // Supprimer et réinsérer
      await db.query('DELETE FROM print_filaments WHERE print_id=?', [req.params.id]);
      for (let i = 0; i < filaments.length; i++) {
        const pf = filaments[i];
        if (!pf.filament_id) continue;
        await db.query(
          'INSERT INTO print_filaments (print_id, filament_id, sort_order, quantity_estimated, quantity_actual, notes) VALUES (?,?,?,?,?,?)',
          [req.params.id, pf.filament_id, i+1, pf.quantity_estimated||null, pf.quantity_actual||null, pf.notes||null]
        );
      }
    }
    // Recharger avec filaments
    const [updatedRows] = await db.query(`
      SELECT p.*, pr.name as printer_name, f.name as filament_name, f.color_hex
      FROM prints p LEFT JOIN printers pr ON p.printer_id=pr.id LEFT JOIN filaments f ON p.filament_id=f.id
      WHERE p.id=?`, [req.params.id]);
    const [updatedPf] = await db.query(
      'SELECT pf.*, f.name as filament_name, f.color_hex FROM print_filaments pf JOIN filaments f ON f.id=pf.filament_id WHERE pf.print_id=? ORDER BY pf.sort_order',
      [req.params.id]
    );
    updatedRows[0].filaments = updatedPf;
    const detail = status !== prev.status
      ? `Impression "${updatedRows[0].name}" — statut : ${prev.status} → ${status}`
      : `Impression modifiée : ${updatedRows[0].name}`;
    await logAction('print', req.params.id, 'update', detail);
    res.json(updatedRows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/prints/:id/recalc-cost — recalculer le coût réel manuellement
router.patch('/:id/recalc-cost', async (req, res) => {
  try {
    const [[p]] = await db.query(
      'SELECT id, filament_id, printer_id, filament_used, actual_duration FROM prints WHERE id=?',
      [req.params.id]
    );
    if (!p) return res.status(404).json({ error: 'Impression non trouvée' });
    if (!p.filament_used && !p.actual_duration)
      return res.status(400).json({ error: 'Filament consommé et durée réelle manquants' });

    const costs = await calcRealCost(p.id, p.filament_id, p.printer_id, p.filament_used, p.actual_duration);
    if (!costs) return res.status(500).json({ error: 'Erreur calcul' });

    res.json({
      ok: true,
      real_cost:            Math.round(costs.realCost        * 100) / 100,
      real_filament_cost:   Math.round(costs.filamentCost    * 100) / 100,
      real_electricity_cost:Math.round(costs.electricityCost * 100) / 100,
      filament_price:       costs.filamentPrice,
      power_w:              costs.powerW,
      elec_rate:            costs.elecRate,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const [[p]] = await db.query('SELECT name FROM prints WHERE id=?', [req.params.id]);
    await db.query('DELETE FROM prints WHERE id=?', [req.params.id]);
    await logAction('print', req.params.id, 'delete', 'Impression supprimée : ' + (p?.name||'?'));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
