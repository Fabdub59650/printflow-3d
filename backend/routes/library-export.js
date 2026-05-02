/**
 * library-export.js — Export/Import d'objets bibliothèque en ZIP
 */

const router  = require('express').Router();
const db      = require('../db');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const archiver = require('archiver');
const multer  = require('multer');
const AdmZip  = require('adm-zip');

const EXPORT_VERSION = '1.0';

async function getLibraryPath() {
  try {
    const [[row]] = await db.query("SELECT value FROM settings WHERE key_name='library_path'");
    return row?.value || '/opt/printflow/library';
  } catch(_) { return '/opt/printflow/library'; }
}

// ── GET /api/library/objects/:id/export — Exporter un objet en ZIP ────────
router.get('/objects/:id/export', async (req, res) => {
  try {
    const libPath = await getLibraryPath();

    // Récupérer l'objet et ses fichiers
    const [[obj]] = await db.query(
      'SELECT * FROM library_objects WHERE id=?', [req.params.id]
    );
    if (!obj) return res.status(404).json({ error: 'Objet non trouvé' });

    const [files] = await db.query(
      'SELECT * FROM library_files WHERE object_id=? ORDER BY id', [req.params.id]
    );

    // Nom du ZIP
    const safeName = obj.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const zipName  = 'printflow_' + safeName + '_v' + (obj.version || '1') + '.zip';

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(zipName));

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    // manifest.json
    const manifest = {
      export_version: EXPORT_VERSION,
      exported_at:    new Date().toISOString(),
      printflow_version: '2.9.0',
      object: {
        name:         obj.name,
        description:  obj.description,
        tags:         obj.tags,
        source_url:   obj.source_url,
        version:      obj.version,
        designer:     obj.designer,
        license:      obj.license,
        theme_name:   obj.theme_name,
      },
      files: files.map(function(f) {
        return {
          filename:              f.original_name || f.name,
          disk_name:             f.file_path,
          name:                  f.name,
          part_name:             f.part_name,
          description:           f.description,
          tags:                  f.tags,
          source_url:            f.source_url,
          recommended_materials: f.recommended_materials,
          quantity:              f.quantity || 1,
          color_ref:             f.color_ref,
          version:               f.version,
          file_type:             f.file_type,
          file_size:             f.file_size,
        };
      }),
      has_photo:      !!obj.photo_path,
      has_attachment: !!obj.attachment_path,
      attachment_name: obj.attachment_name || null,
    };
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Photo principale
    if (obj.photo_path) {
      const photoFile = path.join(libPath, obj.photo_path);
      if (fs.existsSync(photoFile)) {
        const ext = path.extname(obj.photo_path);
        archive.file(photoFile, { name: 'photo' + ext });
      }
    }

    // Document joint
    if (obj.attachment_path) {
      const attachFile = path.join(libPath, obj.attachment_path);
      if (fs.existsSync(attachFile)) {
        const ext = path.extname(obj.attachment_path);
        const attachName = obj.attachment_name
          ? 'document_' + obj.attachment_name
          : 'document' + ext;
        archive.file(attachFile, { name: attachName });
      }
    }

    // Fichiers 3D
    for (const f of files) {
      const diskPath = path.join(libPath, f.file_path);
      if (fs.existsSync(diskPath)) {
        const origName = f.original_name || f.name;
        archive.file(diskPath, { name: 'files/' + origName });
      }
    }

    await archive.finalize();

  } catch(e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ── POST /api/library/import — Importer un ZIP ────────────────────────────
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/import', importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const libPath = await getLibraryPath();
    fs.mkdirSync(libPath, { recursive: true });

    // Lire le ZIP
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Lire manifest.json
    const manifestEntry = entries.find(function(e){ return e.entryName === 'manifest.json'; });
    if (!manifestEntry) return res.status(400).json({ error: 'manifest.json manquant — ce ZIP n\'est pas un export PrintFlow valide' });

    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    const objData  = manifest.object || {};
    const filesData = manifest.files || [];

    // Récupérer le thème si présent
    let themeId = null;
    if (objData.theme_name) {
      const [[theme]] = await db.query(
        'SELECT id FROM library_themes WHERE name=?', [objData.theme_name]
      ).catch(function(){ return [[null]]; });
      themeId = theme?.id || null;
    }

    // Créer l'objet en base
    const [result] = await db.query(
      `INSERT INTO library_objects
        (name, description, tags, source_url, version, designer, license, theme_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        objData.name || 'Objet importé',
        objData.description || null,
        objData.tags || null,
        objData.source_url || null,
        objData.version || null,
        objData.designer || null,
        objData.license || null,
        themeId,
      ]
    );
    const newObjectId = result.insertId;

    // Importer la photo
    const photoEntry = entries.find(function(e){
      return e.entryName.match(/^photo\.(jpg|jpeg|png|webp|gif)$/i);
    });
    if (photoEntry) {
      const ext      = path.extname(photoEntry.entryName);
      const hash     = crypto.randomBytes(8).toString('hex');
      const diskName = 'photo_' + hash + ext;
      fs.writeFileSync(path.join(libPath, diskName), photoEntry.getData());
      await db.query('UPDATE library_objects SET photo_path=? WHERE id=?', [diskName, newObjectId]);
    }

    // Importer le document joint
    const attachEntry = entries.find(function(e){
      return e.entryName.startsWith('document_') || e.entryName.match(/^document\.(pdf|jpg|jpeg|png)$/i);
    });
    if (attachEntry) {
      const ext      = path.extname(attachEntry.entryName);
      const hash     = crypto.randomBytes(8).toString('hex');
      const diskName = 'attach_' + hash + ext;
      const origName = manifest.attachment_name || attachEntry.entryName.replace(/^document_/, '');
      fs.writeFileSync(path.join(libPath, diskName), attachEntry.getData());
      await db.query(
        'UPDATE library_objects SET attachment_path=?, attachment_name=? WHERE id=?',
        [diskName, origName, newObjectId]
      );
    }

    // Importer les fichiers 3D
    let importedFiles = 0;
    for (const fileData of filesData) {
      const entryName = 'files/' + fileData.filename;
      const entry = entries.find(function(e){ return e.entryName === entryName; });
      if (!entry) continue;

      const ext      = path.extname(fileData.filename).toLowerCase();
      const hash     = crypto.randomBytes(8).toString('hex');
      const diskName = hash + ext;
      fs.writeFileSync(path.join(libPath, diskName), entry.getData());

      const fileType = ['.stl','.3mf','.obj','.step','.stp'].includes(ext) ? '3d'
        : ['.jpg','.jpeg','.png','.webp'].includes(ext) ? 'image'
        : 'other';

      await db.query(
        `INSERT INTO library_files
          (name, original_name, file_path, file_size, file_type, object_id,
           part_name, description, tags, source_url, recommended_materials,
           quantity, color_ref, version)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          fileData.name || fileData.filename,
          fileData.filename,
          diskName,
          entry.getData().length,
          fileType,
          newObjectId,
          fileData.part_name || null,
          fileData.description || null,
          fileData.tags || null,
          fileData.source_url || null,
          fileData.recommended_materials || null,
          fileData.quantity || 1,
          fileData.color_ref || null,
          fileData.version || null,
        ]
      );
      importedFiles++;
    }

    const [[newObj]] = await db.query('SELECT * FROM library_objects WHERE id=?', [newObjectId]);
    res.json({
      ok: true,
      object_id:     newObjectId,
      name:          newObj.name,
      files_imported: importedFiles,
      has_photo:     !!photoEntry,
      has_attachment: !!attachEntry,
    });

  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
