const router  = require('express').Router();
const db      = require('../db');
const { logAction } = require('../history');

async function generateProjectCode() {
  const now       = new Date();
  const year2     = String(now.getFullYear()).slice(-2);
  const month2    = String(now.getMonth() + 1).padStart(2, '0');
  const ym        = `${year2}${month2}`;
  const conn      = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO project_counters (ym, last_counter) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE last_counter = last_counter + 1`, [ym]
    );
    const [[row]] = await conn.query(
      'SELECT last_counter FROM project_counters WHERE ym = ?', [ym]
    );
    await conn.commit();
    return `P-${ym}-${String(row.last_counter).padStart(3, '0')}`;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function computeAutoStatus(projectId) {
  const [[s]] = await db.query(
    `SELECT COUNT(*) AS total,
       SUM(status='done') AS done, SUM(status='failed') AS failed,
       SUM(status='cancelled') AS cancelled,
       SUM(status IN ('printing','paused','queued')) AS active
     FROM prints WHERE project_id=?`, [projectId]
  );
  if (!s.total)     return 'draft';
  if (s.active > 0) return 'in_progress';
  if (s.done > 0 && s.done + s.failed + s.cancelled >= s.total) return 'done';
  if (s.done > 0)   return 'in_progress';
  return 'draft';
}

async function refreshStatus(projectId) {
  const [[p]] = await db.query('SELECT status_forced, status FROM projects WHERE id=?', [projectId]);
  if (p && !p.status_forced) {
    const newStatus = await computeAutoStatus(projectId);
    if (newStatus !== p.status) {
      await db.query('UPDATE projects SET status=? WHERE id=?', [newStatus, projectId]);
      const labels = { draft:'Brouillon', in_progress:'En cours', done:'Terminé', cancelled:'Annulé' };
      await logAction('project', projectId, 'status_changed', `Statut passé à "${labels[newStatus] || newStatus}" (automatique)`,
        p.status, newStatus);
    }
  }
}

async function getFullProject(id) {
  const [[project]] = await db.query('SELECT * FROM projects WHERE id=?', [id]);
  if (!project) return null;
  const [items]  = await db.query(
    'SELECT * FROM project_items WHERE project_id=? ORDER BY sort_order, id', [id]
  );
  const [prints] = await db.query(
    `SELECT pr.*, p.name AS printer_name, f.name AS filament_name, f.color_hex, f.material
     FROM prints pr
     LEFT JOIN printers p  ON pr.printer_id  = p.id
     LEFT JOIN filaments f ON pr.filament_id = f.id
     WHERE pr.project_id = ? ORDER BY pr.item_id, pr.created_at`, [id]
  );
  const itemMap = {};
  items.forEach(item => { itemMap[item.id] = { ...item, prints: [] }; });
  const directPrints = [];
  prints.forEach(pr => {
    if (pr.item_id && itemMap[pr.item_id]) itemMap[pr.item_id].prints.push(pr);
    else directPrints.push(pr);
  });
  const totalPrints = prints.length;
  const donePrints  = prints.filter(p => p.status === 'done').length;
  const totalGrams  = prints.reduce((s, p) => s + (parseFloat(p.filament_used) || 0), 0);
  const totalMin    = prints.reduce((s, p) => s + (parseInt(p.actual_duration || p.estimated_duration) || 0), 0);
  return { ...project, items: Object.values(itemMap), direct_prints: directPrints,
           stats: { totalPrints, donePrints, totalGrams, totalMin } };
}

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const [projects] = await db.query(
      `SELECT p.*,
         COUNT(DISTINCT pi.id)               AS total_items,
         COUNT(DISTINCT pr.id)               AS total_prints,
         COALESCE(SUM(pr.status='done'),0)   AS done_prints,
         COALESCE(SUM(pr.status IN ('printing','paused')),0) AS active_prints,
         COALESCE(SUM(pr.filament_used),0)   AS total_grams,
         COALESCE(SUM(pr.actual_duration),0) AS total_minutes
       FROM projects p
       LEFT JOIN project_items pi ON pi.project_id = p.id
       LEFT JOIN prints pr        ON pr.project_id  = p.id
       GROUP BY p.id ORDER BY p.created_at DESC`
    );
    res.json(projects);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await getFullProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Non trouvé' });
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/projects/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM project_history WHERE project_id=? ORDER BY created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { name, description, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });
    const code = await generateProjectCode();
    const [r] = await db.query(
      `INSERT INTO projects (code, name, description, notes, status) VALUES (?,?,?,?,'draft')`,
      [code, name, description||null, notes||null]
    );
    await logAction('project', r.insertId, 'created', `Projet ${code} créé : "${name}"`);
    res.status(201).json(await getFullProject(r.insertId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description, notes, status } = req.body;
    const [[ex]] = await db.query('SELECT * FROM projects WHERE id=?', [req.params.id]);
    if (!ex) return res.status(404).json({ error: 'Non trouvé' });
    let finalStatus  = ex.status;
    let statusForced = ex.status_forced;
    const statusLabels = { draft:'Brouillon', in_progress:'En cours', done:'Terminé', cancelled:'Annulé' };
    if (status && status !== ex.status) {
      finalStatus  = status;
      statusForced = 1;
      await logAction('project', req.params.id, 'status_changed', `Statut forcé à "${statusLabels[status] || status}"`, ex.status, status);
    } else if (!ex.status_forced) {
      finalStatus = await computeAutoStatus(req.params.id);
    }
    if (name !== ex.name) {
      await logAction('project', req.params.id, 'name_changed', `Nom modifié : "${ex.name}" → "${name}"`, ex.name, name);
    }
    await db.query(
      `UPDATE projects SET name=?,description=?,notes=?,status=?,status_forced=? WHERE id=?`,
      [name, description||null, notes||null, finalStatus, statusForced, req.params.id]
    );
    res.json(await getFullProject(req.params.id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/projects/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, force } = req.body;
    const statusLabels = { draft:'Brouillon', in_progress:'En cours', done:'Terminé', cancelled:'Annulé' };
    const [[cur]] = await db.query('SELECT status FROM projects WHERE id=?', [req.params.id]);
    if (force && status) {
      await db.query('UPDATE projects SET status=?,status_forced=1 WHERE id=?', [status, req.params.id]);
      await logAction('project', req.params.id, 'status_changed', `Statut forcé à "${statusLabels[status] || status}"`, cur.status, status);
      return res.json({ ok: true, status });
    }
    const s = await computeAutoStatus(req.params.id);
    await db.query('UPDATE projects SET status=?,status_forced=0 WHERE id=?', [s, req.params.id]);
    if (s !== cur.status) {
      await logAction('project', req.params.id, 'status_changed', `Statut recalculé à "${statusLabels[s] || s}"`, cur.status, s);
    }
    res.json({ ok: true, status: s });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('UPDATE prints SET project_id=NULL,item_id=NULL WHERE project_id=?', [req.params.id]);
    await db.query('DELETE FROM projects WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PIÈCES ─────────────────────────────────────────────────
router.post('/:id/items', async (req, res) => {
  try {
    const { name, description, quantity, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });
    const [r] = await db.query(
      'INSERT INTO project_items (project_id,name,description,quantity,sort_order) VALUES (?,?,?,?,?)',
      [req.params.id, name, description||null, quantity||1, sort_order||0]
    );
    await logAction('project', req.params.id, 'item_added', `Pièce ajoutée : "${name}"`);
    const [[item]] = await db.query('SELECT * FROM project_items WHERE id=?', [r.insertId]);
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { name, description, quantity, sort_order } = req.body;
    const [[old]] = await db.query('SELECT name FROM project_items WHERE id=?', [req.params.itemId]);
    await db.query(
      'UPDATE project_items SET name=?,description=?,quantity=?,sort_order=? WHERE id=? AND project_id=?',
      [name, description||null, quantity||1, sort_order||0, req.params.itemId, req.params.id]
    );
    if (old && old.name !== name) {
      await logAction('project', req.params.id, 'item_modified', `Pièce renommée : "${old.name}" → "${name}"`);
    }
    const [[item]] = await db.query('SELECT * FROM project_items WHERE id=?', [req.params.itemId]);
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const [[item]] = await db.query('SELECT name FROM project_items WHERE id=?', [req.params.itemId]);
    await db.query('UPDATE prints SET item_id=NULL WHERE item_id=?', [req.params.itemId]);
    await db.query('DELETE FROM project_items WHERE id=? AND project_id=?', [req.params.itemId, req.params.id]);
    if (item) await logAction('project', req.params.id, 'item_removed', `Pièce supprimée : "${item.name}"`);
    await refreshStatus(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/items/:itemId/prints', async (req, res) => {
  try {
    const { print_id } = req.body;
    const [[pr]] = await db.query('SELECT name FROM prints WHERE id=?', [print_id]);
    const [[it]] = await db.query('SELECT name FROM project_items WHERE id=?', [req.params.itemId]);
    await db.query('UPDATE prints SET project_id=?,item_id=? WHERE id=?',
      [req.params.id, req.params.itemId, print_id]);
    if (pr && it) await logAction('project', req.params.id, 'print_linked', `Impression "${pr.name}" rattachée à la pièce "${it.name}"`);
    await refreshStatus(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/items/:itemId/prints/:printId', async (req, res) => {
  try {
    const [[pr]] = await db.query('SELECT name FROM prints WHERE id=?', [req.params.printId]);
    await db.query('UPDATE prints SET project_id=NULL,item_id=NULL WHERE id=? AND item_id=?',
      [req.params.printId, req.params.itemId]);
    if (pr) await logAction('project', req.params.id, 'print_unlinked', `Impression "${pr.name}" retirée du projet`);
    await refreshStatus(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/prints', async (req, res) => {
  try {
    const { print_id } = req.body;
    const [[pr]] = await db.query('SELECT name FROM prints WHERE id=?', [print_id]);
    await db.query('UPDATE prints SET project_id=?,item_id=NULL WHERE id=?', [req.params.id, print_id]);
    if (pr) await logAction('project', req.params.id, 'print_linked', `Impression "${pr.name}" rattachée directement au projet`);
    await refreshStatus(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/prints/:printId', async (req, res) => {
  try {
    const [[pr]] = await db.query('SELECT name FROM prints WHERE id=?', [req.params.printId]);
    await db.query('UPDATE prints SET project_id=NULL,item_id=NULL WHERE id=?', [req.params.printId]);
    if (pr) await logAction('project', req.params.id, 'print_unlinked', `Impression "${pr.name}" retirée du projet`);
    await refreshStatus(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
