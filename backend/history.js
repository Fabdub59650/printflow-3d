/**
 * history.js — Historique des modifications (audit log)
 */
const db = require('./db');

async function logAction(entity, entityId, action, detail, diff = null) {
  try {
    await db.query(
      `INSERT INTO audit_log (entity, entity_id, action, detail, diff)
       VALUES (?,?,?,?,?)`,
      [entity, entityId, action, detail, diff ? JSON.stringify(diff) : null]
    );
  } catch(e) { console.warn('[History] Erreur log:', e.message); }
}

function setupRoutes(router) {
  // GET /api/history
  router.get('/', async (req, res) => {
    try {
      const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
      const entity = req.query.entity || null;

      // Cas spécial : historique NFC depuis nfc_write_history
      if (entity === 'nfc') {
        const [rows] = await db.query(
          `SELECT h.*, f.name AS filament_name, f.material, f.color_hex
           FROM nfc_write_history h
           LEFT JOIN filaments f ON f.id = h.filament_id
           ORDER BY h.written_at DESC LIMIT ?`, [limit]
        );
        return res.json(rows.map(r => ({
          id: r.id,
          entity: 'nfc',
          entity_id: r.filament_id,
          action: 'nfc_write',
          detail: 'Écriture NFC — ' + (r.filament_name||'Filament') +
                  ' · ' + (r.format||'') + ' · UID: ' + (r.uid||'?'),
          created_at: r.written_at,
          diff: null,
          uid: r.uid, format: r.format, material: r.material,
          color_hex: r.color_hex, filament_name: r.filament_name,
        })));
      }

      // Cas spécial : devis depuis table quotes
      if (entity === 'quote') {
        const [rows] = await db.query(`
          SELECT q.id, q.client_name, q.description, q.total_ht, q.status,
                 q.created_at, q.updated_at,
                 f.name AS filament_name, pr.name AS printer_name
          FROM quotes q
          LEFT JOIN filaments f  ON f.id  = q.filament_id
          LEFT JOIN printers  pr ON pr.id = q.printer_id
          ORDER BY q.updated_at DESC LIMIT ?
        `, [limit]);
        const STATUS_LABELS = { draft:'Brouillon', sent:'Envoyé', accepted:'Accepté', refused:'Refusé' };
        return res.json(rows.map(r => ({
          id:         r.id,
          entity:     'quote',
          entity_id:  r.id,
          action:     r.status === 'accepted' ? 'accepted' : r.status === 'refused' ? 'refused' : 'update',
          detail:     'Devis — ' + r.client_name +
                      (r.description ? ' · ' + r.description.substring(0,50) : '') +
                      ' · ' + parseFloat(r.total_ht||0).toFixed(2) + ' €' +
                      ' · ' + (STATUS_LABELS[r.status]||r.status),
          created_at: r.updated_at || r.created_at,
          diff:       null,
          // Données supplémentaires
          client_name:   r.client_name,
          total_ht:      r.total_ht,
          status:        r.status,
          filament_name: r.filament_name,
          printer_name:  r.printer_name,
        })));
      }

      // Cas spécial : maintenance depuis table maintenance
      if (entity === 'maintenance') {
        const [rows] = await db.query(`
          SELECT m.id, m.type, m.description, m.performed_at, m.next_due,
                 m.notes, m.created_at, pr.name AS printer_name
          FROM maintenance m
          LEFT JOIN printers pr ON pr.id = m.printer_id
          ORDER BY m.performed_at DESC LIMIT ?
        `, [limit]);
        return res.json(rows.map(r => ({
          id:         r.id,
          entity:     'maintenance',
          entity_id:  r.id,
          action:     'create',
          detail:     '🔧 ' + (r.printer_name||'—') + ' — ' +
                      (r.type||'').replace(/_/g,' ') +
                      (r.description ? ' · ' + r.description.substring(0,60) : '') +
                      (r.next_due ? ' · Prochain : ' + new Date(r.next_due).toLocaleDateString('fr-FR') : ''),
          created_at: r.performed_at || r.created_at,
          diff:       null,
          printer_name: r.printer_name,
          type:         r.type,
          next_due:     r.next_due,
        })));
      }

      let sql = 'SELECT * FROM audit_log';
      const params = [];
      if (entity) { sql += ' WHERE entity=?'; params.push(entity); }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);
      const [rows] = await db.query(sql, params);
      rows.forEach(r => {
        try { r.diff = r.diff ? JSON.parse(r.diff) : null; } catch(_) { r.diff = null; }
      });
      res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/history/:entity/:id
  router.get('/:entity/:id', async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT * FROM audit_log WHERE entity=? AND entity_id=? ORDER BY created_at DESC LIMIT 30',
        [req.params.entity, req.params.id]
      );
      rows.forEach(r => {
        try { r.diff = r.diff ? JSON.parse(r.diff) : null; } catch(_) { r.diff = null; }
      });
      res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { logAction, setupRoutes };
