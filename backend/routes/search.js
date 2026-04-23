/**
 * search.js — Recherche globale PrintFlow
 * Cherche en parallèle dans impressions, filaments, projets, bibliothèque, devis
 */

const router = require('express').Router();
const db     = require('../db');

// GET /api/search?q=terme
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });

    const like = '%' + q + '%';

    const [prints, filaments, projects, library, quotes] = await Promise.all([
      // Impressions
      db.query(`
        SELECT p.id, p.name, p.status, p.created_at,
               pr.name AS printer_name, f.name AS filament_name
        FROM prints p
        LEFT JOIN printers pr ON pr.id = p.printer_id
        LEFT JOIN filaments f  ON f.id  = p.filament_id
        WHERE p.name LIKE ? OR p.file_name LIKE ? OR p.notes LIKE ?
        ORDER BY p.created_at DESC LIMIT 5
      `, [like, like, like]),

      // Filaments
      db.query(`
        SELECT id, name, brand, material, color_hex, color_name,
               weight_remaining, archived
        FROM filaments
        WHERE name LIKE ? OR brand LIKE ? OR material LIKE ? OR color_name LIKE ?
        ORDER BY archived ASC, name ASC LIMIT 5
      `, [like, like, like, like]),

      // Projets
      db.query(`
        SELECT id, name, code, description, status
        FROM projects
        WHERE name LIKE ? OR code LIKE ? OR description LIKE ?
        ORDER BY created_at DESC LIMIT 4
      `, [like, like, like]),

      // Bibliothèque
      db.query(`
        SELECT id, name, description, tags
        FROM library_objects
        WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?
        ORDER BY created_at DESC LIMIT 4
      `, [like, like, like]),

      // Devis
      db.query(`
        SELECT id, client_name, description, total_ht, status
        FROM quotes
        WHERE client_name LIKE ? OR description LIKE ? OR notes LIKE ?
        ORDER BY created_at DESC LIMIT 4
      `, [like, like, like]).catch(() => [[]]), // graceful si table absente
    ]);

    const results = [];

    if (prints[0].length) {
      results.push({
        category: 'prints',
        label:    'Impressions',
        icon:     '🖨',
        items:    prints[0].map(function(p) {
          return {
            id:       p.id,
            title:    p.name,
            sub:      [p.printer_name, p.filament_name, p.status].filter(Boolean).join(' · '),
            status:   p.status,
            action:   'openPrintDetail',
          };
        }),
      });
    }

    if (filaments[0].length) {
      results.push({
        category: 'filaments',
        label:    'Filaments',
        icon:     '🧵',
        items:    filaments[0].map(function(f) {
          return {
            id:       f.id,
            title:    f.name,
            sub:      [f.brand, f.material, f.color_name].filter(Boolean).join(' · '),
            color:    f.color_hex,
            archived: f.archived,
            action:   'openFilamentDetail',
          };
        }),
      });
    }

    if (projects[0].length) {
      results.push({
        category: 'projects',
        label:    'Projets',
        icon:     '📁',
        items:    projects[0].map(function(p) {
          return {
            id:     p.id,
            title:  p.name,
            sub:    [p.code, p.description].filter(Boolean).join(' · '),
            status: p.status,
            action: 'openProjectDetail',
          };
        }),
      });
    }

    if (library[0].length) {
      results.push({
        category: 'library',
        label:    'Bibliothèque',
        icon:     '📚',
        items:    library[0].map(function(o) {
          return {
            id:    o.id,
            title: o.name,
            sub:   o.tags || null,
            action:'openLibraryDetail',
          };
        }),
      });
    }

    if (quotes[0].length) {
      results.push({
        category: 'quotes',
        label:    'Devis',
        icon:     '📄',
        items:    quotes[0].map(function(q) {
          return {
            id:    q.id,
            title: q.client_name,
            sub:   [q.description, q.total_ht ? parseFloat(q.total_ht).toFixed(2) + ' €' : null].filter(Boolean).join(' · '),
            status:q.status,
            action:'openQuoteDetail',
          };
        }),
      });
    }

    res.json({ results, query: q });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
