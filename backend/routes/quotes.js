/**
 * quotes.js — Devis client PrintFlow-3D (multi-lignes v2.6.0)
 * Structure : quotes (entête) + quote_items (lignes)
 */

const router = require('express').Router();
const db     = require('../db');

// ── Calcul coût d'une ligne ───────────────────────────────────────────────

async function calcItemCosts(filament_g, print_time_h, filament_id, printer_id, margin_pct) {
  let filament_price = 0, power_w = 0, electricity_rate = 0.20;

  if (filament_id) {
    const [[f]] = await db.query('SELECT price FROM filaments WHERE id=?', [filament_id]);
    filament_price = parseFloat(f?.price || 0);
  }
  if (printer_id) {
    const [[p]] = await db.query('SELECT power_consumption FROM printers WHERE id=?', [printer_id]);
    power_w = parseFloat(p?.power_consumption || 0);
  }
  const [[elec]] = await db.query("SELECT value FROM settings WHERE key_name='quote_electricity_rate'");
  electricity_rate = parseFloat(elec?.value || 0.20);

  const filament_cost    = (parseFloat(filament_g) / 1000) * filament_price;
  const electricity_cost = parseFloat(print_time_h) * (power_w / 1000) * electricity_rate;
  const base_cost        = filament_cost + electricity_cost;
  const unit_price       = base_cost * (1 + parseFloat(margin_pct || 20) / 100);

  return {
    filament_cost:    Math.round(filament_cost    * 100) / 100,
    electricity_cost: Math.round(electricity_cost * 100) / 100,
    base_cost:        Math.round(base_cost        * 100) / 100,
    unit_price:       Math.round(unit_price       * 100) / 100,
    filament_price, power_w, electricity_rate,
  };
}

async function recalcQuoteTotal(quoteId) {
  const [items] = await db.query(
    'SELECT qty, unit_price FROM quote_items WHERE quote_id=?', [quoteId]
  );
  const total = items.reduce(function(s, i) {
    return s + (parseFloat(i.qty) * parseFloat(i.unit_price));
  }, 0);
  const rounded = Math.round(total * 100) / 100;
  await db.query('UPDATE quotes SET total_ht=? WHERE id=?', [rounded, quoteId]);
  return rounded;
}

// ── GET /api/quotes ───────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const [quotes] = await db.query(`
      SELECT q.*,
        COUNT(qi.id)  AS item_count,
        SUM(qi.qty)   AS total_qty,
        COALESCE(SUM(qi.qty * qi.unit_price), 0) AS total_ht_calc
      FROM quotes q
      LEFT JOIN quote_items qi ON qi.quote_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);
    res.json(quotes);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/quotes/:id ───────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const [[q]] = await db.query('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Devis non trouvé' });
    const [items] = await db.query(`
      SELECT qi.*,
        f.name AS filament_name, f.material, f.color_hex, f.price AS filament_price,
        p.name AS printer_name,  p.power_consumption,
        pr.name AS print_name,   pr.filament_used AS real_filament_g,
        pr.actual_duration AS real_duration_min,
        pr.status AS print_status, pr.finished_at
      FROM quote_items qi
      LEFT JOIN filaments f  ON f.id  = qi.filament_id
      LEFT JOIN printers  p  ON p.id  = qi.printer_id
      LEFT JOIN prints    pr ON pr.id = qi.print_id
      WHERE qi.quote_id=?
      ORDER BY qi.sort_order, qi.id
    `, [req.params.id]);
    res.json({ ...q, items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/quotes/calculate ────────────────────────────────────────────

router.post('/calculate', async (req, res) => {
  try {
    const { filament_g, print_time_h, filament_id, printer_id, margin_pct, qty } = req.body;
    const costs = await calcItemCosts(filament_g || 0, print_time_h || 0,
      filament_id || null, printer_id || null, margin_pct || 20);
    const line_total = Math.round(costs.unit_price * (parseInt(qty) || 1) * 100) / 100;
    res.json({ ...costs, line_total });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/quotes ──────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { client_name, client_email, notes, status, margin_pct } = req.body;
    if (!client_name) return res.status(400).json({ error: 'Nom client requis' });
    const [result] = await db.query(
      'INSERT INTO quotes (client_name, client_email, notes, status, margin_pct, total_ht) VALUES (?,?,?,?,?,0)',
      [client_name, client_email || null, notes || null, status || 'draft', margin_pct || 20]
    );
    const [[q]] = await db.query('SELECT * FROM quotes WHERE id=?', [result.insertId]);
    res.json({ ...q, items: [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/quotes/:id ───────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const { client_name, client_email, notes, status, margin_pct } = req.body;
    const [[prev]] = await db.query('SELECT margin_pct FROM quotes WHERE id=?', [req.params.id]);
    await db.query(
      'UPDATE quotes SET client_name=?, client_email=?, notes=?, status=?, margin_pct=? WHERE id=?',
      [client_name, client_email || null, notes || null, status || 'draft', margin_pct || 20, req.params.id]
    );
    // Si la marge a changé, recalculer toutes les lignes
    if (prev && parseFloat(prev.margin_pct) !== parseFloat(margin_pct)) {
      const [items] = await db.query(
        'SELECT id, filament_g, print_time_h, filament_id, printer_id FROM quote_items WHERE quote_id=?',
        [req.params.id]
      );
      for (const item of items) {
        const costs = await calcItemCosts(item.filament_g, item.print_time_h,
          item.filament_id, item.printer_id, margin_pct);
        await db.query(
          'UPDATE quote_items SET filament_cost=?, electricity_cost=?, unit_price=? WHERE id=?',
          [costs.filament_cost, costs.electricity_cost, costs.unit_price, item.id]
        );
      }
      await recalcQuoteTotal(req.params.id);
    }
    const [[q]] = await db.query('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    const [items] = await db.query(
      'SELECT qi.*, f.name AS filament_name, p.name AS printer_name FROM quote_items qi LEFT JOIN filaments f ON f.id=qi.filament_id LEFT JOIN printers p ON p.id=qi.printer_id WHERE qi.quote_id=? ORDER BY qi.sort_order, qi.id',
      [req.params.id]
    );
    res.json({ ...q, items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/quotes/:id/items ────────────────────────────────────────────

router.post('/:id/items', async (req, res) => {
  try {
    const { designation, qty, print_time_h, filament_g, filament_id, printer_id } = req.body;
    if (!designation) return res.status(400).json({ error: 'Désignation requise' });
    const [[q]] = await db.query('SELECT margin_pct FROM quotes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Devis non trouvé' });
    const costs = await calcItemCosts(filament_g || 0, print_time_h || 0,
      filament_id || null, printer_id || null, q.margin_pct);
    const [[maxSort]] = await db.query(
      'SELECT COALESCE(MAX(sort_order),0) AS m FROM quote_items WHERE quote_id=?', [req.params.id]
    );
    const [result] = await db.query(`
      INSERT INTO quote_items
        (quote_id, designation, qty, print_time_h, filament_g, filament_id, printer_id,
         filament_cost, electricity_cost, unit_price, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `, [req.params.id, designation, qty || 1, print_time_h || 0, filament_g || 0,
        filament_id || null, printer_id || null,
        costs.filament_cost, costs.electricity_cost, costs.unit_price,
        (maxSort.m || 0) + 1]);
    await recalcQuoteTotal(req.params.id);
    const [[item]] = await db.query(
      'SELECT qi.*, f.name AS filament_name, p.name AS printer_name FROM quote_items qi LEFT JOIN filaments f ON f.id=qi.filament_id LEFT JOIN printers p ON p.id=qi.printer_id WHERE qi.id=?',
      [result.insertId]
    );
    res.json(item);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/quotes/:id/items/:itemId ────────────────────────────────────

router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { designation, qty, print_time_h, filament_g, filament_id, printer_id } = req.body;
    const [[q]] = await db.query('SELECT margin_pct FROM quotes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Devis non trouvé' });
    const costs = await calcItemCosts(filament_g || 0, print_time_h || 0,
      filament_id || null, printer_id || null, q.margin_pct);
    await db.query(`
      UPDATE quote_items SET
        designation=?, qty=?, print_time_h=?, filament_g=?,
        filament_id=?, printer_id=?,
        filament_cost=?, electricity_cost=?, unit_price=?
      WHERE id=? AND quote_id=?
    `, [designation, qty || 1, print_time_h || 0, filament_g || 0,
        filament_id || null, printer_id || null,
        costs.filament_cost, costs.electricity_cost, costs.unit_price,
        req.params.itemId, req.params.id]);
    await recalcQuoteTotal(req.params.id);
    const [[item]] = await db.query(
      'SELECT qi.*, f.name AS filament_name, p.name AS printer_name FROM quote_items qi LEFT JOIN filaments f ON f.id=qi.filament_id LEFT JOIN printers p ON p.id=qi.printer_id WHERE qi.id=?',
      [req.params.itemId]
    );
    res.json(item);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/quotes/:id/items/:itemId ──────────────────────────────────

router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    await db.query('DELETE FROM quote_items WHERE id=? AND quote_id=?',
      [req.params.itemId, req.params.id]);
    await recalcQuoteTotal(req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/quotes/:id/items/:itemId/link — lier une impression ────────

router.patch('/:id/items/:itemId/link', async (req, res) => {
  try {
    const { print_id } = req.body;

    // Vérifier que l'impression existe si fournie
    if (print_id) {
      const [[p]] = await db.query('SELECT id, name FROM prints WHERE id=?', [print_id]);
      if (!p) return res.status(404).json({ error: 'Impression non trouvée' });
    }

    await db.query(
      'UPDATE quote_items SET print_id=? WHERE id=? AND quote_id=?',
      [print_id || null, req.params.itemId, req.params.id]
    );

    // Retourner les infos de rentabilité
    const [[item]] = await db.query(`
      SELECT qi.*,
        f.name AS filament_name, f.price AS filament_price,
        p.name AS printer_name,  p.power_consumption,
        pr.name AS print_name,   pr.filament_used AS real_filament_g,
        pr.actual_duration AS real_duration_min,
        pr.status AS print_status,
        pr.finished_at
      FROM quote_items qi
      LEFT JOIN filaments f  ON f.id  = qi.filament_id
      LEFT JOIN printers  p  ON p.id  = qi.printer_id
      LEFT JOIN prints    pr ON pr.id = qi.print_id
      WHERE qi.id=?
    `, [req.params.itemId]);

    res.json(item);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/quotes/:id/profitability — rentabilité globale du devis ──────

router.get('/:id/profitability', async (req, res) => {
  try {
    const [[q]] = await db.query('SELECT * FROM quotes WHERE id=?', [req.params.id]);
    if (!q) return res.status(404).json({ error: 'Devis non trouvé' });

    const [[elec]] = await db.query("SELECT value FROM settings WHERE key_name='quote_electricity_rate'");
    const electricity_rate = parseFloat(elec?.value || 0.20);

    const [items] = await db.query(`
      SELECT qi.*,
        f.price AS filament_price,
        p.power_consumption,
        pr.filament_used AS real_filament_g,
        pr.actual_duration AS real_duration_min
      FROM quote_items qi
      LEFT JOIN filaments f  ON f.id  = qi.filament_id
      LEFT JOIN printers  p  ON p.id  = qi.printer_id
      LEFT JOIN prints    pr ON pr.id = qi.print_id
      WHERE qi.quote_id=?
    `, [req.params.id]);

    let total_estimated = 0, total_real_cost = 0, linked = 0;

    const itemsWithProfit = items.map(function(item) {
      const estimated = parseFloat(item.qty) * parseFloat(item.unit_price || 0);
      total_estimated += estimated;

      let real_cost = null, margin_real = null, margin_pct_real = null;

      if (item.print_id && item.real_filament_g !== null) {
        const fil_cost  = (parseFloat(item.real_filament_g) / 1000) * parseFloat(item.filament_price || 0);
        const elec_cost = (parseFloat(item.real_duration_min || 0) / 60) *
          (parseFloat(item.power_consumption || 0) / 1000) * electricity_rate;
        real_cost       = Math.round((fil_cost + elec_cost) * 100) / 100;
        margin_real     = Math.round((estimated - real_cost) * 100) / 100;
        margin_pct_real = real_cost > 0
          ? Math.round((margin_real / estimated) * 100 * 10) / 10
          : null;
        total_real_cost += real_cost;
        linked++;
      }

      return { ...item, estimated, real_cost, margin_real, margin_pct_real };
    });

    res.json({
      quote_id:        q.id,
      client_name:     q.client_name,
      total_estimated: Math.round(total_estimated * 100) / 100,
      total_real_cost: Math.round(total_real_cost * 100) / 100,
      total_margin:    Math.round((total_estimated - total_real_cost) * 100) / 100,
      linked_count:    linked,
      total_count:     items.length,
      items:           itemsWithProfit,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/quotes/:id ────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM quotes WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
