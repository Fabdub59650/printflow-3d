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
    // Consommation par filament avec taux de réussite
    const [byFilament] = await db.query(`
      SELECT
        f.id, f.name, f.material, f.color_hex, f.color_name, f.brand,
        f.weight_total, f.weight_remaining, f.diameter,
        COUNT(p.id)                                          AS total_prints,
        SUM(p.status='done')                                 AS success_prints,
        SUM(p.status='failed')                               AS failed_prints,
        COALESCE(SUM(p.filament_used),0)                    AS total_used_g,
        COALESCE(SUM(CASE WHEN p.status='done' THEN p.filament_used END),0) AS used_success_g,
        COALESCE(SUM(p.actual_duration),0)                  AS total_minutes,
        COALESCE(AVG(CASE WHEN p.status='done' THEN p.filament_used END),0) AS avg_used_per_print,
        MIN(p.created_at)                                    AS first_use,
        MAX(p.created_at)                                    AS last_use
      FROM filaments f
      LEFT JOIN prints p ON p.filament_id = f.id
      WHERE f.archived = 0
      GROUP BY f.id
      ORDER BY total_used_g DESC`);

    // Consommation mensuelle par matière
    const [monthlyByMaterial] = await db.query(`
      SELECT
        DATE_FORMAT(p.created_at,'%Y-%m') AS month,
        f.material,
        SUM(p.filament_used)              AS grams,
        COUNT(p.id)                       AS prints
      FROM prints p
      JOIN filaments f ON p.filament_id = f.id
      WHERE p.status = 'done' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month, f.material
      ORDER BY month ASC`);

    // Top filaments par nombre d'impressions
    const [topUsed] = await db.query(`
      SELECT f.id, f.name, f.material, f.color_hex,
             COUNT(p.id) AS print_count,
             COALESCE(SUM(p.filament_used),0) AS total_g
      FROM filaments f
      JOIN prints p ON p.filament_id = f.id
      WHERE p.status = 'done'
      GROUP BY f.id ORDER BY print_count DESC LIMIT 10`);

    // Pesées par filament (dernière + historique count)
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

    // Enrichir byFilament avec les données de pesée
    byFilament.forEach(f => {
      f.weighing = weighingMap[f.id] || null;
    });

    res.json({ byFilament, monthlyByMaterial, topUsed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats/consumption — consommation par matière sur N jours
router.get('/consumption', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const [byMaterial] = await db.query(`
      SELECT f.material, SUM(p.filament_used) AS total_g,
             COUNT(p.id) AS print_count,
             SUM(CASE WHEN p.status='success' THEN p.filament_used ELSE 0 END) AS success_g
      FROM prints p
      JOIN filaments f ON f.id = p.filament_id
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND p.filament_used IS NOT NULL AND p.filament_used > 0
      GROUP BY f.material ORDER BY total_g DESC
    `, [days]);

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

module.exports = router;