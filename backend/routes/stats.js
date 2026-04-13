const router = require('express').Router();
const db     = require('../db');

// GET /api/stats — statistiques globales
router.get('/', async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*) as total_prints,
        SUM(CASE WHEN status='done'     THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status='failed'   THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status='printing' THEN 1 ELSE 0 END) as active,
        SUM(actual_duration)  as total_minutes,
        SUM(filament_used)    as total_grams
      FROM prints`);

    const [byMaterial] = await db.query(`
      SELECT f.material, SUM(p.filament_used) as grams, COUNT(p.id) as count
      FROM prints p JOIN filaments f ON p.filament_id=f.id
      WHERE p.status='done'
      GROUP BY f.material ORDER BY grams DESC`);

    const [byMonth] = await db.query(`
      SELECT DATE_FORMAT(created_at,'%Y-%m') as month, COUNT(*) as count,
             SUM(filament_used) as grams
      FROM prints WHERE status IN ('done','failed')
      GROUP BY month ORDER BY month DESC LIMIT 12`);

    const [byPrinter] = await db.query(`
      SELECT p.id, p.name, p.total_prints, p.total_success,
             p.total_hours, p.total_grams, p.status
      FROM printers p ORDER BY p.total_prints DESC`);

    const [lowStock] = await db.query(`
      SELECT * FROM filaments
      WHERE archived=0 AND weight_remaining < (weight_total * 0.20)
      ORDER BY (weight_remaining/weight_total)`);

    const [[printerCount]]  = await db.query('SELECT COUNT(*) as c FROM printers');
    const [[filamentCount]] = await db.query('SELECT COUNT(*) as c FROM filaments WHERE archived=0');

    res.json({
      totals: { ...totals, printer_count: printerCount.c, filament_count: filamentCount.c },
      byMaterial,
      byMonth: byMonth.reverse(),
      byPrinter,
      lowStock
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats/filaments — statistiques avancées par filament
router.get('/filaments', async (req, res) => {
  try {
    // Consommation par filament — union de prints mono et print_filaments multi
    // On utilise une UNION pour couvrir les deux cas :
    // 1. Impressions sans entrées dans print_filaments (ancien format mono)
    // 2. Entrées dans print_filaments (nouveau format multi)
    const [byFilament] = await db.query(`
      SELECT
        f.id, f.name, f.material, f.color_hex, f.color_name, f.brand,
        f.weight_total, f.weight_remaining, f.diameter,
        COUNT(DISTINCT src.print_id)                              AS total_prints,
        SUM(src.status='done')                                    AS success_prints,
        SUM(src.status='failed')                                  AS failed_prints,
        COALESCE(SUM(src.used_g), 0)                             AS total_used_g,
        COALESCE(SUM(CASE WHEN src.status='done' THEN src.used_g END), 0) AS used_success_g,
        COALESCE(SUM(CASE WHEN src.status='done' THEN src.duration END), 0) AS total_minutes,
        COALESCE(AVG(CASE WHEN src.status='done' THEN src.used_g END), 0)  AS avg_used_per_print,
        MIN(src.created_at) AS first_use,
        MAX(src.created_at) AS last_use
      FROM filaments f
      LEFT JOIN (
        -- Impressions multi-filament (print_filaments)
        SELECT
          pf.filament_id,
          pf.print_id,
          p.status,
          pf.quantity_actual   AS used_g,
          p.actual_duration    AS duration,
          p.created_at
        FROM print_filaments pf
        JOIN prints p ON p.id = pf.print_id

        UNION ALL

        -- Impressions mono-filament (pas d'entrée dans print_filaments)
        SELECT
          p.filament_id,
          p.id AS print_id,
          p.status,
          p.filament_used      AS used_g,
          p.actual_duration    AS duration,
          p.created_at
        FROM prints p
        WHERE p.filament_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id = p.id)
      ) src ON src.filament_id = f.id
      WHERE f.archived = 0
      GROUP BY f.id
      ORDER BY total_used_g DESC`);

    // Consommation mensuelle par matière — idem union
    const [monthlyByMaterial] = await db.query(`
      SELECT
        DATE_FORMAT(src.created_at,'%Y-%m') AS month,
        f.material,
        SUM(src.used_g)  AS grams,
        COUNT(DISTINCT src.print_id) AS prints
      FROM (
        SELECT pf.filament_id, pf.print_id, pf.quantity_actual AS used_g, p.created_at
        FROM print_filaments pf JOIN prints p ON p.id = pf.print_id WHERE p.status='done'
        UNION ALL
        SELECT p.filament_id, p.id, p.filament_used, p.created_at
        FROM prints p
        WHERE p.status='done' AND p.filament_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id = p.id)
      ) src
      JOIN filaments f ON f.id = src.filament_id
      WHERE src.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month, f.material
      ORDER BY month ASC`);

    // Top filaments — idem union
    const [topUsed] = await db.query(`
      SELECT f.id, f.name, f.material, f.color_hex,
             COUNT(DISTINCT src.print_id) AS print_count,
             COALESCE(SUM(src.used_g), 0) AS total_g
      FROM (
        SELECT pf.filament_id, pf.print_id, pf.quantity_actual AS used_g
        FROM print_filaments pf JOIN prints p ON p.id = pf.print_id WHERE p.status='done'
        UNION ALL
        SELECT p.filament_id, p.id, p.filament_used
        FROM prints p
        WHERE p.status='done' AND p.filament_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id = p.id)
      ) src
      JOIN filaments f ON f.id = src.filament_id
      GROUP BY f.id ORDER BY print_count DESC LIMIT 10`);

    // Pesées par filament
    const [weighingStats] = await db.query(`
      SELECT
        filament_id,
        COUNT(*)          AS weighing_count,
        MAX(created_at)   AS last_weighing,
        MIN(net_weight)   AS min_weight_seen,
        MAX(net_weight)   AS max_weight_seen
      FROM filament_weighings
      GROUP BY filament_id`);

    const weighingMap = {};
    weighingStats.forEach(w => { weighingMap[w.filament_id] = w; });
    byFilament.forEach(f => { f.weighing = weighingMap[f.id] || null; });

    res.json({ byFilament, monthlyByMaterial, topUsed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats/consumption — consommation par matière sur N jours
router.get('/consumption', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const [byMaterial] = await db.query(`
      SELECT f.material,
             SUM(src.used_g)             AS total_g,
             COUNT(DISTINCT src.print_id) AS print_count,
             0                            AS success_g
      FROM (
        SELECT pf.filament_id, pf.print_id, pf.quantity_actual AS used_g, p.created_at
        FROM print_filaments pf JOIN prints p ON p.id = pf.print_id
        WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND pf.quantity_actual IS NOT NULL AND pf.quantity_actual > 0
        UNION ALL
        SELECT p.filament_id, p.id, p.filament_used, p.created_at
        FROM prints p
        WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND p.filament_used IS NOT NULL AND p.filament_used > 0
          AND p.filament_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM print_filaments pf2 WHERE pf2.print_id = p.id)
      ) src
      JOIN filaments f ON f.id = src.filament_id
      GROUP BY f.material ORDER BY total_g DESC
    `, [days, days]);

    const [byDay] = await db.query(`
      SELECT DATE(p.created_at) AS day, SUM(p.filament_used) AS total_g,
             COUNT(p.id) AS print_count
      FROM prints p
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND p.filament_used IS NOT NULL AND p.filament_used > 0
      GROUP BY DATE(p.created_at) ORDER BY day ASC
    `, [days]);

    const [byMonth] = await db.query(`
      SELECT f.material,
             SUM(CASE WHEN MONTH(p.created_at)=MONTH(NOW()) AND YEAR(p.created_at)=YEAR(NOW())
                      THEN p.filament_used ELSE 0 END) AS this_month_g,
             SUM(p.filament_used) AS period_g
      FROM prints p
      JOIN filaments f ON f.id = p.filament_id
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND p.filament_used IS NOT NULL AND p.filament_used > 0
      GROUP BY f.material ORDER BY this_month_g DESC
    `, [days]);

    res.json({ byMaterial, byDay, byMonth, days });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats/maintenance-alerts — maintenances à venir
router.get('/maintenance-alerts', async (req, res) => {
  try {
    const [[setting]] = await db.query(
      "SELECT value FROM settings WHERE key_name='maintenance_alert_days'"
    );
    const days = parseInt(setting?.value) || 30;
    const [rows] = await db.query(`
      SELECT m.*, p.name AS printer_name,
             DATEDIFF(m.next_due, CURDATE()) AS days_until
      FROM maintenance m
      LEFT JOIN printers p ON p.id = m.printer_id
      WHERE m.next_due IS NOT NULL
        AND DATEDIFF(m.next_due, CURDATE()) <= ?
      ORDER BY m.next_due ASC
    `, [days]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats/prints — durée estimée vs réelle + tendance
router.get('/prints', async (req, res) => {
  try {
    // Durée estimée vs réelle par impression (50 dernières avec les deux valeurs)
    const [durations] = await db.query(`
      SELECT p.id, p.name, p.estimated_duration, p.actual_duration,
             p.status, p.created_at,
             ROUND((p.actual_duration - p.estimated_duration) / NULLIF(p.estimated_duration,0) * 100) AS ecart_pct
      FROM prints p
      WHERE p.estimated_duration > 0 AND p.actual_duration > 0
      ORDER BY p.created_at DESC LIMIT 50
    `);

    // Tendance globale : moyenne des écarts
    const [trend] = await db.query(`
      SELECT
        COUNT(*) AS total,
        ROUND(AVG(actual_duration)) AS avg_actual,
        ROUND(AVG(estimated_duration)) AS avg_estimated,
        ROUND(AVG((actual_duration - estimated_duration) / NULLIF(estimated_duration,0) * 100)) AS avg_ecart_pct,
        SUM(actual_duration > estimated_duration * 1.1) AS over_count,
        SUM(actual_duration < estimated_duration * 0.9) AS under_count
      FROM prints
      WHERE estimated_duration > 0 AND actual_duration > 0
    `);

    // Taux de réussite par imprimante
    const [byPrinter] = await db.query(`
      SELECT pr.name AS printer_name, pr.id AS printer_id,
             COUNT(p.id) AS total,
             SUM(p.status='done') AS success,
             SUM(p.status='failed') AS failed,
             ROUND(SUM(p.status='done') / COUNT(p.id) * 100) AS success_rate,
             ROUND(AVG(p.actual_duration)) AS avg_duration,
             ROUND(AVG(p.filament_used)) AS avg_filament_g
      FROM printers pr
      LEFT JOIN prints p ON p.printer_id = pr.id
      GROUP BY pr.id, pr.name
      HAVING total > 0
      ORDER BY success_rate DESC, total DESC
    `);

    // Taux de réussite par filament
    const [byFilament] = await db.query(`
      SELECT f.name AS filament_name, f.id AS filament_id,
             f.color_hex, f.material,
             COUNT(p.id) AS total,
             SUM(p.status='done') AS success,
             SUM(p.status='failed') AS failed,
             ROUND(SUM(p.status='done') / COUNT(p.id) * 100) AS success_rate,
             ROUND(AVG(p.filament_used)) AS avg_g
      FROM filaments f
      LEFT JOIN prints p ON p.filament_id = f.id
      GROUP BY f.id, f.name, f.color_hex, f.material
      HAVING total > 0
      ORDER BY success_rate DESC, total DESC
      LIMIT 15
    `);

    res.json({
      durations: durations,
      trend: trend[0] || {},
      byPrinter: byPrinter,
      byFilament: byFilament,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// GET /api/stats/activity — activité sur 12 mois (graphique GitHub)
router.get('/activity', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS count,
             SUM(status='done') AS success, SUM(status='failed') AS failed
      FROM prints
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);
    // Construire une map date → données
    const map = {};
    rows.forEach(r => { map[r.day] = { count: parseInt(r.count), success: parseInt(r.success), failed: parseInt(r.failed) }; });
    res.json(map);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats/costs — coûts filament + électricité
router.get('/costs', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Récupérer le prix kWh depuis les settings
    const [[kwh_setting]] = await db.query(
      "SELECT value FROM settings WHERE key_name='electricity_price_kwh'"
    ).catch(() => [[{ value: '0.20' }]]);
    const kwh_price = parseFloat(kwh_setting?.value || '0.20');

    // Coûts par impression
    const [prints] = await db.query(`
      SELECT p.id, p.name, p.created_at, p.status,
             p.filament_used, p.actual_duration,
             f.price AS filament_price_kg, f.name AS filament_name, f.material,
             pr.power_consumption,
             -- Coût filament : (grammes / 1000) * prix/kg
             ROUND(COALESCE(p.filament_used, 0) / 1000 * COALESCE(f.price, 0), 3) AS cost_filament,
             -- Coût électricité : (watts * heures / 1000) * prix_kwh
             ROUND(COALESCE(pr.power_consumption, 0) * COALESCE(p.actual_duration, 0) / 60 / 1000 * ?, 3) AS cost_electricity
      FROM prints p
      LEFT JOIN filaments f ON f.id = p.filament_id
      LEFT JOIN printers pr ON pr.id = p.printer_id
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND p.status = 'done'
      ORDER BY p.created_at DESC
    `, [kwh_price, days]);

    // Totaux
    const totals = prints.reduce((acc, p) => {
      acc.filament   += parseFloat(p.cost_filament   || 0);
      acc.electricity+= parseFloat(p.cost_electricity|| 0);
      acc.filament_g += parseFloat(p.filament_used   || 0);
      return acc;
    }, { filament: 0, electricity: 0, filament_g: 0 });
    totals.total = totals.filament + totals.electricity;

    // Coûts par matière
    const byMaterial = {};
    prints.forEach(p => {
      const mat = p.material || 'Inconnu';
      if (!byMaterial[mat]) byMaterial[mat] = { filament: 0, electricity: 0, count: 0 };
      byMaterial[mat].filament    += parseFloat(p.cost_filament    || 0);
      byMaterial[mat].electricity += parseFloat(p.cost_electricity || 0);
      byMaterial[mat].count++;
    });

    res.json({ prints, totals, byMaterial, kwh_price, days });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;