/**
 * export.js — Export CSV des données PrintFlow
 * Impressions, Filaments, Stats
 */

const router = require('express').Router();
const db     = require('../db');

// Convertir un tableau d'objets en CSV
function toCSV(rows, columns) {
  if (!rows.length) return columns.map(c => c.label).join(';') + '\n';
  const header = columns.map(c => '"' + c.label + '"').join(';');
  const lines  = rows.map(function(row) {
    return columns.map(function(c) {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return '"' + val + '"';
    }).join(';');
  });
  return header + '\n' + lines.join('\n');
}

// GET /api/export/prints — export impressions
router.get('/prints', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        p.id,
        p.name                                        AS nom,
        p.status                                      AS statut,
        pr.name                                       AS imprimante,
        f.name                                        AS filament,
        f.material                                    AS materiau,
        p.filament_used                               AS filament_g,
        p.estimated_duration                          AS duree_estimee_min,
        p.actual_duration                             AS duree_reelle_min,
        p.real_cost                                   AS cout_reel_eur,
        p.real_filament_cost                          AS cout_matiere_reel_eur,
        p.real_electricity_cost                       AS cout_electricite_reel_eur,
        p.layer_height                                AS hauteur_couche_mm,
        p.infill_percent                              AS remplissage_pct,
        p.print_temp                                  AS temp_buse,
        p.bed_temp                                    AS temp_plateau,
        p.rating                                      AS note,
        p.planned_at                                  AS date_planifiee,
        p.started_at                                  AS debut,
        p.finished_at                                 AS fin,
        p.created_at                                  AS cree_le,
        pj.name                                       AS projet,
        p.notes
      FROM prints p
      LEFT JOIN printers pr ON pr.id = p.printer_id
      LEFT JOIN filaments f  ON f.id  = p.filament_id
      LEFT JOIN projects pj  ON pj.id = p.project_id
      ORDER BY p.created_at DESC
    `);

    const columns = [
      { key: 'id',                  label: 'ID' },
      { key: 'nom',                 label: 'Nom' },
      { key: 'statut',              label: 'Statut' },
      { key: 'imprimante',          label: 'Imprimante' },
      { key: 'filament',            label: 'Filament' },
      { key: 'materiau',            label: 'Matériau' },
      { key: 'filament_g',          label: 'Filament (g)' },
      { key: 'duree_estimee_min',   label: 'Durée estimée (min)' },
      { key: 'duree_reelle_min',    label: 'Durée réelle (min)' },
      { key: 'hauteur_couche_mm',   label: 'Hauteur couche (mm)' },
      { key: 'remplissage_pct',     label: 'Remplissage (%)' },
      { key: 'cout_reel_eur',        label: 'Coût réel (€)' },
        { key: 'cout_matiere_reel_eur', label: 'Coût matière réel (€)' },
        { key: 'cout_electricite_reel_eur', label: 'Coût élec. réel (€)' },
        { key: 'temp_buse',           label: 'Temp. buse (°C)' },
      { key: 'temp_plateau',        label: 'Temp. plateau (°C)' },
      { key: 'note',                label: 'Note (/5)' },
      { key: 'date_planifiee',      label: 'Date planifiée' },
      { key: 'debut',               label: 'Début' },
      { key: 'fin',                 label: 'Fin' },
      { key: 'cree_le',             label: 'Créé le' },
      { key: 'projet',              label: 'Projet' },
      { key: 'notes',               label: 'Notes' },
    ];

    const csv = toCSV(rows, columns);
    const filename = 'printflow_impressions_' + new Date().toISOString().slice(0,10) + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/filaments — export filaments
router.get('/filaments', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        f.id,
        f.name                                        AS nom,
        f.brand                                       AS marque,
        f.material                                    AS materiau,
        f.color_name                                  AS couleur,
        f.color_hex                                   AS couleur_hex,
        f.diameter                                    AS diametre_mm,
        f.weight_total                                AS poids_total_g,
        f.weight_remaining                            AS poids_restant_g,
        ROUND(f.weight_remaining/f.weight_total*100)  AS pct_restant,
        f.price                                       AS prix_kg,
        ROUND(f.weight_remaining*f.price/1000,2)      AS valeur_restante,
        f.print_temp_min                              AS temp_min,
        f.print_temp_max                              AS temp_max,
        f.bed_temp_min                                AS plateau_min,
        f.bed_temp_max                                AS plateau_max,
        f.location                                    AS emplacement,
        f.notes,
        f.archived                                    AS archive,
        f.created_at                                  AS cree_le
      FROM filaments f
      ORDER BY f.archived ASC, f.name ASC
    `);

    const columns = [
      { key: 'id',               label: 'ID' },
      { key: 'nom',              label: 'Nom' },
      { key: 'marque',           label: 'Marque' },
      { key: 'materiau',         label: 'Matériau' },
      { key: 'couleur',          label: 'Couleur' },
      { key: 'couleur_hex',      label: 'Couleur HEX' },
      { key: 'diametre_mm',      label: 'Diamètre (mm)' },
      { key: 'poids_total_g',    label: 'Poids total (g)' },
      { key: 'poids_restant_g',  label: 'Poids restant (g)' },
      { key: 'pct_restant',      label: '% restant' },
      { key: 'prix_kg',          label: 'Prix (€/kg)' },
      { key: 'valeur_restante',  label: 'Valeur restante (€)' },
      { key: 'temp_min',         label: 'Temp. min (°C)' },
      { key: 'temp_max',         label: 'Temp. max (°C)' },
      { key: 'plateau_min',      label: 'Plateau min (°C)' },
      { key: 'plateau_max',      label: 'Plateau max (°C)' },
      { key: 'emplacement',      label: 'Emplacement' },
      { key: 'notes',            label: 'Notes' },
      { key: 'archive',          label: 'Archivé' },
      { key: 'cree_le',          label: 'Créé le' },
    ];

    const csv = toCSV(rows, columns);
    const filename = 'printflow_filaments_' + new Date().toISOString().slice(0,10) + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send('\uFEFF' + csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/stats — export stats globales par imprimante
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        pr.name                                         AS imprimante,
        pr.model                                        AS modele,
        pr.total_prints                                 AS total_impressions,
        pr.total_success                                AS reussies,
        pr.total_prints - pr.total_success              AS echouees,
        ROUND(pr.total_success/NULLIF(pr.total_prints,0)*100,1) AS taux_reussite_pct,
        ROUND(pr.total_hours,1)                         AS heures_total,
        ROUND(pr.total_grams,0)                         AS filament_total_g,
        ROUND(pr.total_grams/1000,2)                    AS filament_total_kg,
        (SELECT COUNT(*) FROM prints p
          WHERE p.printer_id=pr.id AND p.status='done'
          AND p.created_at >= DATE_SUB(NOW(),INTERVAL 7 DAY)) AS impressions_7j,
        (SELECT COUNT(*) FROM prints p
          WHERE p.printer_id=pr.id AND p.status='done'
          AND p.created_at >= DATE_SUB(NOW(),INTERVAL 30 DAY)) AS impressions_30j,
        (SELECT ROUND(SUM(p.actual_duration)/60,1) FROM prints p
          WHERE p.printer_id=pr.id AND p.status='done'
          AND p.created_at >= DATE_SUB(NOW(),INTERVAL 30 DAY)) AS heures_30j,
        pr.status                                       AS statut_actuel
      FROM printers pr
      ORDER BY pr.total_prints DESC
    `);

    const columns = [
      { key: 'imprimante',          label: 'Imprimante' },
      { key: 'modele',              label: 'Modèle' },
      { key: 'total_impressions',   label: 'Total impressions' },
      { key: 'reussies',            label: 'Réussies' },
      { key: 'echouees',            label: 'Échouées' },
      { key: 'taux_reussite_pct',   label: 'Taux réussite (%)' },
      { key: 'heures_total',        label: 'Heures total' },
      { key: 'filament_total_g',    label: 'Filament total (g)' },
      { key: 'filament_total_kg',   label: 'Filament total (kg)' },
      { key: 'impressions_7j',      label: 'Impressions 7 derniers jours' },
      { key: 'impressions_30j',     label: 'Impressions 30 derniers jours' },
      { key: 'heures_30j',          label: 'Heures 30 derniers jours' },
      { key: 'statut_actuel',       label: 'Statut actuel' },
    ];

    const csv = toCSV(rows, columns);
    const filename = 'printflow_stats_' + new Date().toISOString().slice(0,10) + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send('\uFEFF' + csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
