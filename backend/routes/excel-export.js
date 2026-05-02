/**
 * excel-export.js — Export Excel (.xlsx) des données PrintFlow
 * Compatible Numbers, Excel, LibreOffice
 */

const router   = require('express').Router();
const db       = require('../db');
const ExcelJS  = require('exceljs');

// Couleurs thème PrintFlow
const COLORS = {
  header_bg:   '1a56db',  // bleu accent
  header_fg:   'FFFFFF',
  alt_row:     'F0F4FF',
  success:     '10b981',
  danger:      'ef4444',
  warning:     'f59e0b',
  border:      'E5E7EB',
  title_bg:    '1E3A5F',
};

function styleHeader(row) {
  row.eachCell(function(cell) {
    cell.fill   = { type:'pattern', pattern:'solid', fgColor:{ argb: COLORS.header_bg } };
    cell.font   = { bold:true, color:{ argb: COLORS.header_fg }, size:11 };
    cell.alignment = { vertical:'middle', horizontal:'center', wrapText:true };
    cell.border = {
      bottom: { style:'medium', color:{ argb: COLORS.border } },
    };
  });
  row.height = 28;
}

function styleAltRow(row, isAlt) {
  if (!isAlt) return;
  row.eachCell(function(cell) {
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: COLORS.alt_row } };
  });
}

function addAutoFilter(sheet, lastCol) {
  sheet.autoFilter = {
    from: { row:1, column:1 },
    to:   { row:1, column:lastCol },
  };
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR');
}

function fmtDuration(min) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + 'h' + String(m).padStart(2,'0') : m + 'min';
}

// ── GET /api/excel/impressions ────────────────────────────────────────────
router.get('/impressions', async (req, res) => {
  try {
    const [prints] = await db.query(`
      SELECT p.id, p.name, p.status, p.created_at, p.started_at, p.finished_at,
             p.estimated_duration, p.actual_duration,
             p.filament_used, p.layer_height, p.infill_percent,
             p.print_temp, p.bed_temp, p.rating, p.notes,
             p.real_cost, p.real_filament_cost, p.real_electricity_cost,
             f.name AS filament_name, f.material, f.color_hex,
             pr.name AS printer_name,
             proj.name AS project_name
      FROM prints p
      LEFT JOIN filaments f   ON f.id   = p.filament_id
      LEFT JOIN printers  pr  ON pr.id  = p.printer_id
      LEFT JOIN projects  proj ON proj.id = p.project_id
      ORDER BY p.created_at DESC
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'PrintFlow-3D';
    wb.created  = new Date();

    const ws = wb.addWorksheet('Impressions', { views:[{ state:'frozen', ySplit:1 }] });

    // Colonnes
    ws.columns = [
      { header:'ID',             key:'id',            width:6  },
      { header:'Nom',            key:'name',          width:30 },
      { header:'Statut',         key:'status',        width:14 },
      { header:'Date',           key:'date',          width:14 },
      { header:'Imprimante',     key:'printer',       width:20 },
      { header:'Projet',         key:'project',       width:20 },
      { header:'Filament',       key:'filament',      width:22 },
      { header:'Matière',        key:'material',      width:10 },
      { header:'Durée estimée',  key:'est_dur',       width:14 },
      { header:'Durée réelle',   key:'act_dur',       width:14 },
      { header:'Consommé (g)',   key:'filament_g',    width:13 },
      { header:'Couche (mm)',    key:'layer',         width:11 },
      { header:'Remplissage %',  key:'infill',        width:13 },
      { header:'Temp. buse °C',  key:'temp_nozzle',   width:13 },
      { header:'Temp. plateau',  key:'temp_bed',      width:13 },
      { header:'Note (/5)',      key:'rating',        width:10 },
      { header:'Coût réel (€)',  key:'real_cost',     width:13 },
      { header:'Dont matière',   key:'mat_cost',      width:13 },
      { header:'Dont élec.',     key:'elec_cost',     width:12 },
      { header:'Notes',          key:'notes',         width:30 },
    ];

    styleHeader(ws.getRow(1));

    const statusLabels = {
      done:'Terminée', failed:'Échouée', cancelled:'Annulée',
      in_progress:'En cours', planned:'Planifiée', queued:'En attente'
    };
    const statusColors = {
      done: COLORS.success, failed: COLORS.danger,
      cancelled:'9CA3AF', in_progress:'3B82F6', planned:'8B5CF6'
    };

    prints.forEach(function(p, i) {
      const row = ws.addRow({
        id:          p.id,
        name:        p.name,
        status:      statusLabels[p.status] || p.status,
        date:        fmtDate(p.created_at),
        printer:     p.printer_name || '',
        project:     p.project_name || '',
        filament:    p.filament_name || '',
        material:    p.material || '',
        est_dur:     fmtDuration(p.estimated_duration),
        act_dur:     fmtDuration(p.actual_duration),
        filament_g:  p.filament_used ? parseFloat(p.filament_used) : '',
        layer:       p.layer_height ? parseFloat(p.layer_height) : '',
        infill:      p.infill_percent ? parseInt(p.infill_percent) : '',
        temp_nozzle: p.print_temp || '',
        temp_bed:    p.bed_temp || '',
        rating:      p.rating || '',
        real_cost:   p.real_cost ? parseFloat(parseFloat(p.real_cost).toFixed(3)) : '',
        mat_cost:    p.real_filament_cost ? parseFloat(parseFloat(p.real_filament_cost).toFixed(3)) : '',
        elec_cost:   p.real_electricity_cost ? parseFloat(parseFloat(p.real_electricity_cost).toFixed(3)) : '',
        notes:       p.notes || '',
      });

      // Couleur statut
      const statusCell = row.getCell('status');
      if (statusColors[p.status]) {
        statusCell.font = { bold:true, color:{ argb: statusColors[p.status] } };
      }

      // Alternance lignes
      styleAltRow(row, i % 2 === 1);

      // Alignement numérique
      ['filament_g','layer','infill','real_cost','mat_cost','elec_cost'].forEach(function(k) {
        row.getCell(k).alignment = { horizontal:'right' };
      });
    });

    addAutoFilter(ws, ws.columns.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''impressions_printflow.xlsx");
    await wb.xlsx.write(res);
    res.end();
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/excel/filaments ──────────────────────────────────────────────
router.get('/filaments', async (req, res) => {
  try {
    const [filaments] = await db.query(`
      SELECT f.*,
             ROUND(f.weight_remaining / NULLIF(f.weight_total,0) * 100, 0) AS stock_pct,
             COUNT(p.id) AS print_count,
             ROUND(SUM(p.filament_used), 0) AS total_used_g
      FROM filaments f
      LEFT JOIN prints p ON p.filament_id = f.id AND p.status='done'
      GROUP BY f.id
      ORDER BY f.archived ASC, f.name ASC
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PrintFlow-3D';
    wb.created = new Date();

    const ws = wb.addWorksheet('Filaments', { views:[{ state:'frozen', ySplit:1 }] });

    ws.columns = [
      { header:'ID',             key:'id',            width:6  },
      { header:'Nom',            key:'name',          width:28 },
      { header:'Marque',         key:'brand',         width:16 },
      { header:'Matière',        key:'material',      width:10 },
      { header:'Couleur',        key:'color_name',    width:14 },
      { header:'Diamètre mm',    key:'diameter',      width:12 },
      { header:'Stock (g)',      key:'remaining',     width:11 },
      { header:'Total (g)',      key:'total',         width:11 },
      { header:'Stock %',        key:'pct',           width:10 },
      { header:'Prix €/kg',      key:'price',         width:11 },
      { header:'Tare (g)',       key:'spool_weight',  width:10 },
      { header:'N° bobine',      key:'spool_number',  width:12 },
      { header:'Fournisseur',    key:'supplier',      width:18 },
      { header:'Date achat',     key:'purchase_date', width:14 },
      { header:'Emplacement',    key:'location',      width:16 },
      { header:'Impressions',    key:'print_count',   width:12 },
      { header:'Consommé (g)',   key:'total_used',    width:13 },
      { header:'Archivé',        key:'archived',      width:10 },
      { header:'Notes',          key:'notes',         width:30 },
    ];

    styleHeader(ws.getRow(1));

    filaments.forEach(function(f, i) {
      const pct = parseInt(f.stock_pct || 0);
      const row = ws.addRow({
        id:            f.id,
        name:          f.name,
        brand:         f.brand || '',
        material:      f.material || '',
        color_name:    f.color_name || '',
        diameter:      f.diameter_mm ? parseFloat(f.diameter_mm) : 1.75,
        remaining:     f.weight_remaining ? parseFloat(f.weight_remaining) : 0,
        total:         f.weight_total ? parseFloat(f.weight_total) : 0,
        pct:           pct,
        price:         f.price ? parseFloat(f.price) : '',
        spool_weight:  f.spool_weight ? parseFloat(f.spool_weight) : '',
        spool_number:  f.spool_number || '',
        supplier:      f.supplier || '',
        purchase_date: fmtDate(f.purchase_date),
        location:      f.location || '',
        print_count:   parseInt(f.print_count || 0),
        total_used:    f.total_used_g ? parseInt(f.total_used_g) : 0,
        archived:      f.archived ? 'Oui' : 'Non',
        notes:         f.notes || '',
      });

      // Couleur stock %
      const pctCell = row.getCell('pct');
      pctCell.font = { bold:true, color:{ argb: pct < 15 ? COLORS.danger : pct < 25 ? COLORS.warning : COLORS.success } };

      styleAltRow(row, i % 2 === 1);
      ['remaining','total','pct','price','spool_weight','print_count','total_used'].forEach(function(k) {
        row.getCell(k).alignment = { horizontal:'right' };
      });
    });

    addAutoFilter(ws, ws.columns.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''filaments_printflow.xlsx");
    await wb.xlsx.write(res);
    res.end();
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/excel/devis ──────────────────────────────────────────────────
router.get('/devis', async (req, res) => {
  try {
    const [quotes] = await db.query(`
      SELECT q.id, q.client_name, q.client_email, q.status, q.total_ht,
             q.margin_pct, q.notes, q.created_at,
             COUNT(qi.id) AS item_count,
             SUM(qi.qty) AS total_qty
      FROM quotes q
      LEFT JOIN quote_items qi ON qi.quote_id = q.id
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `);

    const [items] = await db.query(`
      SELECT qi.*, q.client_name, f.name AS filament_name, pr.name AS printer_name
      FROM quote_items qi
      JOIN quotes q ON q.id = qi.quote_id
      LEFT JOIN filaments f ON f.id = qi.filament_id
      LEFT JOIN printers pr ON pr.id = qi.printer_id
      ORDER BY qi.quote_id, qi.sort_order, qi.id
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PrintFlow-3D';
    wb.created = new Date();

    // Feuille 1 — Récapitulatif devis
    const ws1 = wb.addWorksheet('Devis', { views:[{ state:'frozen', ySplit:1 }] });
    ws1.columns = [
      { header:'ID',          key:'id',          width:6  },
      { header:'Client',      key:'client',      width:24 },
      { header:'Email',       key:'email',       width:26 },
      { header:'Statut',      key:'status',      width:14 },
      { header:'Articles',    key:'items',       width:10 },
      { header:'Total HT (€)',key:'total_ht',    width:13 },
      { header:'Marge %',     key:'margin',      width:10 },
      { header:'Date',        key:'date',        width:14 },
      { header:'Notes',       key:'notes',       width:30 },
    ];
    styleHeader(ws1.getRow(1));

    const statusLabels = { draft:'Brouillon', sent:'Envoyé', accepted:'Accepté', refused:'Refusé' };
    const statusColors  = { accepted: COLORS.success, refused: COLORS.danger, sent:'3B82F6', draft:'9CA3AF' };

    quotes.forEach(function(q, i) {
      const row = ws1.addRow({
        id:       q.id,
        client:   q.client_name,
        email:    q.client_email || '',
        status:   statusLabels[q.status] || q.status,
        items:    parseInt(q.item_count || 0),
        total_ht: parseFloat(parseFloat(q.total_ht || 0).toFixed(2)),
        margin:   parseFloat(q.margin_pct || 0),
        date:     fmtDate(q.created_at),
        notes:    q.notes || '',
      });
      const sCell = row.getCell('status');
      if (statusColors[q.status]) sCell.font = { bold:true, color:{ argb: statusColors[q.status] } };
      styleAltRow(row, i % 2 === 1);
      ['items','total_ht','margin'].forEach(function(k){ row.getCell(k).alignment = { horizontal:'right' }; });
    });

    // Totaux en bas
    const totalRow = ws1.addRow({
      client: 'TOTAL', total_ht: quotes.reduce(function(s,q){ return s + parseFloat(q.total_ht||0); }, 0).toFixed(2)
    });
    totalRow.font = { bold:true };
    addAutoFilter(ws1, ws1.columns.length);

    // Feuille 2 — Lignes de devis
    const ws2 = wb.addWorksheet('Lignes devis', { views:[{ state:'frozen', ySplit:1 }] });
    ws2.columns = [
      { header:'Devis ID',      key:'quote_id',    width:10 },
      { header:'Client',        key:'client',      width:22 },
      { header:'Désignation',   key:'designation', width:30 },
      { header:'Qté',           key:'qty',         width:6  },
      { header:'Filament (g)',  key:'filament_g',  width:13 },
      { header:'Durée (h)',     key:'time_h',      width:11 },
      { header:'Filament',      key:'filament',    width:20 },
      { header:'Imprimante',    key:'printer',     width:18 },
      { header:'Prix unit. €',  key:'unit_price',  width:13 },
      { header:'Total ligne €', key:'total_line',  width:13 },
    ];
    styleHeader(ws2.getRow(1));

    items.forEach(function(it, i) {
      const row = ws2.addRow({
        quote_id:    it.quote_id,
        client:      it.client_name,
        designation: it.designation,
        qty:         parseInt(it.qty || 1),
        filament_g:  it.filament_g ? parseFloat(it.filament_g) : '',
        time_h:      it.print_time_h ? parseFloat(it.print_time_h) : '',
        filament:    it.filament_name || '',
        printer:     it.printer_name || '',
        unit_price:  parseFloat(parseFloat(it.unit_price || 0).toFixed(2)),
        total_line:  parseFloat((parseFloat(it.unit_price || 0) * parseInt(it.qty || 1)).toFixed(2)),
      });
      styleAltRow(row, i % 2 === 1);
      ['qty','filament_g','time_h','unit_price','total_line'].forEach(function(k){ row.getCell(k).alignment = { horizontal:'right' }; });
    });
    addAutoFilter(ws2, ws2.columns.length);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''devis_printflow.xlsx");
    await wb.xlsx.write(res);
    res.end();
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/excel/rentabilite ────────────────────────────────────────────
router.get('/rentabilite', async (req, res) => {
  try {
    // Par mois
    const [monthly] = await db.query(`
      SELECT DATE_FORMAT(created_at,'%Y-%m') AS mois,
             COUNT(*) AS impressions,
             SUM(status='done') AS reussies,
             ROUND(SUM(actual_duration)/60,1) AS heures,
             ROUND(SUM(filament_used),0) AS filament_g,
             ROUND(SUM(real_cost),2) AS cout_reel,
             ROUND(SUM(real_filament_cost),2) AS cout_matiere,
             ROUND(SUM(real_electricity_cost),2) AS cout_elec
      FROM prints
      WHERE status IN ('done','failed','cancelled')
      GROUP BY mois ORDER BY mois DESC
    `);

    // Par imprimante
    const [byPrinter] = await db.query(`
      SELECT pr.name AS imprimante,
             COUNT(*) AS impressions,
             SUM(p.status='done') AS reussies,
             ROUND(SUM(p.actual_duration)/60,1) AS heures,
             ROUND(SUM(p.filament_used),0) AS filament_g,
             ROUND(SUM(p.real_cost),2) AS cout_reel
      FROM prints p
      JOIN printers pr ON pr.id = p.printer_id
      WHERE p.status IN ('done','failed','cancelled')
      GROUP BY pr.id ORDER BY cout_reel DESC
    `);

    // Par matière
    const [byMaterial] = await db.query(`
      SELECT f.material AS matiere,
             COUNT(*) AS impressions,
             ROUND(SUM(p.filament_used),0) AS filament_g,
             ROUND(SUM(p.real_cost),2) AS cout_reel
      FROM prints p
      JOIN filaments f ON f.id = p.filament_id
      WHERE p.status = 'done' AND f.material IS NOT NULL
      GROUP BY f.material ORDER BY filament_g DESC
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'PrintFlow-3D';
    wb.created = new Date();

    // Feuille mensuelle
    const ws1 = wb.addWorksheet('Par mois', { views:[{ state:'frozen', ySplit:1 }] });
    ws1.columns = [
      { header:'Mois',            key:'mois',        width:12 },
      { header:'Impressions',     key:'impressions',  width:13 },
      { header:'Réussies',        key:'reussies',     width:11 },
      { header:'Taux réussite %', key:'taux',         width:15 },
      { header:'Heures',          key:'heures',       width:10 },
      { header:'Filament (g)',    key:'filament_g',   width:13 },
      { header:'Coût réel (€)',   key:'cout_reel',    width:13 },
      { header:'Dont matière',    key:'cout_matiere', width:13 },
      { header:'Dont élec.',      key:'cout_elec',    width:12 },
      { header:'Coût moy./imp.',  key:'cout_moy',     width:13 },
    ];
    styleHeader(ws1.getRow(1));
    monthly.forEach(function(m, i) {
      const taux = m.impressions > 0 ? Math.round(m.reussies / m.impressions * 100) : 0;
      const moy  = m.reussies > 0 ? parseFloat((m.cout_reel / m.reussies).toFixed(2)) : 0;
      const row = ws1.addRow({
        mois: m.mois, impressions: parseInt(m.impressions),
        reussies: parseInt(m.reussies), taux,
        heures: parseFloat(m.heures || 0),
        filament_g: parseInt(m.filament_g || 0),
        cout_reel: parseFloat(m.cout_reel || 0),
        cout_matiere: parseFloat(m.cout_matiere || 0),
        cout_elec: parseFloat(m.cout_elec || 0),
        cout_moy: moy,
      });
      styleAltRow(row, i % 2 === 1);
      ['impressions','reussies','taux','heures','filament_g','cout_reel','cout_matiere','cout_elec','cout_moy'].forEach(function(k){
        row.getCell(k).alignment = { horizontal:'right' };
      });
    });
    addAutoFilter(ws1, ws1.columns.length);

    // Feuille par imprimante
    const ws2 = wb.addWorksheet('Par imprimante', { views:[{ state:'frozen', ySplit:1 }] });
    ws2.columns = [
      { header:'Imprimante',      key:'imprimante',  width:22 },
      { header:'Impressions',     key:'impressions', width:13 },
      { header:'Réussies',        key:'reussies',    width:11 },
      { header:'Taux réussite %', key:'taux',        width:15 },
      { header:'Heures totales',  key:'heures',      width:14 },
      { header:'Filament (g)',    key:'filament_g',  width:13 },
      { header:'Coût réel (€)',   key:'cout_reel',   width:13 },
    ];
    styleHeader(ws2.getRow(1));
    byPrinter.forEach(function(p, i) {
      const taux = p.impressions > 0 ? Math.round(p.reussies / p.impressions * 100) : 0;
      const row = ws2.addRow({
        imprimante: p.imprimante, impressions: parseInt(p.impressions),
        reussies: parseInt(p.reussies), taux,
        heures: parseFloat(p.heures || 0),
        filament_g: parseInt(p.filament_g || 0),
        cout_reel: parseFloat(p.cout_reel || 0),
      });
      styleAltRow(row, i % 2 === 1);
    });

    // Feuille par matière
    const ws3 = wb.addWorksheet('Par matière', { views:[{ state:'frozen', ySplit:1 }] });
    ws3.columns = [
      { header:'Matière',        key:'matiere',     width:14 },
      { header:'Impressions',    key:'impressions', width:13 },
      { header:'Filament (g)',   key:'filament_g',  width:13 },
      { header:'Coût réel (€)',  key:'cout_reel',   width:13 },
      { header:'Coût moy./imp.', key:'cout_moy',    width:14 },
    ];
    styleHeader(ws3.getRow(1));
    byMaterial.forEach(function(m, i) {
      const moy = m.impressions > 0 ? parseFloat((m.cout_reel / m.impressions).toFixed(2)) : 0;
      const row = ws3.addRow({
        matiere: m.matiere, impressions: parseInt(m.impressions),
        filament_g: parseInt(m.filament_g || 0),
        cout_reel: parseFloat(m.cout_reel || 0),
        cout_moy: moy,
      });
      styleAltRow(row, i % 2 === 1);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''rentabilite_printflow.xlsx");
    await wb.xlsx.write(res);
    res.end();
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
