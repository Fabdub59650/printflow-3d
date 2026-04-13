/**
 * quotes.js — Devis client PrintFlow-3D
 * Calcul : coût matière + électricité + marge %
 */

const router = require('express').Router();
const db     = require('../db');

// ── Calculer les coûts ────────────────────────────────────────────────────
function calcCosts(filament_g, print_time_h, filament_price_per_kg, power_w, electricity_rate, margin_pct) {
  const filament_cost    = (parseFloat(filament_g) / 1000) * parseFloat(filament_price_per_kg || 0);
  const electricity_cost = parseFloat(print_time_h) * (parseFloat(power_w || 0) / 1000) * parseFloat(electricity_rate || 0.20);
  const base_cost        = filament_cost + electricity_cost;
  const margin_amount    = base_cost * (parseFloat(margin_pct) / 100);
  const total_ht         = base_cost + margin_amount;
  return {
    filament_cost:    Math.round(filament_cost * 100) / 100,
    electricity_cost: Math.round(electricity_cost * 100) / 100,
    base_cost:        Math.round(base_cost * 100) / 100,
    margin_amount:    Math.round(margin_amount * 100) / 100,
    total_ht:         Math.round(total_ht * 100) / 100,
  };
}

// GET /api/quotes — liste
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT q.*, f.name AS filament_name, f.material, f.color_hex,
             pr.name AS printer_name
      FROM quotes q
      LEFT JOIN filaments f  ON f.id = q.filament_id
      LEFT JOIN printers  pr ON pr.id = q.printer_id
      ORDER BY q.created_at DESC
    `);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/quotes/:id
router.get('/:id', async (req, res) => {
  try {
    const [[q]] = await db.query(`
      SELECT q.*, f.name AS filament_name, f.material, f.color_hex, f.price AS filament_price,
             pr.name AS printer_name, pr.power_consumption
      FROM quotes q
      LEFT JOIN filaments f  ON f.id = q.filament_id
      LEFT JOIN printers  pr ON pr.id = q.printer_id
      WHERE q.id=?
    `, [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Devis non trouvé' });
    res.json(q);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/quotes/calculate — calcul à la volée sans sauvegarder
router.post('/calculate', async (req, res) => {
  try {
    const { filament_g, print_time_h, filament_id, printer_id, margin_pct } = req.body;

    // Récupérer le prix du filament
    let filament_price = 0;
    if (filament_id) {
      const [[f]] = await db.query('SELECT price FROM filaments WHERE id=?', [filament_id]);
      filament_price = parseFloat(f?.price || 0);
    }

    // Récupérer la puissance de l'imprimante
    let power_w = 0;
    if (printer_id) {
      const [[p]] = await db.query('SELECT power_consumption FROM printers WHERE id=?', [printer_id]);
      power_w = parseFloat(p?.power_consumption || 0);
    }

    // Récupérer le tarif électricité
    const [[elec]] = await db.query("SELECT value FROM settings WHERE key_name='quote_electricity_rate'");
    const electricity_rate = parseFloat(elec?.value || 0.20);

    const costs = calcCosts(filament_g || 0, print_time_h || 0, filament_price, power_w, electricity_rate, margin_pct || 20);
    res.json({ ...costs, filament_price, power_w, electricity_rate });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/quotes — créer
router.post('/', async (req, res) => {
  try {
    const {
      client_name, client_email, description, notes, status,
      filament_g, print_time_h, filament_id, printer_id, margin_pct,
      filament_cost, electricity_cost, total_ht
    } = req.body;
    if (!client_name) return res.status(400).json({ error: 'Nom client requis' });

    const [result] = await db.query(`
      INSERT INTO quotes
        (client_name, client_email, description, notes, status,
         filament_g, print_time_h, filament_id, printer_id, margin_pct,
         filament_cost, electricity_cost, total_ht)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [client_name, client_email||null, description||null, notes||null, status||'draft',
        filament_g||0, print_time_h||0, filament_id||null, printer_id||null, margin_pct||20,
        filament_cost||0, electricity_cost||0, total_ht||0]);

    const [[q]] = await db.query('SELECT * FROM quotes WHERE id=?', [result.insertId]);
    res.json(q);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/quotes/:id — modifier
router.put('/:id', async (req, res) => {
  try {
    const {
      client_name, client_email, description, notes, status,
      filament_g, print_time_h, filament_id, printer_id, margin_pct,
      filament_cost, electricity_cost, total_ht
    } = req.body;
    await db.query(`
      UPDATE quotes SET
        client_name=?, client_email=?, description=?, notes=?, status=?,
        filament_g=?, print_time_h=?, filament_id=?, printer_id=?, margin_pct=?,
        filament_cost=?, electricity_cost=?, total_ht=?
      WHERE id=?
    `, [client_name, client_email||null, description||null, notes||null, status||'draft',
        filament_g||0, print_time_h||0, filament_id||null, printer_id||null, margin_pct||20,
        filament_cost||0, electricity_cost||0, total_ht||0, req.params.id]);
    const [[q]] = await db.query('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    res.json(q);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/quotes/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM quotes WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
