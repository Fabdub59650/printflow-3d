let allFilaments  = [];
let showArchived  = false;
let _sortCol      = null;   // colonne de tri active
let _sortDir      = 'asc';  // 'asc' | 'desc'
let _filterQuery  = '';     // filtre recherche
let _filterMat    = '';     // filtre matière actif

// ── Colonnes configurables ────────────────────────────────
const FILAMENT_COLS = [
  { id: 'nom',         label: 'Nom',           always: true,  flex: 3   },
  { id: 'couleur',     label: 'Couleur',       always: false, flex: 1.2 },
  { id: 'option',      label: 'Option',        always: false, flex: 1.5 },
  { id: 'finition',    label: 'Finition',      always: false, flex: 1.2 },
  { id: 'marque',      label: 'Marque',        always: false, flex: 1.5 },
  { id: 'spool_num',   label: 'N° bobine',     always: false, flex: 1   },
  { id: 'stock',       label: 'Stock restant', always: true,  flex: 1.8 },
  { id: 'longueur',    label: 'Longueur',      always: false, flex: 1.2 },
  { id: 'progress',    label: 'Progression',   always: false, flex: 2   },
  { id: 'bobine',      label: 'Bobine vide',   always: false, flex: 1   },
  { id: 'prix',        label: 'Prix',          always: false, flex: 0.8, setting: 'prices'    },
  { id: 'emplacement', label: 'Emplacement',   always: false, flex: 1.5, setting: 'locations' },
];

// Calcule les largeurs % en fonction des colonnes visibles (en laissant 170px pour les actions)
function computeColWidths(visCols) {
  const total = visCols.reduce(function(s, col) { return s + col.flex; }, 0);
  return visCols.map(function(col) {
    return 'calc((100% - 170px) * ' + (col.flex / total) + ')';
  });
}

function sortFilaments(filaments) {
  if (!_sortCol) return filaments;
  return [...filaments].sort(function(a, b) {
    let va = a[_sortCol] || '';
    let vb = b[_sortCol] || '';
    if (typeof va === 'number' || !isNaN(va)) { va = parseFloat(va)||0; vb = parseFloat(vb)||0; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return _sortDir === 'asc' ? -1 : 1;
    if (va > vb) return _sortDir === 'asc' ?  1 : -1;
    return 0;
  });
}

function filterFilaments(filaments) {
  let result = filaments;
  // Filtre matière
  if (_filterMat) result = result.filter(function(f){ return f.material === _filterMat; });
  // Filtre texte
  if (_filterQuery) {
    const q = _filterQuery.toLowerCase();
    result = result.filter(function(f) {
      return (f.name      && f.name.toLowerCase().includes(q)) ||
             (f.brand     && f.brand.toLowerCase().includes(q)) ||
             (f.material  && f.material.toLowerCase().includes(q)) ||
             (f.color_name && f.color_name.toLowerCase().includes(q));
    });
  }
  return result;
}

function setMaterialFilter(mat) {
  _filterMat = _filterMat === mat ? '' : mat; // toggle
  renderFilamentGrid();
}

function toggleSort(col) {
  if (_sortCol === col) {
    _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _sortCol = col;
    _sortDir = 'asc';
  }
  renderFilamentGrid();
}

function getVisibleCols() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('pf_filament_cols') || 'null'); } catch(_) { saved = null; }
  if (!saved) saved = ['nom','option','marque','spool_num','stock','longueur','progress','bobine'];
  const showPrices    = window._showPrices    === true;
  const showLocations = window._showLocations === true;
  return FILAMENT_COLS.filter(function(col) {
    if (col.setting === 'prices'    && !showPrices)    return false;
    if (col.setting === 'locations' && !showLocations) return false;
    return col.always || saved.includes(col.id);
  });
}

function saveVisibleCols(ids) {
  try { localStorage.setItem('pf_filament_cols', JSON.stringify(ids)); } catch(_) {}
}

function openColPicker() {
  const visible = getVisibleCols().map(function(c){ return c.id; });
  const showPrices    = window._showPrices    === true;
  const showLocations = window._showLocations === true;
  const rows = FILAMENT_COLS.filter(function(col) {
    if (col.setting === 'prices'    && !showPrices)    return false;
    if (col.setting === 'locations' && !showLocations) return false;
    return true;
  }).map(function(col) {
    const checked  = visible.includes(col.id);
    const disabled = col.always;
    return '<label style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-radius:6px;cursor:' + (disabled ? 'default' : 'pointer') + ';' +
        (!disabled ? 'transition:background 0.1s" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'"' : '"') + '>' +
      '<input type="checkbox" value="' + col.id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' style="flex-shrink:0;width:16px;height:16px">' +
      '<div style="flex:1;min-width:0">' +
        '<span style="font-size:13px;color:' + (disabled ? 'var(--text3)' : 'var(--text)') + '">' + col.label + '</span>' +
        (disabled ? '<span style="font-size:11px;color:var(--text3);margin-left:6px">toujours visible</span>' : '') +
      '</div>' +
    '</label>';
  }).join('');

  openModal(
    '<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:16px">' + rows + '</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="applyColPicker()">Appliquer</button>' +
    '</div>',
    'Colonnes affichées'
  );
}

function applyColPicker() {
  const checks = document.querySelectorAll('#modal input[type=checkbox]');
  const ids = Array.from(checks).filter(function(ch){ return ch.checked; }).map(function(ch){ return ch.value; });
  saveVisibleCols(ids);
  closeModal();
  renderFilaments();
}

// Densités g/cm³ par matière pour calcul de longueur
const MATERIAL_DENSITY = {
  PLA: 1.24, PETG: 1.27, ABS: 1.04, ASA: 1.07, TPU: 1.21,
  Nylon: 1.14, PC: 1.20, HIPS: 1.04, PVA: 1.19, autre: 1.24
};

function calcLength(weightG, diameterMm, material) {
  const d       = parseFloat(diameterMm) || 1.75;
  const density = MATERIAL_DENSITY[material] || 1.24;
  const r       = d / 2 / 10; // rayon en cm
  const volPerM = Math.PI * r * r * 100; // cm³ par mètre (100 cm)
  const massPerM= volPerM * density;     // g par mètre
  const meters  = parseFloat(weightG) / massPerM;
  if (!isFinite(meters) || meters <= 0) return null;
  return meters >= 1000 ? (meters / 1000).toFixed(2) + ' km' : Math.round(meters) + ' m';
}

const FINISH_OPTIONS  = ['Standard','Brillant','Mat','Soie','Marbre','Bois','Pailleté','Transparent','Opaque','Autre'];
const SPECIAL_OPTIONS = ['—','Renforcé fibre carbone','Renforcé fibre verre','Flexible','Conducteur','Ignifugé','Alimentaire','UV résistant','Autre'];

async function renderFilaments() {
  document.getElementById('page-title').textContent = 'Filaments';
  document.getElementById('topbar-actions').innerHTML =
    `${window._spoolmanEnabled ? '<button class="btn btn-sm" onclick="syncSpoolman()" style="margin-right:4px">↻ Sync Spoolman</button>' : ''}
     <button class="btn btn-sm" onclick="openWeighingModal()" style="margin-right:4px">⚖ Pesée</button>
     <div style="position:relative;display:inline-block;margin-right:4px">
       <input id="filament-search" type="text" placeholder="Rechercher…"
         value="${_filterQuery}"
         oninput="setFilamentFilter(this.value)"
         style="padding:5px 28px 5px 10px;font-size:12px;width:160px;border-radius:var(--radius)">
       ${_filterQuery ? '<button onclick="setFilamentFilter(\"\")" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px">✕</button>' : ''}
     </div>
     <button class="btn btn-sm" id="btn-archived" onclick="toggleShowArchived()"
       style="margin-right:4px;opacity:${showArchived?'1':'0.5'}">
       ${showArchived ? '● Archivés visibles' : '○ Archivés masqués'}
     </button>
     <button class="btn btn-sm" onclick="openColPicker()" style="margin-right:4px" title="Choisir les colonnes">⚙ Colonnes</button>
     <button class="btn btn-sm" onclick="openImportCSV()" style="margin-right:4px" title="Importer depuis CSV">↑ CSV</button>
     <button class="btn btn-sm" onclick="exportFilamentsCSV()" style="margin-right:4px" title="Exporter en CSV">↓ CSV</button>
     <button class="btn btn-sm" onclick="exportFilamentsPDF()" style="margin-right:4px" title="Exporter en PDF">↓ PDF</button>
     <button class="btn btn-primary" onclick="openFilamentForm()">+ Ajouter</button>`;
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  allFilaments = await API.get('/filaments' + (showArchived ? '?archived=1' : ''));
  renderFilamentGrid();
}

function setFilamentFilter(q) {
  _filterQuery = q;
  renderFilamentGrid();
  // Mettre à jour le champ sans re-render complet
  const input = document.getElementById('filament-search');
  if (input && document.activeElement !== input) input.value = q;
}

async function toggleShowArchived() {
  showArchived = !showArchived;
  await renderFilaments();
}

function renderFilamentGrid() {
  const content = document.getElementById('content');
  if (!allFilaments.length) {
    content.innerHTML = '<div class="empty-state"><p>Aucun filament en stock.</p></div>';
    return;
  }
  // Appliquer filtre et tri
  const displayed = sortFilaments(filterFilaments(allFilaments));
  const grouped = {};
  displayed.forEach(f => {
    if (!grouped[f.material]) grouped[f.material] = [];
    grouped[f.material].push(f);
  });

  content.innerHTML = Object.entries(grouped).map(([mat, filaments]) => `
    <div class="card">
      <div class="card-header" style="cursor:pointer" onclick="setMaterialFilter('${mat}')"
           title="${_filterMat===mat ? 'Cliquer pour afficher toutes les matières' : 'Cliquer pour filtrer sur ' + mat}">
        <span class="card-title" style="${_filterMat===mat ? 'color:var(--accent)' : ''}">${mat}
          ${_filterMat===mat ? '<span style="font-size:11px;font-weight:normal;margin-left:6px;color:var(--accent)">● filtré</span>' : ''}
        </span>
        <span style="font-size:12px;color:var(--text3)">${filaments.length} bobine${filaments.length>1?'s':''}
          <span style="font-size:11px;opacity:0.5;margin-left:4px">${_filterMat===mat ? '✕' : '▼'}</span>
        </span>
      </div>
      <table style="table-layout:fixed;width:100%">
        <colgroup>
          ${(function(){ const v=getVisibleCols(); const w=computeColWidths(v); return v.map(function(col,i){ return '<col style="width:'+w[i]+'">'; }).join(''); })()}
          <col style="width:170px">
        </colgroup>
        <thead><tr>
          ${getVisibleCols().map(function(col) {
            const colToField = {nom:'name',marque:'brand',stock:'weight_remaining',longueur:'weight_remaining',
              prix:'price',emplacement:'location',spool_num:'spool_number',option:'finish_option',finition:'finish_option'};
            const field = colToField[col.id];
            const isSorted = field && _sortCol === field;
            const arrow = isSorted ? (_sortDir === 'asc' ? ' ↑' : ' ↓') : '';
            const clickable = field ? 'onclick="toggleSort(\'' + field + '\')" style="cursor:pointer;user-select:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' + (isSorted ? 'color:var(--accent)' : '') + '"' : 'style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"';
            return '<th ' + clickable + '>' + col.label + arrow + '</th>';
          }).join('')}
          <th></th>
        </tr></thead>
        <tbody>
          ${filaments.map(f => {
            const p = pct(f.weight_remaining, f.weight_total);
            const barColor = p < 15 ? 'var(--danger)' : p < 25 ? 'var(--warning)' : 'var(--accent)';
            const optLabel = [
              f.finish_option && f.finish_option !== 'Standard' ? f.finish_option : null,
              f.special_option && f.special_option !== '—' ? f.special_option : null
            ].filter(Boolean).join(' · ');
            const visCols = getVisibleCols().map(c => c.id);
            const tdNom = `<td style="opacity:${f.archived?'0.55':'1'}">
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="filament-dot" style="background:${f.color_hex};width:14px;height:14px"></span>
                  <span style="font-weight:500">${f.name}</span>

                  ${f.archived ? `<span style="font-size:10px;padding:1px 6px;background:var(--bg3);color:var(--text3);border-radius:10px">Archivé</span>` : ''}
                  ${f.nfc_uid ? `<span title="Puce NFC liée : ${f.nfc_uid}" style="font-size:10px;padding:1px 5px;background:var(--accent-bg);color:var(--accent);border-radius:10px;cursor:pointer" onclick="openNfcScanModal(${f.id})">📡 NFC</span>` : ''}
                </div></td>`;
            const tdMap = {
              couleur:     `<td style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                  ${f.color_hex ? `<span style="display:flex;align-items:center;gap:5px">
                    <span style="width:10px;height:10px;border-radius:50%;background:${f.color_hex};flex-shrink:0;display:inline-block"></span>
                    <span style="color:var(--text2)">${f.color_name||''}</span>
                  </span>` : '—'}
                </td>`,
              option:      `<td style="font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${optLabel || '—'}</td>`,
              finition:    `<td style="font-size:12px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.finish_option && f.finish_option !== 'Standard' ? f.finish_option : '—'}</td>`,
              marque:      `<td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.brand||'—'}</td>`,
              spool_num:   `<td style="font-size:12px;font-weight:500;color:var(--text2)">${f.spool_number||'—'}</td>`,
              stock:       `<td><span style="font-weight:500;color:${p<20?'var(--warning)':'var(--text)'}">${Math.round(f.weight_remaining)}g</span><span style="color:var(--text3);font-size:11px"> / ${f.weight_total}g</span></td>`,
              longueur:    `<td style="font-size:12px;color:var(--text2);white-space:nowrap">${calcLength(f.weight_remaining, f.diameter, f.material) || '—'}</td>`,
              progress:    `<td style="min-width:100px"><div style="display:flex;align-items:center;gap:8px"><div class="progress-wrap" style="flex:1"><div class="progress-fill" style="width:${p}%;background:${barColor}"></div></div><span style="font-size:11px;color:var(--text3);min-width:30px">${p}%</span></div></td>`,
              bobine:      `<td style="font-size:12px;color:var(--text3)">${f.spool_weight ? f.spool_weight+'g' : '—'}</td>`,
              prix:        `<td style="font-size:12px">${f.price ? f.price+'€' : '—'}</td>`,
              emplacement: `<td style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.location||'—'}</td>`,
            };
            return `<tr>
              ${tdNom}
              ${visCols.filter(id => id !== 'nom').map(id => tdMap[id] || '').join('')}
              <td style="width:170px;min-width:170px"><div class="td-actions">
                <button class="btn btn-sm" title="Pesée" onclick="openWeighingModal(${f.id})">⚖</button>
                <button class="btn btn-sm" title="Évolution stock" onclick="openWeighingHistory(${f.id})">📈</button>
                <button class="btn btn-sm" title="Historique pesées" onclick="openWeighingHistory(${f.id})" style="font-size:10px">Hist.</button>
                <button class="btn btn-sm" title="NFC" onclick="openNfcScanModal(${f.id})" style="font-size:11px">📡</button>
                <button class="btn btn-sm" title="${f.archived?'Désarchiver':'Archiver'}"
                  onclick="quickToggleArchive(${f.id},${f.archived?1:0})"
                  style="font-size:11px;opacity:${f.archived?'1':'0.6'}">${f.archived?'↑':'📦'}</button>
                <button class="btn btn-sm" onclick="openFilamentForm(${f.id})">✏</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFilament(${f.id})">✕</button>
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

function openFilamentForm(id = null) {
  const f = id ? allFilaments.find(x => x.id === id) : {};
  openModal(`
    <div class="form-grid">
      <div class="form-group full"><label class="form-label">Nom *</label><input id="ff-name" value="${f.name||''}"></div>
      <div class="form-group"><label class="form-label">Marque</label><input id="ff-brand" value="${f.brand||''}"></div>
      <div class="form-group"><label class="form-label">N° de bobine</label>
        <input id="ff-spool-num" value="${f.spool_number||''}" placeholder="ex: SN-20260401-001">
      </div>
      <div class="form-group"><label class="form-label">Matière</label>
        <select id="ff-mat">
          ${['PLA','PETG','ABS','ASA','TPU','Nylon','PC','HIPS','PVA','autre'].map(m =>
            `<option ${(f.material||'PLA')==m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sous-type ELEGOO
          <span style="font-size:10px;color:var(--text3);font-weight:400"> (pour NFC)</span>
        </label>
        <select id="ff-elegoo-subtype">
          <option value="">Standard (aucun)</option>
          <optgroup label="Renforcé">
            ${['CF','GF','PLA-CF','PETG-CF','ABS-CF','PA-CF','PETG-GF','PA-GF'].map(s =>
              `<option value="${s}" ${(f.elegoo_subtype||'')==s?'selected':''}>${s}</option>`).join('')}
          </optgroup>
          <optgroup label="Variantes PLA">
            ${['PLA+','Silk','Matte','Rapid'].map(s =>
              `<option value="${s}" ${(f.elegoo_subtype||'')==s?'selected':''}>${s}</option>`).join('')}
          </optgroup>
          <optgroup label="TPU">
            ${['TPU 95A','TPU 87A'].map(s =>
              `<option value="${s}" ${(f.elegoo_subtype||'')==s?'selected':''}>${s}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Finition</label>
        <select id="ff-finish">
          ${FINISH_OPTIONS.map(o => `<option ${(f.finish_option||'Standard')==o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Propriété spéciale</label>
        <select id="ff-special">
          ${SPECIAL_OPTIONS.map(o => `<option ${(f.special_option||'—')==o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Couleur</label>
        <input id="ff-color" type="color" value="${f.color_hex||'#cccccc'}">
      </div>
      <div class="form-group"><label class="form-label">Nom couleur</label><input id="ff-colorname" value="${f.color_name||''}"></div>
      <div class="form-group"><label class="form-label">Diamètre (mm)</label>
        <select id="ff-diam">
          <option ${(f.diameter||1.75)==1.75?'selected':''}>1.75</option>
          <option ${(f.diameter||1.75)==2.85?'selected':''}>2.85</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Poids total (g)</label><input id="ff-wtot" type="number" value="${f.weight_total||1000}"></div>
      <div class="form-group"><label class="form-label">Poids restant (g)</label><input id="ff-wrem" type="number" value="${f.weight_remaining||1000}"></div>
      <div class="form-group"><label class="form-label">Poids bobine vide (g)</label>
        <input id="ff-spool" type="number" step="0.1" value="${f.spool_weight||''}" placeholder="ex: 230">
      </div>
      <div class="form-group"><label class="form-label">Temp buse min (°C)</label><input id="ff-tnmin" type="number" value="${f.temp_nozzle_min||190}"></div>
      <div class="form-group"><label class="form-label">Temp buse max (°C)</label><input id="ff-tnmax" type="number" value="${f.temp_nozzle_max||230}"></div>
      <div class="form-group"><label class="form-label">Temp plateau min (°C)</label><input id="ff-tbmin" type="number" value="${f.temp_bed_min||0}"></div>
      <div class="form-group"><label class="form-label">Temp plateau max (°C)</label><input id="ff-tbmax" type="number" value="${f.temp_bed_max||60}"></div>
      ${window._showPrices ? `<div class="form-group"><label class="form-label">Prix (€)</label><input id="ff-price" type="number" step="0.01" value="${f.price||''}"></div>` : ''}
      ${window._spoolmanEnabled ? `<div class="form-group"><label class="form-label">ID Spoolman</label><input id="ff-spoolman" type="number" value="${f.spoolman_id||''}"></div>` : '<div></div>'}
      ${window._showLocations ? `<div class="form-group"><label class="form-label">Emplacement</label><input id="ff-loc" value="${f.location||''}"></div>` : ''}
      <div class="form-group full"><label class="form-label">Notes</label><textarea id="ff-notes">${f.notes||''}</textarea></div>
      <div class="form-group full">
        <label class="form-label">Puce NFC</label>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          ${f.nfc_uid
            ? `<code style="font-size:12px;background:var(--bg3);padding:4px 10px;border-radius:var(--radius)">${f.nfc_uid}</code>
               <span style="font-size:11px;color:var(--success)">✓ Puce liée</span>
               <button class="btn btn-sm btn-danger" onclick="nfcUnlinkFilament(${f.id||'null'});closeModal()">Délier</button>`
            : `<span style="font-size:12px;color:var(--text3)">Aucune puce liée</span>`}
          <button class="btn btn-sm" onclick="closeModal();openNfcScanModal(${f.id||'null'})">
            📡 ${f.nfc_uid ? 'Remplacer la puce' : 'Lier une puce'}
          </button>
          ${f.nfc_uid ? `
          <button class="btn btn-sm"
            style="background:var(--accent-bg);color:var(--accent);font-weight:500"
            onclick="closeModal();writeElegooFromFilament(${f.id})">
            ◈ Écrire format ELEGOO
          </button>` : ''}
          ${f.id ? '<button class="btn btn-sm" onclick="openNfcHistory(' + f.id + ')">📋 Historique NFC</button>' : ''}
        </div>
      </div>
      <div class="form-group full">
        <label class="form-label">Statut de la bobine</label>
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <div onclick="toggleArchiveInForm(this)" id="ff-archive-toggle"
               data-archived="${f.archived?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${f.archived?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${f.archived?'19px':'2px'}"></div>
          </div>
          <div>
            <div style="font-size:13px" id="ff-archive-label">${f.archived?'Bobine archivée':'Bobine active'}</div>
            <div style="font-size:11px;color:var(--text3)">Archiver masque la bobine de la liste principale</div>
          </div>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveFilament(${id||'null'})">Enregistrer</button>
    </div>`, id ? 'Modifier filament' : 'Ajouter un filament');
}

async function saveFilament(id) {
  const body = {
    name:            document.getElementById('ff-name').value,
    brand:           document.getElementById('ff-brand').value,
    material:        document.getElementById('ff-mat').value,
    color_hex:       document.getElementById('ff-color').value,
    color_name:      document.getElementById('ff-colorname').value,
    diameter:        document.getElementById('ff-diam').value,
    weight_total:    document.getElementById('ff-wtot').value,
    weight_remaining:document.getElementById('ff-wrem').value,
    spool_weight:    document.getElementById('ff-spool').value || null,
    temp_nozzle_min: document.getElementById('ff-tnmin').value,
    temp_nozzle_max: document.getElementById('ff-tnmax').value,
    temp_bed_min:    document.getElementById('ff-tbmin').value,
    temp_bed_max:    document.getElementById('ff-tbmax').value,
    price:           document.getElementById('ff-price')?.value || null,
    spool_number:    document.getElementById('ff-spool-num').value || null,
    elegoo_subtype:  document.getElementById('ff-elegoo-subtype').value || null,
    archived:        document.getElementById('ff-archive-toggle')?.dataset.archived === '1' ? 1 : 0,
    spoolman_id:     document.getElementById('ff-spoolman')?.value || null,
    location:        document.getElementById('ff-loc')?.value || '',
    notes:           document.getElementById('ff-notes').value,
    finish_option:   document.getElementById('ff-finish').value !== 'Standard' ? document.getElementById('ff-finish').value : null,
    special_option:  document.getElementById('ff-special').value !== '—' ? document.getElementById('ff-special').value : null,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    if (id) await API.put('/filaments/'+id, body);
    else    await API.post('/filaments', body);
    closeModal();
    toast(id ? 'Filament mis à jour' : 'Filament ajouté', 'success');
    renderFilaments();
  } catch (e) { toast(e.message, 'error'); }
}

function toggleArchiveInForm(el) {
  const isArchived = el.dataset.archived === '1';
  const newState   = !isArchived;
  el.dataset.archived = newState ? '1' : '0';
  const dot   = el.querySelector('div');
  dot.style.left        = newState ? '19px' : '2px';
  el.style.background   = newState ? 'var(--accent)' : 'var(--border2)';
  const label = document.getElementById('ff-archive-label');
  if (label) label.textContent = newState ? 'Bobine archivée' : 'Bobine active';
}

// Archiver/désarchiver rapidement depuis la liste (sans ouvrir le formulaire)
async function quickToggleArchive(id, currentArchived) {
  try {
    const filament = allFilaments.find(f => f.id === id);
    if (!filament) return;
    await API.put('/filaments/' + id, { ...filament, archived: currentArchived ? 0 : 1 });
    toast(currentArchived ? 'Bobine désarchivée' : 'Bobine archivée');
    renderFilaments();
  } catch(e) { toast(e.message, 'error'); }
}

// Écriture ELEGOO depuis la fiche filament
async function openNfcHistory(filamentId) {
  let rows = [];
  try { rows = await API.get('/nfc/history/' + filamentId); } catch(_) {}

  const filament = allFilaments.find(f => f.id === filamentId) || {};

  openModal(
    (rows.length === 0
      ? '<div class="empty-state"><p>Aucune écriture NFC enregistrée pour ce filament.</p></div>'
      : '<table>' +
          '<thead><tr>' +
            '<th>Date</th><th>UID puce</th><th>Format</th><th>Matière</th><th>Sous-type</th>' +
          '</tr></thead>' +
          '<tbody>' +
          rows.map(function(r) {
            return '<tr>' +
              '<td style="font-size:11px;color:#888;white-space:nowrap">' + fmtDateTime(r.written_at) + '</td>' +
              '<td><code style="font-size:11px">' + (r.uid||'—') + '</code></td>' +
              '<td><span style="font-size:11px;padding:2px 7px;background:var(--accent-bg);color:var(--accent);border-radius:10px">' + (r.format||'—') + '</span></td>' +
              '<td style="font-size:12px">' + (r.material||'—') + '</td>' +
              '<td style="font-size:12px;color:var(--text3)">' + (r.subtype||'—') + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody>' +
        '</table>') +
    '<div class="modal-footer"><button class="btn" onclick="closeModal()">Fermer</button></div>',
    'Historique NFC — ' + (filament.name || 'Filament')
  );
}

// Ouvre la modale NFC pré-positionnée sur le filament
async function writeElegooFromFilament(filamentId) {
  // On ouvre la modale NFC avec le filament pré-sélectionné
  // et on déclenche l'écriture dès qu'une carte est détectée
  openNfcScanModal(filamentId);
  // Listener unique : dès qu'une carte arrive, on écrit
  const unsub = nfcOn('card', async (data) => {
    unsub(); // écoute une seule fois
    if (data.filament && data.filament.id === filamentId) {
      // Puce déjà liée à ce filament → écriture directe
      await nfcWriteElegoo(filamentId);
    } else if (!data.filament) {
      // Puce inconnue → proposer de lier d'abord
      toast('Cette puce nest pas liée à ce filament — liez-la dabord.', 'error');
    } else {
      toast('Cette puce appartient à un autre filament.', 'error');
    }
  });
}

async function deleteFilament(id) {
  confirmDelete('Supprimer ce filament ?', async () => {
    try { await API.del('/filaments/'+id); toast('Filament supprimé'); renderFilaments(); }
    catch (e) { toast(e.message, 'error'); }
  });
}

// ── Pesée guidée ──────────────────────────────────────────
async function openWeighingModal(prefillId = null) {
  const filaments = allFilaments.length ? allFilaments : await API.get('/filaments');
  openModal(`
    <div style="margin-bottom:14px;background:var(--bg3);border-radius:var(--radius);
         padding:10px 14px;font-size:13px;color:var(--text2)">
      Posez la bobine <strong>avec le filament</strong> sur la balance, notez le poids brut,
      saisissez-le ci-dessous. L'app soustrait le poids de la bobine vide et met à jour le stock.
    </div>
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Bobine à peser *</label>
        <select id="wg-filament" onchange="updateWeighingPreview()">
          <option value="">— Sélectionner —</option>
          ${filaments.map(f => `<option value="${f.id}"
            data-spool="${f.spool_weight||0}"
            data-remaining="${f.weight_remaining}"
            ${f.id == prefillId ? 'selected' : ''}>
            ${f.name} · ${Math.round(f.weight_remaining)}g restants
          </option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Poids brut sur balance (g) *</label>
        <input id="wg-gross" type="text" inputmode="decimal" placeholder="ex: 847" oninput="updateWeighingPreview()">
        <div style="font-size:11px;color:var(--text3);margin-top:3px">Point ou virgule acceptés</div>
      </div>
      <div class="form-group">
        <label class="form-label">Poids bobine vide (g)</label>
        <input id="wg-spool" type="text" inputmode="decimal" placeholder="pré-rempli si connu" oninput="updateWeighingPreview()">
        <div style="font-size:11px;color:var(--text3);margin-top:3px">Sera sauvegardé sur la fiche si modifié</div>
      </div>
    </div>
    <div id="weighing-preview" style="display:none;margin:14px 0;background:var(--accent-bg);
         border-radius:var(--radius-lg);padding:14px 16px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
        <div>
          <div style="font-size:11px;color:var(--info,var(--accent));margin-bottom:4px">Poids brut</div>
          <div id="prev-gross" style="font-size:22px;font-weight:500">—</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--info,var(--accent));margin-bottom:4px">Bobine vide</div>
          <div id="prev-spool" style="font-size:22px;font-weight:500">—</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--info,var(--accent));margin-bottom:4px">Filament net</div>
          <div id="prev-net" style="font-size:22px;font-weight:500">—</div>
        </div>
      </div>
      <div id="prev-diff" style="text-align:center;margin-top:10px;font-size:12px;color:var(--text2)"></div>
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label class="form-label">Notes</label>
      <input id="wg-notes" placeholder="ex: après impression du plateau">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveWeighing()">Mettre à jour le stock</button>
    </div>
  `, 'Pesée de bobine');

  if (prefillId) updateWeighingPreview();
}

function parseWeight(str) {
  if (!str) return NaN;
  return parseFloat(String(str).replace(',', '.').trim());
}

function updateWeighingPreview() {
  const sel     = document.getElementById('wg-filament');
  const grossEl = document.getElementById('wg-gross');
  const spoolEl = document.getElementById('wg-spool');
  const preview = document.getElementById('weighing-preview');
  if (!sel || !sel.value) { preview.style.display='none'; return; }

  const opt       = sel.options[sel.selectedIndex];
  const defSpool  = parseFloat(opt.dataset.spool) || 0;
  const remaining = parseFloat(opt.dataset.remaining) || 0;

  if (defSpool > 0 && !spoolEl._userEdited) spoolEl.value = String(defSpool).replace('.', ',');
  spoolEl.addEventListener('input', () => { spoolEl._userEdited = true; }, { once: true });

  const gross = parseWeight(grossEl.value);
  const spool = parseWeight(spoolEl.value) || 0;
  if (isNaN(gross)) { preview.style.display='none'; return; }

  const net  = Math.max(0, gross - spool);
  const diff = net - remaining;
  preview.style.display = 'block';
  document.getElementById('prev-gross').textContent = gross.toFixed(0)+'g';
  document.getElementById('prev-spool').textContent = spool > 0 ? spool.toFixed(0)+'g' : '—';
  document.getElementById('prev-net').textContent   = net.toFixed(0)+'g';
  document.getElementById('prev-diff').textContent  =
    `Stock actuel : ${remaining.toFixed(0)}g → ${net.toFixed(0)}g  (${diff>=0?'+':''}${diff.toFixed(0)}g)`;
}

async function saveWeighing() {
  const filamentId = document.getElementById('wg-filament').value;
  const grossRaw   = document.getElementById('wg-gross').value;
  const spoolRaw   = document.getElementById('wg-spool').value;
  const notes      = document.getElementById('wg-notes').value;
  if (!filamentId) return toast('Sélectionnez une bobine', 'error');
  const gross = parseWeight(grossRaw);
  if (isNaN(gross) || gross <= 0) return toast('Poids brut invalide', 'error');
  const spoolOver = parseWeight(spoolRaw);
  try {
    if (!isNaN(spoolOver) && spoolOver > 0) {
      const filament = allFilaments.find(f => f.id == filamentId);
      if (filament && spoolOver !== parseFloat(filament.spool_weight||0)) {
        await API.put('/filaments/'+filamentId, { ...filament, spool_weight: spoolOver });
      }
    }
    const result = await API.post('/weighings', {
      filament_id:  parseInt(filamentId),
      gross_weight: gross,
      notes:        notes || null,
    });
    closeModal();
    toast(`Stock mis à jour : ${parseFloat(result.weighing.net_weight).toFixed(0)}g`, 'success');
    renderFilaments();
  } catch (e) { toast(e.message, 'error'); }
}

async function openWeighingHistory(filamentId) {
  const fil = allFilaments.find(f => f.id == filamentId);
  const filamentName = fil ? fil.name : 'Filament #' + filamentId;
  try {
    const history = await API.get('/weighings?filament_id=' + filamentId);
    if (!history.length) {
      openModal(
        '<p style="color:var(--text3);font-size:13px;padding:8px 0">Aucune pesée enregistrée pour ce filament.</p>' +
        '<div class="modal-footer"><button class="btn" onclick="closeModal()">Fermer</button></div>',
        'Historique — ' + filamentName);
      return;
    }

    // Données pour le graphique — ordre chronologique
    const chronoHistory = [...history].reverse();
    const labels  = chronoHistory.map(function(w) { return fmtDate(w.created_at); });
    const weights  = chronoHistory.map(function(w) { return parseFloat(w.net_weight).toFixed(0); });
    const maxWeight = fil ? parseFloat(fil.weight_total) : Math.max(...weights.map(Number));

    const totalConsumed = history.reduce(function(sum, w, i) {
      if (i < history.length - 1) {
        const diff = w.previous_weight - history[i+1].previous_weight;
        return sum + Math.max(0, diff);
      }
      return sum;
    }, 0);

    openModal(
      // Graphique
      '<div style="position:relative;height:200px;margin-bottom:16px">' +
        '<canvas id="weigh-chart"></canvas>' +
      '</div>' +
      // Métriques
      '<div style="display:flex;gap:12px;margin-bottom:16px">' +
        '<div class="metric-card" style="flex:1">' +
          '<div class="metric-label">Pesées</div>' +
          '<div class="metric-value">' + history.length + '</div>' +
        '</div>' +
        '<div class="metric-card" style="flex:1">' +
          '<div class="metric-label">Stock actuel</div>' +
          '<div class="metric-value" style="font-size:16px">' + parseFloat(history[0].net_weight).toFixed(0) + 'g</div>' +
          '<div class="metric-sub">' + fmtDateTime(history[0].created_at) + '</div>' +
        '</div>' +
        '<div class="metric-card" style="flex:1">' +
          '<div class="metric-label">Consommé total</div>' +
          '<div class="metric-value" style="font-size:16px">' + totalConsumed.toFixed(0) + 'g</div>' +
        '</div>' +
      '</div>' +
      // Tableau
      '<table>' +
        '<thead><tr>' +
          '<th>Date</th><th>Brut</th><th>Bobine</th><th>Net</th><th>Avant</th><th>Écart</th><th>Notes</th>' +
        '</tr></thead>' +
        '<tbody>' +
        history.map(function(w) {
          const diff = parseFloat(w.net_weight) - parseFloat(w.previous_weight);
          const diffColor = diff > 5 ? '#10b981' : diff < -5 ? '#ef4444' : '#888';
          return '<tr>' +
            '<td style="white-space:nowrap;font-size:12px">' + fmtDateTime(w.created_at) + '</td>' +
            '<td>' + parseFloat(w.gross_weight).toFixed(0) + 'g</td>' +
            '<td style="color:var(--text3)">' + (w.spool_weight ? parseFloat(w.spool_weight).toFixed(0)+'g' : '—') + '</td>' +
            '<td style="font-weight:500">' + parseFloat(w.net_weight).toFixed(0) + 'g</td>' +
            '<td style="color:var(--text3)">' + parseFloat(w.previous_weight).toFixed(0) + 'g</td>' +
            '<td style="color:' + diffColor + ';font-weight:500">' + (diff>=0?'+':'') + diff.toFixed(0) + 'g</td>' +
            '<td style="font-size:12px;color:var(--text3)">' + (w.notes||'—') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table>' +
      '<div class="modal-footer">' +
        '<button class="btn" onclick="closeModal()">Fermer</button>' +
        '<button class="btn btn-primary" onclick="closeModal();openWeighingModal(' + filamentId + ')">Nouvelle pesée</button>' +
      '</div>',
      'Évolution stock — ' + filamentName
    );

    // Dessiner le graphique après rendu de la modale
    setTimeout(function() {
      const ctx = document.getElementById('weigh-chart');
      if (!ctx || typeof Chart === 'undefined') return;
      new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Stock restant (g)',
            data: weights,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            fill: true,
            tension: 0.3,
          }, {
            label: 'Stock total (g)',
            data: labels.map(function() { return maxWeight; }),
            borderColor: 'rgba(100,100,100,0.3)',
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) { return ctx.dataset.label + ' : ' + ctx.parsed.y + 'g'; }
              }
            }
          },
          scales: {
            y: {
              min: 0,
              max: Math.ceil(maxWeight * 1.05),
              ticks: { callback: function(v) { return v + 'g'; } }
            }
          }
        }
      });
    }, 100);

  } catch (e) { toast('Erreur : ' + e.message, 'error'); }
}

async function syncSpoolman() {
  try {
    toast('Synchronisation Spoolman…');
    const r = await API.post('/spoolman/sync', {});
    toast(`Spoolman : ${r.imported} importées, ${r.updated} mises à jour`, 'success');
    renderFilaments();
  } catch (e) { toast('Spoolman inaccessible : ' + e.message, 'error'); }
}


// ── Export CSV ────────────────────────────────────────────
function exportFilamentsCSV() {
  const filaments = allFilaments;
  if (!filaments || !filaments.length) return toast('Aucun filament à exporter', 'error');

  const showPrices    = window._showPrices    !== false;
  const showLocations = window._showLocations !== false;

  // En-têtes
  const headers = ['Nom', 'Marque', 'Matière', 'Sous-type', 'Diamètre (mm)', 'Couleur',
    'Poids total (g)', 'Poids restant (g)', 'Stock (%)',
    'Temp. buse min (°C)', 'Temp. buse max (°C)', 'Temp. plateau min (°C)', 'Temp. plateau max (°C)',
    'Notes', 'Archivé'];
  if (showPrices)    headers.splice(8, 0, 'Prix (€)');
  if (showLocations) headers.push('Emplacement');

  const rows = filaments.map(f => {
    const pct = f.weight_total > 0 ? Math.round((f.weight_remaining / f.weight_total) * 100) : '';
    const row = [
      f.name || '',
      f.brand || '',
      f.material || '',
      f.elegoo_subtype || '',
      f.diameter || '1.75',
      f.color_name || f.color_hex || '',
      f.weight_total || '',
      f.weight_remaining || '',
      pct,
      f.temp_nozzle_min || '',
      f.temp_nozzle_max || '',
      f.temp_bed_min || '',
      f.temp_bed_max || '',
      (f.notes || '').replace(/"/g, '""'),
      f.archived ? 'Oui' : 'Non',
    ];
    if (showPrices)    row.splice(8, 0, f.price || '');
    if (showLocations) row.push(f.location || '');
    return row;
  });

  // Construire le CSV
  const csvContent = [headers, ...rows]
    .map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))
    .join('\r\n');

  // Télécharger
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = 'printflow_filaments_' + date + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Export CSV téléchargé', 'success');
}

// ── Export PDF ────────────────────────────────────────────
function exportFilamentsPDF() {
  const filaments = allFilaments;
  if (!filaments || !filaments.length) return toast('Aucun filament à exporter', 'error');
  if (typeof window.jspdf === 'undefined') return toast('jsPDF non chargé', 'error');

  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const date = new Date().toLocaleDateString('fr-FR');

  const showPrices    = window._showPrices    !== false;
  const showLocations = window._showLocations !== false;

  // ── En-tête ──
  doc.setFillColor(30, 30, 28);
  doc.rect(0, 0, 297, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PrintFlow — Inventaire filaments', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Exporté le ' + date + ' — ' + filaments.length + ' bobine(s)', 200, 13);

  // ── Colonnes ──
  const cols = [
    { label: 'Nom',           width: 42, key: 'name' },
    { label: 'Marque',        width: 28, key: 'brand' },
    { label: 'Matière',       width: 20, key: 'material' },
    { label: 'Couleur',       width: 22, key: 'color_name' },
    { label: 'Total (g)',     width: 20, key: 'weight_total' },
    { label: 'Restant (g)',   width: 22, key: 'weight_remaining' },
    { label: 'Stock %',       width: 18, key: '_pct' },
    { label: 'Buse °C',       width: 22, key: '_buse' },
    { label: 'Plateau °C',    width: 22, key: '_plateau' },
  ];
  if (showPrices)    cols.push({ label: 'Prix €', width: 16, key: 'price' });
  if (showLocations) cols.push({ label: 'Emplacement', width: 28, key: 'location' });

  // ── En-tête tableau ──
  let x = 10, y = 28;
  const rowH = 7;
  const headerH = 8;

  doc.setFillColor(245, 245, 243);
  doc.rect(10, y, 277, headerH, 'F');
  doc.setTextColor(80, 80, 75);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');

  cols.forEach(col => {
    doc.text(col.label, x + 2, y + 5.5);
    x += col.width;
  });

  y += headerH;

  // ── Lignes ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  filaments.forEach((f, i) => {
    if (y > 185) { // Nouvelle page
      doc.addPage();
      y = 15;
      // Ré-afficher l'en-tête tableau
      x = 10;
      doc.setFillColor(245, 245, 243);
      doc.rect(10, y, 277, headerH, 'F');
      doc.setTextColor(80, 80, 75);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      cols.forEach(col => { doc.text(col.label, x + 2, y + 5.5); x += col.width; });
      y += headerH;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }

    // Alternance couleur ligne
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 250);
      doc.rect(10, y, 277, rowH, 'F');
    }

    // Barre de stock colorée
    const pct = f.weight_total > 0 ? Math.round((f.weight_remaining / f.weight_total) * 100) : 0;
    const stockCol = pct <= 10 ? [192, 57, 43] : pct <= 25 ? [230, 126, 34] : [39, 174, 96];

    x = 10;
    doc.setTextColor(30, 30, 28);

    cols.forEach(col => {
      let val = '';
      if (col.key === '_pct') {
        // Mini barre de progression
        doc.setFillColor(220, 220, 218);
        doc.rect(x + 1, y + 2, 14, 3, 'F');
        doc.setFillColor(...stockCol);
        doc.rect(x + 1, y + 2, Math.max(0.5, 14 * pct / 100), 3, 'F');
        doc.setTextColor(...stockCol);
        doc.text(pct + '%', x + 1, y + 5.5 + 0.5);
        doc.setTextColor(30, 30, 28);
      } else if (col.key === '_buse') {
        val = (f.temp_nozzle_min && f.temp_nozzle_max) ? f.temp_nozzle_min + '-' + f.temp_nozzle_max : '—';
        doc.text(String(val), x + 2, y + 5);
      } else if (col.key === '_plateau') {
        val = (f.temp_bed_min && f.temp_bed_max) ? f.temp_bed_min + '-' + f.temp_bed_max : '—';
        doc.text(String(val), x + 2, y + 5);
      } else if (col.key === 'color_name') {
        // Pastille couleur + nom
        if (f.color_hex) {
          const hex = f.color_hex.replace('#','');
          const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
          doc.setFillColor(r, g, b);
          doc.circle(x + 3, y + 3.5, 1.8, 'F');
        }
        val = f.color_name || '—';
        doc.text(String(val).substring(0, 14), x + 7, y + 5);
      } else {
        val = f[col.key] != null ? String(f[col.key]) : '—';
        // Tronquer si trop long
        const maxChars = Math.floor(col.width / 2);
        if (val.length > maxChars) val = val.substring(0, maxChars - 1) + '…';
        doc.text(val, x + 2, y + 5);
      }
      x += col.width;
    });

    // Séparateur
    doc.setDrawColor(235, 235, 232);
    doc.line(10, y + rowH, 287, y + rowH);
    y += rowH;
  });

  // ── Pied de page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 155);
    doc.text('PrintFlow v1.7.1 — Page ' + i + ' / ' + pageCount, 14, 205);
  }

  doc.save('printflow_filaments_' + new Date().toISOString().slice(0,10) + '.pdf');
  toast('Export PDF téléchargé', 'success');
}

// ── Import CSV ────────────────────────────────────────────
function openImportCSV() {
  openModal(
    '<div style="margin-bottom:16px">' +
      '<p style="font-size:13px;color:var(--text2);margin-bottom:12px">' +
        'Le fichier CSV doit utiliser le séparateur <strong>;</strong> et contenir au minimum les colonnes ' +
        '<code>Nom</code> et <code>Matière</code>. Les autres colonnes sont optionnelles.' +
      '</p>' +
      '<p style="font-size:12px;color:var(--text3);margin-bottom:16px">' +
        'Colonnes reconnues : Nom, Marque, Matière, Couleur, Couleur (hex), Diamètre (mm), ' +
        'Poids total (g), Poids restant (g), Temp. buse min, Temp. buse max, ' +
        'Temp. plateau min, Temp. plateau max, Prix (€), Emplacement, Notes.' +
      '</p>' +
      '<input type="file" id="csv-import-file" accept=".csv,.txt" style="margin-bottom:12px">' +
      '<div id="csv-import-preview" style="font-size:12px;color:var(--text3)"></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" id="btn-do-import" onclick="doImportCSV()" disabled>Importer</button>' +
    '</div>',
    'Importer des filaments (CSV)'
  );

  document.getElementById('csv-import-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const rows = parseCSVRows(ev.target.result);
      const preview = document.getElementById('csv-import-preview');
      const btn     = document.getElementById('btn-do-import');
      if (!rows.length) {
        preview.textContent = 'Aucune ligne valide trouvée.';
        if (btn) btn.disabled = true;
      } else {
        preview.innerHTML = '<strong>' + rows.length + ' filament(s) à importer</strong>' +
          '<br>Exemple : ' + (rows[0].name || '?') + ' · ' + (rows[0].material || '?');
        if (btn) btn.disabled = false;
        window._csvImportRows = rows;
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCSVRows(text) {
  // Supprimer BOM si présent
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter(function(l){ return l.trim(); });
  if (lines.length < 2) return [];

  // Détecter séparateur
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(function(h){ return h.replace(/^"|"$/g,'').trim().toLowerCase(); });

  // Mapping des en-têtes
  const MAP = {
    'nom': 'name', 'name': 'name',
    'marque': 'brand', 'brand': 'brand',
    'matière': 'material', 'matiere': 'material', 'material': 'material',
    'couleur': 'color_name', 'color_name': 'color_name',
    'couleur (hex)': 'color_hex', 'color_hex': 'color_hex',
    'diamètre (mm)': 'diameter', 'diameter': 'diameter', 'diametre (mm)': 'diameter',
    'poids total (g)': 'weight_total', 'weight_total': 'weight_total',
    'poids restant (g)': 'weight_remaining', 'weight_remaining': 'weight_remaining',
    'temp. buse min (°c)': 'temp_nozzle_min', 'temp_nozzle_min': 'temp_nozzle_min',
    'temp. buse max (°c)': 'temp_nozzle_max', 'temp_nozzle_max': 'temp_nozzle_max',
    'temp. plateau min (°c)': 'temp_bed_min', 'temp_bed_min': 'temp_bed_min',
    'temp. plateau max (°c)': 'temp_bed_max', 'temp_bed_max': 'temp_bed_max',
    'prix (€)': 'price', 'prix': 'price', 'price': 'price',
    'emplacement': 'location', 'location': 'location',
    'notes': 'notes',
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(sep).map(function(v){ return v.replace(/^"|"$/g,'').trim(); });
    const row  = {};
    headers.forEach(function(h, idx) {
      const key = MAP[h];
      if (key && vals[idx] !== undefined && vals[idx] !== '' && vals[idx] !== '—') {
        row[key] = vals[idx];
      }
    });
    if (row.name && row.material) rows.push(row);
  }
  return rows;
}

async function doImportCSV() {
  const rows = window._csvImportRows;
  if (!rows || !rows.length) return;
  const btn = document.getElementById('btn-do-import');
  if (btn) { btn.disabled = true; btn.textContent = 'Import en cours…'; }
  try {
    const result = await API.post('/filaments/import-csv', { rows });
    closeModal();
    window._csvImportRows = null;
    let msg = result.imported + ' filament(s) importé(s) avec succès.';
    if (result.errors && result.errors.length) {
      msg += ' (' + result.errors.length + ' erreur(s))';
      console.warn('Import CSV errors:', result.errors);
    }
    toast(msg, 'success');
    allFilaments = await API.get('/filaments' + (showArchived ? '?archived=1' : ''));
    renderFilamentGrid();
  } catch(e) {
    toast('Erreur import : ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Importer'; }
  }
}
