const router = require('express').Router();
const { logAction } = require('../history');
const db     = require('../db');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Multer en mémoire pour les photos (images légères)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non supporté (jpg, png, webp, gif)'));
  }
});

const DEFAULT_LIBRARY = process.env.LIBRARY_PATH || '/opt/printflow/library';
const MAX_SIZE        = 300 * 1024 * 1024;
const ALLOWED         = ['stl', '3mf', 'obj', 'gcode', 'step'];
const ALLOWED_PHOTOS  = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_PHOTO_SIZE  = 10 * 1024 * 1024; // 10 Mo

async function getLibraryPath() {
  try {
    const [[row]] = await db.query("SELECT value FROM settings WHERE key_name='library_path'");
    const p = (row && row.value) ? row.value : DEFAULT_LIBRARY;
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return p;
  } catch (_) { return DEFAULT_LIBRARY; }
}

// ── Upload multer pour les fichiers STL/3MF etc. ─────────
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE } });

// ── THÈMES ─────────────────────────────────────────────────
router.get('/themes', async (req, res) => {
  try {
    const [all] = await db.query(
      `SELECT t.*,
         COUNT(DISTINCT f.id) AS file_count,
         COUNT(DISTINCT o.id) AS object_count
       FROM library_themes t
       LEFT JOIN library_files   f ON f.theme_id = t.id
       LEFT JOIN library_objects o ON o.theme_id = t.id OR o.theme_id IN (
         SELECT id FROM library_themes WHERE parent_id = t.id
       )
       GROUP BY t.id ORDER BY t.sort_order, t.name`
    );
    const map = {}; all.forEach(t => { map[t.id] = { ...t, children: [] }; });
    const roots = [];
    all.forEach(t => {
      if (t.parent_id && map[t.parent_id]) map[t.parent_id].children.push(map[t.id]);
      else if (!t.parent_id) roots.push(map[t.id]);
    });
    res.json(roots);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/themes', async (req, res) => {
  try {
    const { name, parent_id, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const [r] = await db.query('INSERT INTO library_themes (name,parent_id,sort_order) VALUES (?,?,?)', [name, parent_id||null, sort_order||0]);
    const [[t]] = await db.query('SELECT * FROM library_themes WHERE id=?', [r.insertId]);
    res.status(201).json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/themes/:id', async (req, res) => {
  try {
    const { name, parent_id, sort_order } = req.body;
    await db.query('UPDATE library_themes SET name=?,parent_id=?,sort_order=? WHERE id=?', [name, parent_id||null, sort_order||0, req.params.id]);
    const [[t]] = await db.query('SELECT * FROM library_themes WHERE id=?', [req.params.id]);
    res.json(t);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/themes/:id', async (req, res) => {
  try {
    await db.query('UPDATE library_files SET theme_id=NULL WHERE theme_id=?', [req.params.id]);
    await db.query('UPDATE library_objects SET theme_id=NULL WHERE theme_id=?', [req.params.id]);
    await db.query('UPDATE library_themes SET parent_id=NULL WHERE parent_id=?', [req.params.id]);
    await db.query('DELETE FROM library_themes WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── OBJETS ─────────────────────────────────────────────────
router.get('/objects', async (req, res) => {
  try {
    const { theme_id, search } = req.query;
    let sql = `SELECT o.*, t.name AS theme_name,
                 COUNT(f.id) AS file_count,
                 COALESCE(SUM(f.file_size),0) AS total_size
               FROM library_objects o
               LEFT JOIN library_themes t ON o.theme_id = t.id
               LEFT JOIN library_files  f ON f.object_id = o.id
               WHERE 1=1`;
    const params = [];
    if (theme_id) { sql += ' AND (o.theme_id=? OR t.parent_id=?)'; params.push(theme_id, theme_id); }
    if (search)   { sql += ' AND (o.name LIKE ? OR o.tags LIKE ? OR o.description LIKE ?)';
                    const s='%'+search+'%'; params.push(s,s,s); }
    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/objects/:id', async (req, res) => {
  try {
    const [[obj]] = await db.query(
      `SELECT o.*,t.name AS theme_name FROM library_objects o
       LEFT JOIN library_themes t ON o.theme_id=t.id WHERE o.id=?`, [req.params.id]
    );
    if (!obj) return res.status(404).json({ error: 'Non trouvé' });
    const showAll = req.query.all_versions === '1';
    const [files] = await db.query(
      'SELECT * FROM library_files WHERE object_id=? ' + (showAll ? '' : 'AND is_latest=1 ') +
      'ORDER BY part_name, created_at DESC', [req.params.id]
    );
    // Enrichir chaque fichier avec son historique de versions
    for (const f of files) {
      // Remonter jusqu'à la racine
      let rootId = f.id;
      let cur = f;
      while (cur && cur.parent_file_id) {
        rootId = cur.parent_file_id;
        const [[parent]] = await db.query('SELECT id, parent_file_id FROM library_files WHERE id=?', [rootId]);
        cur = parent;
      }
      // Récupérer toute la chaîne depuis la racine
      const [versions] = await db.query(
        `SELECT id, version, changelog, created_at, file_size, is_latest
         FROM library_files
         WHERE id=? OR parent_file_id=?
         ORDER BY created_at DESC`,
        [rootId, rootId]
      );
      f.version_history = versions;
    }
    res.json({ ...obj, files });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/objects', async (req, res) => {
  try {
    const { name, theme_id, description, tags, source_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Le nom est requis' });
    const [r] = await db.query(
      'INSERT INTO library_objects (name,theme_id,description,tags,source_url) VALUES (?,?,?,?,?)',
      [name, theme_id||null, description||null, tags||null, source_url||null]
    );
    const [[obj]] = await db.query('SELECT * FROM library_objects WHERE id=?', [r.insertId]);
    await logAction('library_object', r.insertId, 'create', 'Objet créé : ' + obj.name);
    res.status(201).json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/objects/:id', async (req, res) => {
  try {
    const { name, theme_id, description, tags, source_url } = req.body;
    await db.query(
      'UPDATE library_objects SET name=?,theme_id=?,description=?,tags=?,source_url=? WHERE id=?',
      [name, theme_id||null, description||null, tags||null, source_url||null, req.params.id]
    );
    const [[obj]] = await db.query('SELECT * FROM library_objects WHERE id=?', [req.params.id]);
    await logAction('library_object', req.params.id, 'update', 'Objet modifié : ' + obj.name);
    res.json(obj);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/objects/:id', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[obj]] = await db.query('SELECT name, photo_path FROM library_objects WHERE id=?', [req.params.id]);
    if (obj && obj.photo_path) {
      const fp = path.join(libPath, obj.photo_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db.query('UPDATE library_files SET object_id=NULL,part_name=NULL WHERE object_id=?', [req.params.id]);
    await db.query('DELETE FROM library_objects WHERE id=?', [req.params.id]);
    await logAction('library_object', req.params.id, 'delete', 'Objet supprimé : ' + (obj?.name||'?'));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/objects/:id/full', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[obj]] = await db.query('SELECT name, photo_path FROM library_objects WHERE id=?', [req.params.id]);
    if (obj && obj.photo_path) {
      const fp = path.join(libPath, obj.photo_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    const [files] = await db.query('SELECT * FROM library_files WHERE object_id=?', [req.params.id]);
    for (const f of files) {
      const fp = path.join(libPath, f.file_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db.query('DELETE FROM library_files WHERE object_id=?', [req.params.id]);
    await db.query('DELETE FROM library_objects WHERE id=?', [req.params.id]);
    await logAction('library_object', req.params.id, 'delete', 'Objet supprimé (complet) : ' + (obj?.name||'?'));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/objects/:id/files/:fileId', async (req, res) => {
  try {
    await db.query('UPDATE library_files SET part_name=? WHERE id=? AND object_id=?',
      [req.body.part_name||null, req.params.fileId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/objects/:id/files/:fileId', async (req, res) => {
  try {
    await db.query('UPDATE library_files SET object_id=NULL,part_name=NULL WHERE id=? AND object_id=?',
      [req.params.fileId, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── FICHIERS ───────────────────────────────────────────────
router.get('/files', async (req, res) => {
  try {
    const { theme_id, search, standalone, object_id } = req.query;
    let sql = `SELECT f.*,t.name AS theme_name,o.name AS object_name
               FROM library_files f
               LEFT JOIN library_themes  t ON f.theme_id  = t.id
               LEFT JOIN library_objects o ON f.object_id = o.id
               WHERE 1=1`;
    const params = [];
    if (standalone==='1') sql += ' AND f.object_id IS NULL';
    if (object_id) { sql += ' AND f.object_id=?'; params.push(object_id); }
    if (theme_id) { sql += ' AND (f.theme_id=? OR t.parent_id=?)'; params.push(theme_id,theme_id); }
    if (search)   { sql += ' AND (f.name LIKE ? OR f.tags LIKE ? OR f.description LIKE ?)';
                    const s='%'+search+'%'; params.push(s,s,s); }
    sql += ' ORDER BY f.object_id,f.part_name,f.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const libPath  = await getLibraryPath();
    const fileName = req.file.originalname;
    const fileExt  = path.extname(fileName).slice(1).toLowerCase();
    const fileBuffer = req.file.buffer;
    if (fileBuffer.length > MAX_SIZE) return res.status(400).json({ error: 'Fichier trop volumineux (max 300 Mo)' });
    const fields   = req.body; // multer parse les champs texte dans req.body
    const hash     = crypto.createHash('sha1').update(fileBuffer).digest('hex').slice(0, 12);
    const diskName = `${hash}.${fileExt || 'bin'}`;
    fs.writeFileSync(path.join(libPath, diskName), fileBuffer);
    const fileType = ALLOWED.includes(fileExt) ? fileExt : 'other';
    const [result] = await db.query(
      `INSERT INTO library_files (name,original_name,file_path,file_size,file_type,
         theme_id,object_id,part_name,description,tags,source_url,recommended_materials,
         version,changelog,parent_file_id,quantity,color_ref,is_latest)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        fields.name || path.basename(fileName, '.' + fileExt),
        fileName, diskName, fileBuffer.length, fileType,
        fields.theme_id || null, fields.object_id || null, fields.part_name || null,
        fields.description || null, fields.tags || null, fields.source_url || null,
        fields.recommended_materials || null,
        fields.version || null, fields.changelog || null,
        fields.parent_file_id || null,
        parseInt(fields.quantity) || 1,
        fields.color_ref || null,
      ]
    );
    // Si c'est une nouvelle version, marquer l'ancien comme non-latest
    if (fields.parent_file_id) {
      await db.query('UPDATE library_files SET is_latest=0 WHERE id=?', [fields.parent_file_id]);
    }
    const [[file]] = await db.query('SELECT * FROM library_files WHERE id=?', [result.insertId]);
    res.status(201).json(file);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/library/files/:id/versions — historique complet des versions
router.get('/files/:id/versions', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    // Remonter jusqu'à la racine de la chaîne
    let rootId = fileId;
    let [[cur]] = await db.query('SELECT id, parent_file_id FROM library_files WHERE id=?', [rootId]);
    while (cur && cur.parent_file_id) {
      rootId = cur.parent_file_id;
      [[cur]] = await db.query('SELECT id, parent_file_id FROM library_files WHERE id=?', [rootId]);
    }
    // Récupérer toute la chaîne depuis la racine
    const [versions] = await db.query(
      `SELECT id, name, version, changelog, file_size, created_at, is_latest, parent_file_id
       FROM library_files
       WHERE id=? OR parent_file_id=?
       ORDER BY created_at DESC`,
      [rootId, rootId]
    );
    res.json(versions);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/library/files/:id — modifier version/changelog
router.patch('/files/:id', async (req, res) => {
  try {
    const { version, changelog } = req.body;
    await db.query('UPDATE library_files SET version=?, changelog=? WHERE id=?',
      [version||null, changelog||null, req.params.id]);
    const [[f]] = await db.query('SELECT * FROM library_files WHERE id=?', [req.params.id]);
    res.json(f);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/library/files/:id — détail d'un fichier
router.get('/files/:id', async (req, res) => {
  try {
    const [[f]] = await db.query('SELECT * FROM library_files WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ error: 'Fichier non trouvé' });
    res.json(f);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/files/:id', async (req, res) => {
  try {
    const { name, theme_id, object_id, part_name, description, tags, source_url, recommended_materials, quantity, color_ref } = req.body;
    const hasObjectId = Object.prototype.hasOwnProperty.call(req.body, 'object_id');
    let sql, params;
    if (hasObjectId) {
      sql = `UPDATE library_files SET name=?,theme_id=?,object_id=?,part_name=?,
             description=?,tags=?,source_url=?,recommended_materials=?,quantity=?,color_ref=? WHERE id=?`;
      params = [name, theme_id||null, object_id||null, part_name||null,
                description||null, tags||null, source_url||null, recommended_materials||null,
                quantity||1, color_ref||null, req.params.id];
    } else {
      sql = `UPDATE library_files SET name=?,theme_id=?,
             description=?,tags=?,source_url=?,recommended_materials=?,quantity=?,color_ref=? WHERE id=?`;
      params = [name, theme_id||null,
                description||null, tags||null, source_url||null, recommended_materials||null,
                quantity||1, color_ref||null, req.params.id];
    }
    await db.query(sql, params);
    const [[f]] = await db.query('SELECT * FROM library_files WHERE id=?', [req.params.id]);
    res.json(f);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/files/:id/download', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[f]] = await db.query('SELECT * FROM library_files WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ error: 'Non trouvé' });
    const fp = path.join(libPath, f.file_path);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Fichier introuvable sur disque' });
    await db.query('UPDATE library_files SET download_count=download_count+1 WHERE id=?', [f.id]);
    res.setHeader('Content-Disposition', `attachment; filename="${f.original_name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', f.file_size);
    fs.createReadStream(fp).pipe(res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/files/:id/link', async (req, res) => {
  try {
    await db.query('UPDATE prints SET library_file_id=? WHERE id=?', [req.params.id, req.body.print_id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/files/:id', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[f]] = await db.query('SELECT * FROM library_files WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ error: 'Non trouvé' });
    await db.query('UPDATE prints SET library_file_id=NULL WHERE library_file_id=?', [req.params.id]);
    await db.query('DELETE FROM library_files WHERE id=?', [req.params.id]);
    const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM library_files WHERE file_path=?', [f.file_path]);
    if (count === 0) { const fp = path.join(libPath, f.file_path); if (fs.existsSync(fp)) fs.unlinkSync(fp); }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[s]] = await db.query('SELECT COUNT(*) AS total_files, COALESCE(SUM(file_size),0) AS total_size, COALESCE(SUM(download_count),0) AS total_downloads FROM library_files');
    const [[{ total_objects }]] = await db.query('SELECT COUNT(*) AS total_objects FROM library_objects');
    const [byType] = await db.query('SELECT file_type, COUNT(*) AS count FROM library_files GROUP BY file_type');
    res.json({ ...s, total_objects, byType, library_path: libPath });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PHOTO OBJET ────────────────────────────────────────────

// POST /api/library/objects/:id/photo — upload photo (via multer)
router.post('/objects/:id/photo', photoUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const libPath = await getLibraryPath();

    // Supprimer l'ancienne photo si elle existe
    const [[obj]] = await db.query('SELECT photo_path FROM library_objects WHERE id=?', [req.params.id]);
    if (obj && obj.photo_path) {
      const oldPath = path.join(libPath, obj.photo_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const ext      = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
    const hash     = crypto.createHash('sha1').update(req.file.buffer).digest('hex').slice(0, 12);
    const diskName = 'photo_' + hash + '.' + ext;
    fs.writeFileSync(path.join(libPath, diskName), req.file.buffer);

    await db.query('UPDATE library_objects SET photo_path=? WHERE id=?', [diskName, req.params.id]);
    res.json({ ok: true, photo_path: diskName });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/library/objects/:id/photo — servir la photo
router.get('/objects/:id/photo', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[obj]] = await db.query('SELECT photo_path FROM library_objects WHERE id=?', [req.params.id]);
    if (!obj || !obj.photo_path) return res.status(404).json({ error: 'Pas de photo' });
    const fp = path.join(libPath, obj.photo_path);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Fichier introuvable' });
    const ext = path.extname(fp).slice(1).toLowerCase();
    const mime = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png',
                   webp:'image/webp', gif:'image/gif' }[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fp).pipe(res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/library/objects/:id/photo — supprimer la photo
router.delete('/objects/:id/photo', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[obj]] = await db.query('SELECT photo_path FROM library_objects WHERE id=?', [req.params.id]);
    if (obj && obj.photo_path) {
      const fp = path.join(libPath, obj.photo_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      await db.query('UPDATE library_objects SET photo_path=NULL WHERE id=?', [req.params.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Tags ─────────────────────────────────────────────────

// POST /api/library/objects/:id/attachment — upload document joint
router.post('/objects/:id/attachment', photoUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    const libPath = await getLibraryPath();

    // Supprimer l'ancien document s'il existe
    const [[obj]] = await db.query('SELECT attachment_path FROM library_objects WHERE id=?', [req.params.id]);
    if (obj && obj.attachment_path) {
      const oldPath = path.join(libPath, obj.attachment_path);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const ext      = req.file.originalname.split('.').pop().toLowerCase() || 'pdf';
    const hash     = crypto.createHash('sha1').update(req.file.buffer).digest('hex').slice(0, 12);
    const diskName = 'attach_' + hash + '.' + ext;
    // Corriger l'encodage latin-1 → UTF-8 si nécessaire (multer peut mal décoder)
    let origName = req.file.originalname;
    try {
      origName = Buffer.from(origName, 'latin1').toString('utf8');
      if (origName.includes('â€') || origName.includes('Ã')) origName = req.file.originalname;
    } catch(_) {}
    fs.writeFileSync(path.join(libPath, diskName), req.file.buffer);

    await db.query(
      'UPDATE library_objects SET attachment_path=?, attachment_name=? WHERE id=?',
      [diskName, origName, req.params.id]
    );
    res.json({ ok: true, attachment_path: diskName, attachment_name: origName });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/library/objects/:id/attachment — télécharger le document joint
router.get('/objects/:id/attachment', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[obj]] = await db.query(
      'SELECT attachment_path, attachment_name FROM library_objects WHERE id=?', [req.params.id]
    );
    if (!obj || !obj.attachment_path) return res.status(404).json({ error: 'Pas de document joint' });
    const fp = path.join(libPath, obj.attachment_path);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Fichier introuvable' });
    const ext  = path.extname(fp).slice(1).toLowerCase();
    const mime = {
      pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', gif: 'image/gif'
    }[ext] || 'application/octet-stream';
    const safeName = encodeURIComponent(obj.attachment_name || 'document');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', "inline; filename*=UTF-8''" + safeName);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fp).pipe(res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/library/objects/:id/attachment — supprimer le document joint
router.delete('/objects/:id/attachment', async (req, res) => {
  try {
    const libPath = await getLibraryPath();
    const [[obj]] = await db.query('SELECT attachment_path FROM library_objects WHERE id=?', [req.params.id]);
    if (obj && obj.attachment_path) {
      const fp = path.join(libPath, obj.attachment_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      await db.query('UPDATE library_objects SET attachment_path=NULL, attachment_name=NULL WHERE id=?', [req.params.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// GET /api/library/tags
router.get('/tags', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM library_tags ORDER BY name');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/library/tags
router.post('/tags', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const [result] = await db.query(
      'INSERT IGNORE INTO library_tags (name) VALUES (?)', [name.trim()]
    );
    const [rows] = await db.query('SELECT * FROM library_tags WHERE name=?', [name.trim()]);
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/library/objects/:id/tags — remplacer les tags d'un objet
router.put('/objects/:id/tags', async (req, res) => {
  try {
    const { tag_ids } = req.body; // tableau d'IDs
    await db.query('DELETE FROM library_object_tags WHERE object_id=?', [req.params.id]);
    if (tag_ids && tag_ids.length) {
      for (const tid of tag_ids) {
        await db.query('INSERT IGNORE INTO library_object_tags VALUES (?,?)', [req.params.id, tid]);
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/library/objects/:id/tags — tags d'un objet
router.get('/objects/:id/tags', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.* FROM library_tags t
       JOIN library_object_tags lot ON lot.tag_id=t.id
       WHERE lot.object_id=?`, [req.params.id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Routes matières : stockées directement dans library_files.recommended_materials

// GET /api/library/objects/:id/stats — statistiques d'utilisation
router.get('/objects/:id/stats', async (req, res) => {
  try {
    const [[stats]] = await db.query(`
      SELECT
        COUNT(p.id)                                          AS print_count,
        SUM(p.status='done')                                 AS success_count,
        SUM(p.status='failed')                               AS fail_count,
        COALESCE(SUM(p.filament_used), 0)                    AS total_filament_g,
        MAX(p.created_at)                                    AS last_print
      FROM prints p
      JOIN library_files lf ON lf.id = p.library_file_id
      WHERE lf.object_id = ?
    `, [req.params.id]);
    res.json(stats || { print_count:0, success_count:0, fail_count:0, total_filament_g:0, last_print:null });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
