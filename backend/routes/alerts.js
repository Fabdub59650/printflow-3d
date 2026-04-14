/**
 * alerts.js — Alertes anticipées fin de bobine
 * Prend en compte les filaments principaux ET multi-filaments (print_filaments)
 */

const router = require('express').Router();
const db     = require('../db');

router.get('/bobines', async (req, res) => {
  try {
    // 1. Impressions planifiées — filament principal
    const [mainFilaments] = await db.query(`
      SELECT
        p.id, p.name, p.planned_at, p.estimated_duration,
        p.filament_id, p.filament_used AS quantity_estimated,
        f.name AS filament_name, f.color_hex, f.material, f.weight_remaining,
        pr.name AS printer_name,
        'main' AS source
      FROM prints p
      JOIN filaments f ON f.id = p.filament_id
      LEFT JOIN printers pr ON pr.id = p.printer_id
      WHERE p.status = 'planned' AND p.filament_id IS NOT NULL
    `);

    // 2. Impressions planifiées — multi-filaments (print_filaments)
    const [multiFilaments] = await db.query(`
      SELECT
        p.id, p.name, p.planned_at, p.estimated_duration,
        pf.filament_id, pf.quantity_estimated,
        f.name AS filament_name, f.color_hex, f.material, f.weight_remaining,
        pr.name AS printer_name,
        'multi' AS source
      FROM prints p
      JOIN print_filaments pf ON pf.print_id = p.id
      JOIN filaments f ON f.id = pf.filament_id
      LEFT JOIN printers pr ON pr.id = p.printer_id
      WHERE p.status = 'planned'
    `);

    // Fusionner : priorité aux données multi-filaments (quantity_estimated plus fiable)
    // On construit une map print_id+filament_id → meilleure ligne disponible
    const lineMap = {};
    for (const line of mainFilaments) {
      const key = line.id + '_' + line.filament_id;
      lineMap[key] = line;
    }
    for (const line of multiFilaments) {
      const key = line.id + '_' + line.filament_id;
      // Remplacer si : pas encore présent, OU si la ligne multi a quantity_estimated renseigné
      if (!lineMap[key] || (line.quantity_estimated && parseFloat(line.quantity_estimated) > 0)) {
        lineMap[key] = line;
      }
    }
    const allLines = Object.values(lineMap);

    if (!allLines.length) return res.json([]);

    // 3. Taux moyen g/h par filament (historique des 20 dernières impressions réussies)
    const filamentIds = [...new Set(allLines.map(function(l) { return l.filament_id; }))];
    const avgRates    = {};

    for (const fid of filamentIds) {
      // Taux depuis print_filaments (multi)
      const [[rateMulti]] = await db.query(`
        SELECT AVG(pf.quantity_actual / NULLIF(p.actual_duration / 60, 0)) AS avg_g_per_h
        FROM print_filaments pf
        JOIN prints p ON p.id = pf.print_id
        WHERE pf.filament_id = ? AND p.status = 'done'
          AND pf.quantity_actual > 0 AND p.actual_duration > 0
        ORDER BY p.finished_at DESC LIMIT 20
      `, [fid]);

      // Taux depuis prints.filament_used (mono)
      const [[rateMono]] = await db.query(`
        SELECT AVG(p.filament_used / NULLIF(p.actual_duration / 60, 0)) AS avg_g_per_h
        FROM prints p
        WHERE p.filament_id = ? AND p.status = 'done'
          AND p.filament_used > 0 AND p.actual_duration > 0
        ORDER BY p.finished_at DESC LIMIT 20
      `, [fid]);

      const rate = parseFloat(rateMulti?.avg_g_per_h || 0) || parseFloat(rateMono?.avg_g_per_h || 0);

      if (rate > 0) {
        avgRates[fid] = rate;
      } else {
        // Fallback : moyenne de la matière
        const [[matRate]] = await db.query(`
          SELECT AVG(p.filament_used / NULLIF(p.actual_duration / 60, 0)) AS avg_g_per_h
          FROM prints p JOIN filaments f ON f.id = p.filament_id
          WHERE f.material = (SELECT material FROM filaments WHERE id = ?)
            AND p.status = 'done' AND p.filament_used > 0 AND p.actual_duration > 0
          LIMIT 30
        `, [fid]);
        avgRates[fid] = parseFloat(matRate?.avg_g_per_h || 0) || 5;
      }
    }

    // 4. Simuler la consommation cumulée par filament
    const stockSim = {};
    filamentIds.forEach(function(fid) {
      const line = allLines.find(function(l) { return l.filament_id === fid; });
      stockSim[fid] = parseFloat(line.weight_remaining || 0);
    });

    // Trier par date planifiée pour simuler dans l'ordre
    allLines.sort(function(a, b) {
      if (!a.planned_at) return 1;
      if (!b.planned_at) return -1;
      return new Date(a.planned_at) - new Date(b.planned_at);
    });

    const alerts = [];

    for (const line of allLines) {
      const fid       = line.filament_id;
      const rate      = avgRates[fid] || 5;
      const durationH = line.estimated_duration ? parseFloat(line.estimated_duration) / 60 : null;

      // Estimer la consommation — priorité : quantity_estimated saisi, sinon calcul g/h
      let estimatedG = null;
      if (line.quantity_estimated && parseFloat(line.quantity_estimated) > 0) {
        estimatedG = parseFloat(line.quantity_estimated);
      } else if (durationH) {
        estimatedG = Math.round(rate * durationH);
      }

      if (!estimatedG) continue;

      const stockBefore = stockSim[fid];
      const stockAfter  = stockBefore - estimatedG;
      const margin      = estimatedG > 0 ? stockBefore / estimatedG : 99;

      if (margin < 1.2) {
        // Éviter les doublons (même print + filament)
        const exists = alerts.find(function(a) {
          return a.print_id === line.id && a.filament_id === fid;
        });
        if (!exists) {
          alerts.push({
            print_id:        line.id,
            print_name:      line.name,
            planned_at:      line.planned_at,
            printer_name:    line.printer_name,
            filament_id:     fid,
            filament_name:   line.filament_name,
            color_hex:       line.color_hex,
            material:        line.material,
            stock_remaining: Math.round(stockBefore),
            estimated_g:     Math.round(estimatedG),
            stock_after:     Math.round(stockAfter),
            severity:        stockAfter < 0 ? 'critical' : 'warning',
            estimated_from:  line.quantity_estimated ? 'manual' : 'history',
            avg_rate:        Math.round(rate * 10) / 10,
          });
        }
      }

      stockSim[fid] = Math.max(0, stockAfter);
    }

    res.json(alerts);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
