// label-editor.js — Générateur d'étiquettes filaments

const LABEL_PRESETS = [
  { name:'Libre',                    cols:3, rows:8, wMm:63,   hMm:34,   pageW:210, pageH:297, marginH:8,  marginV:13, gapH:3,   gapV:0 },
  { name:'Avery L7651 — 65/A4',     cols:3, rows:8, wMm:63.5, hMm:33.9, pageW:210, pageH:297, marginH:7,  marginV:15, gapH:2.5, gapV:0 },
  { name:'Avery L7160 — 21/A4',     cols:3, rows:7, wMm:63.5, hMm:38.1, pageW:210, pageH:297, marginH:7,  marginV:15, gapH:2.5, gapV:0 },
  { name:'Avery L7163 — 14/A4',     cols:2, rows:7, wMm:99.1, hMm:38.1, pageW:210, pageH:297, marginH:5,  marginV:15, gapH:2.5, gapV:0 },
  { name:'Avery L7168 — 8/A4',      cols:2, rows:4, wMm:99.1, hMm:67.7, pageW:210, pageH:297, marginH:5,  marginV:14, gapH:2.5, gapV:0 },
  { name:'Dymo 36×89mm',            cols:1, rows:1, wMm:89,   hMm:36,   pageW:89,  pageH:36,  marginH:2,  marginV:2,  gapH:0,   gapV:0 },
  { name:'Dymo 54×101mm',           cols:1, rows:1, wMm:101,  hMm:54,   pageW:101, pageH:54,  marginH:2,  marginV:2,  gapH:0,   gapV:0 },
];

let _labelState = {
  preset:0, cols:3, rows:8, wMm:63, hMm:34,
  pageW:210, pageH:297, marginH:8, marginV:13, gapH:3, gapV:0,
  startAt:1, copies:1,
  showQr:true, showName:true, showBrand:true, showMat:true,
  showColor:true, showStock:true, showTemp:true, showLoc:false, showSpool:false,
  selected: new Set(),
};

async function openLabelEditor() {
  // Charger la config sauvegardée si elle existe
  try {
    const settings = await API.get('/settings');
    if (settings.label_config) {
      const saved = JSON.parse(settings.label_config);
      // Fusionner avec l'état actuel (sans écraser selected)
      const keys = ['preset','cols','rows','wMm','hMm','pageW','pageH',
        'marginH','marginV','gapH','gapV','startAt','copies',
        'showQr','showName','showBrand','showMat','showColor',
        'showStock','showTemp','showLoc','showSpool'];
      keys.forEach(function(k){ if (saved[k] !== undefined) _labelState[k] = saved[k]; });
    }
  } catch(_) {}
  _labelState.selected = new Set(
    allFilaments.filter(function(f){ return !f.archived; }).map(function(f){ return f.id; })
  );
  renderLabelEditor();
}

async function leSaveConfig() {
  const S = _labelState;
  const config = {
    preset:S.preset, cols:S.cols, rows:S.rows, wMm:S.wMm, hMm:S.hMm,
    pageW:S.pageW, pageH:S.pageH,
    marginH:S.marginH, marginV:S.marginV, gapH:S.gapH, gapV:S.gapV,
    startAt:S.startAt, copies:S.copies,
    showQr:S.showQr, showName:S.showName, showBrand:S.showBrand,
    showMat:S.showMat, showColor:S.showColor, showStock:S.showStock,
    showTemp:S.showTemp, showLoc:S.showLoc, showSpool:S.showSpool,
  };
  try {
    await API.put('/settings', { label_config: JSON.stringify(config) });
    toast('Mise en page sauvegardée ✓', 'success');
  } catch(e) { toast('Erreur : ' + e.message, 'error'); }
}

function renderLabelEditor() {
  const S = _labelState;
  const totalLabels = S.selected.size * S.copies;
  const totalCells  = totalLabels + (S.startAt - 1);
  const perPage     = S.cols * S.rows;
  const pages       = Math.max(1, Math.ceil(totalCells / perPage));

  const leftCol =
    // Préréglage
    sect('Préréglage',
      '<select id="le-preset" onchange="leApplyPreset(this.value)" style="width:100%;font-size:12px">' +
        LABEL_PRESETS.map(function(p,i){ return '<option value="'+i+'"'+(S.preset===i?' selected':'')+'>'+p.name+'</option>'; }).join('') +
      '</select>'
    ) +
    // Grille
    sect('Grille',
      grid2(
        fld('Colonnes',      'le-cols', S.cols,    1, 10),
        fld('Lignes',        'le-rows', S.rows,    1, 20),
        fld('Larg. (mm)',    'le-w',    S.wMm,    10, 200),
        fld('Haut. (mm)',    'le-h',    S.hMm,    10, 200)
      )
    ) +
    // Marges
    sect('Marges & espacement',
      grid2(
        fld('Marge H (mm)', 'le-mh', S.marginH, 0, 50),
        fld('Marge V (mm)', 'le-mv', S.marginV, 0, 50),
        fld('Écart H (mm)', 'le-gh', S.gapH,    0, 20),
        fld('Écart V (mm)', 'le-gv', S.gapV,    0, 20)
      )
    ) +
    // Options impression
    sect('Options impression',
      grid2(
        fld('Départ case', 'le-start',  S.startAt, 1, 100),
        fld('Copies/bobine','le-copies', S.copies,  1, 10)
      ) +
      '<div id="le-info" style="font-size:11px;color:var(--accent);margin-top:8px;' +
        'background:var(--accent-bg);padding:5px 8px;border-radius:var(--radius)">' +
        totalLabels + ' étiq. · ' + pages + ' page' + (pages>1?'s':'') + ' · départ case ' + S.startAt +
      '</div>'
    ) +
    // Contenu
    sect('Contenu',
      chk('QR Code',       'le-qr',    S.showQr) +
      chk('Nom',           'le-name',  S.showName) +
      chk('Marque',        'le-brand', S.showBrand) +
      chk('Matière',       'le-mat',   S.showMat) +
      chk('Couleur',       'le-color', S.showColor) +
      chk('Stock restant', 'le-stock', S.showStock) +
      chk('Températures',  'le-temp',  S.showTemp) +
      (window._showLocations ? chk('Emplacement', 'le-loc', S.showLoc) : '') +
      chk('N° bobine',     'le-spool', S.showSpool)
    ) +
    '<button class="btn btn-sm" onclick="leSaveConfig()" ' +
    'style="width:100%;margin-top:8px;margin-bottom:4px;background:var(--bg3);border:0.5px solid var(--border2);color:var(--text2)">💾 Sauvegarder la mise en page</button>' +
    '<button class="btn btn-primary" onclick="lePrint()" style="width:100%">🖨 Imprimer</button>';

  const filamentList =
    allFilaments.filter(function(f){ return !f.archived; }).map(function(f) {
      const checked = S.selected.has(f.id);
      const pct = f.weight_total > 0 ? Math.round(f.weight_remaining / f.weight_total * 100) : 0;
      return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;' +
        'padding:5px 8px;border-radius:var(--radius);' +
        'border:0.5px solid '+(checked?'var(--accent)':'var(--border)')+';' +
        'background:'+(checked?'var(--bg3)':'transparent')+';margin-bottom:3px">' +
        '<input type="checkbox" '+(checked?'checked':'')+' onchange="leToggle('+f.id+',this.checked)" ' +
          'style="flex-shrink:0;accent-color:var(--accent);width:14px;height:14px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:'+(f.color_hex||'#ccc')+
          ';flex-shrink:0;display:inline-block;border:0.5px solid rgba(0,0,0,0.15)"></span>' +
        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)">'+f.name+'</span>' +
        '<span style="flex-shrink:0;color:var(--text3);font-size:10px">'+Math.round(f.weight_remaining)+'g ('+pct+'%)</span>' +
      '</label>';
    }).join('');

  openModal(
    '<div style="display:flex;gap:0;height:62vh;min-height:520px;overflow:hidden;margin:-4px">' +

    // Colonne gauche fixe
    '<div style="width:220px;min-width:220px;overflow-y:auto;border-right:0.5px solid var(--border2);' +
      'padding:14px;display:flex;flex-direction:column;gap:0">' +
      leftCol +
    '</div>' +

    // Colonne droite
    '<div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0">' +

      // Sélection bobines
      '<div style="padding:12px 16px;border-bottom:0.5px solid var(--border2);flex-shrink:0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
          '<span style="font-size:13px;font-weight:600;color:var(--text)">Bobines à imprimer</span>' +
          '<div style="display:flex;gap:6px">' +
            '<button onclick="leSelectAll()" style="font-size:11px;padding:3px 10px;border-radius:var(--radius);' +
              'border:0.5px solid var(--border2);background:var(--bg3);cursor:pointer;color:var(--text2)">Tout</button>' +
            '<button onclick="leSelectNone()" style="font-size:11px;padding:3px 10px;border-radius:var(--radius);' +
              'border:0.5px solid var(--border2);background:var(--bg3);cursor:pointer;color:var(--text2)">Aucun</button>' +
          '</div>' +
        '</div>' +
        '<div style="max-height:160px;overflow-y:auto">' + filamentList + '</div>' +
      '</div>' +

      // Aperçu
      '<div style="flex:1;overflow:auto;padding:14px;background:var(--bg3)">' +
        '<div style="font-size:11px;color:var(--text3);margin-bottom:10px">Aperçu — première page</div>' +
        '<div id="le-preview" style="transform-origin:top left;display:inline-block">' +
          leRenderPreview() +
        '</div>' +
      '</div>' +

    '</div></div>',
    '🏷 Générateur d\'étiquettes',
    { xl: true }
  );

  setTimeout(leScalePreview, 60);
}

// ── Helpers layout ────────────────────────────────────────────────────────
function sect(title, content) {
  return '<div style="margin-bottom:12px">' +
    '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;' +
      'letter-spacing:0.06em;margin-bottom:6px">' + title + '</div>' +
    content +
  '</div>';
}

function grid2() {
  var fields = Array.prototype.slice.call(arguments);
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + fields.join('') + '</div>';
}

function fld(label, id, val, min, max) {
  return '<div>' +
    '<div style="font-size:10px;color:var(--text3);margin-bottom:2px">' + label + '</div>' +
    '<input type="number" id="' + id + '" value="' + val + '" step="1" min="' + min + '" max="' + max + '" ' +
    'oninput="leUpdate()" style="width:100%;font-size:12px;padding:4px 6px">' +
  '</div>';
}

function chk(label, id, checked) {
  return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;' +
    'padding:3px 0;color:var(--text)">' +
    '<input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') + ' onchange="leUpdate()" ' +
    'style="flex-shrink:0;accent-color:var(--accent);width:14px;height:14px">' +
    label +
  '</label>';
}

// ── Actions ───────────────────────────────────────────────────────────────
function leApplyPreset(idx) {
  const p = LABEL_PRESETS[parseInt(idx)];
  _labelState.preset = parseInt(idx);
  Object.assign(_labelState, {
    cols:p.cols, rows:p.rows, wMm:p.wMm, hMm:p.hMm,
    pageW:p.pageW, pageH:p.pageH,
    marginH:p.marginH, marginV:p.marginV,
    gapH:p.gapH, gapV:p.gapV,
  });
  renderLabelEditor();
}

function leUpdate() {
  const S = _labelState;
  S.cols    = parseFloat(document.getElementById('le-cols')?.value)  || 3;
  S.rows    = parseFloat(document.getElementById('le-rows')?.value)  || 8;
  S.wMm     = parseFloat(document.getElementById('le-w')?.value)     || 63;
  S.hMm     = parseFloat(document.getElementById('le-h')?.value)     || 34;
  S.marginH = parseFloat(document.getElementById('le-mh')?.value)    || 8;
  S.marginV = parseFloat(document.getElementById('le-mv')?.value)    || 13;
  S.gapH    = parseFloat(document.getElementById('le-gh')?.value)    || 0;
  S.gapV    = parseFloat(document.getElementById('le-gv')?.value)    || 0;
  S.startAt = Math.max(1, parseInt(document.getElementById('le-start')?.value)  || 1);
  S.copies  = Math.max(1, parseInt(document.getElementById('le-copies')?.value) || 1);
  S.showQr    = !!document.getElementById('le-qr')?.checked;
  S.showName  = !!document.getElementById('le-name')?.checked;
  S.showBrand = !!document.getElementById('le-brand')?.checked;
  S.showMat   = !!document.getElementById('le-mat')?.checked;
  S.showColor = !!document.getElementById('le-color')?.checked;
  S.showStock = !!document.getElementById('le-stock')?.checked;
  S.showTemp  = !!document.getElementById('le-temp')?.checked;
  S.showLoc   = !!document.getElementById('le-loc')?.checked;
  S.showSpool = !!document.getElementById('le-spool')?.checked;

  const totalLabels = S.selected.size * S.copies;
  const totalCells  = totalLabels + (S.startAt - 1);
  const perPage     = S.cols * S.rows;
  const pages       = Math.max(1, Math.ceil(totalCells / perPage));
  const info = document.getElementById('le-info');
  if (info) info.textContent = totalLabels + ' étiq. · ' + pages + ' page' + (pages>1?'s':'') + ' · départ case ' + S.startAt;

  const prev = document.getElementById('le-preview');
  if (prev) { prev.innerHTML = leRenderPreview(); leScalePreview(); }
}

function leToggle(id, checked) {
  if (checked) _labelState.selected.add(id);
  else         _labelState.selected.delete(id);
  leUpdate();
}

function leSelectAll() {
  _labelState.selected = new Set(allFilaments.filter(function(f){ return !f.archived; }).map(function(f){ return f.id; }));
  renderLabelEditor();
}

function leSelectNone() {
  _labelState.selected = new Set();
  renderLabelEditor();
}

// ── Aperçu ────────────────────────────────────────────────────────────────
function leRenderPreview() {
  const S  = _labelState;
  const PX = 3.7795; // mm → px
  const pw = Math.round(S.pageW  * PX);
  const ph = Math.round(S.pageH  * PX);
  const lw = Math.round(S.wMm   * PX);
  const lh = Math.round(S.hMm   * PX);
  const mh = Math.round(S.marginH * PX);
  const mv = Math.round(S.marginV * PX);
  const gh = Math.round(S.gapH  * PX);
  const gv = Math.round(S.gapV  * PX);

  const filaments = allFilaments.filter(function(f){ return S.selected.has(f.id) && !f.archived; });
  const items = [];
  filaments.forEach(function(f){ for (var c=0;c<S.copies;c++) items.push(f); });

  const cells = [];
  for (var i=0; i<S.startAt-1; i++) cells.push(null);
  items.forEach(function(f){ cells.push(f); });
  const pageItems = cells.slice(0, S.cols * S.rows);

  let html = '<div style="width:'+pw+'px;height:'+ph+'px;background:#fff;position:relative;' +
    'border:1px solid #ccc;box-shadow:0 2px 8px rgba(0,0,0,0.15)">';

  pageItems.forEach(function(f, idx) {
    const col = idx % S.cols;
    const row = Math.floor(idx / S.cols);
    const x   = mh + col * (lw + gh);
    const y   = mv + row * (lh + gv);
    const fs  = Math.max(6, Math.min(9, Math.round(lh / 5.5)));
    const qrW = Math.round(lh * 0.82);

    html += '<div style="position:absolute;left:'+x+'px;top:'+y+'px;width:'+lw+'px;height:'+lh+'px;' +
      'border:0.5px dashed #ccc;overflow:hidden;display:flex;align-items:stretch;box-sizing:border-box">';

    if (f) {
      const pct    = f.weight_total>0 ? Math.round(f.weight_remaining/f.weight_total*100) : 0;
      const barCol = pct<15?'#ef4444':pct<25?'#f59e0b':'#10b981';

      if (S.showQr) {
        html += '<div style="width:'+qrW+'px;min-width:'+qrW+'px;display:flex;align-items:center;' +
          'justify-content:center;background:#f5f5f5;border-right:0.5px solid #ddd">' +
          '<svg viewBox="0 0 21 21" width="'+(qrW-8)+'" height="'+(qrW-8)+'" xmlns="http://www.w3.org/2000/svg">' +
          // QR code simplifié en SVG pour l'aperçu
          '<rect width="21" height="21" fill="white"/>' +
          '<rect x="0" y="0" width="7" height="7" fill="none" stroke="black" stroke-width="1"/>' +
          '<rect x="2" y="2" width="3" height="3" fill="black"/>' +
          '<rect x="14" y="0" width="7" height="7" fill="none" stroke="black" stroke-width="1"/>' +
          '<rect x="16" y="2" width="3" height="3" fill="black"/>' +
          '<rect x="0" y="14" width="7" height="7" fill="none" stroke="black" stroke-width="1"/>' +
          '<rect x="2" y="16" width="3" height="3" fill="black"/>' +
          '<rect x="9" y="0" width="1" height="1" fill="black"/><rect x="11" y="0" width="1" height="1" fill="black"/>' +
          '<rect x="9" y="2" width="3" height="1" fill="black"/><rect x="9" y="4" width="1" height="1" fill="black"/>' +
          '<rect x="11" y="4" width="1" height="1" fill="black"/><rect x="9" y="6" width="3" height="1" fill="black"/>' +
          '<rect x="0" y="9" width="1" height="1" fill="black"/><rect x="2" y="9" width="3" height="1" fill="black"/>' +
          '<rect x="6" y="9" width="1" height="1" fill="black"/><rect x="9" y="9" width="5" height="1" fill="black"/>' +
          '<rect x="15" y="9" width="1" height="3" fill="black"/><rect x="17" y="9" width="1" height="1" fill="black"/>' +
          '<rect x="19" y="9" width="1" height="3" fill="black"/>' +
          '<rect x="0" y="11" width="3" height="1" fill="black"/><rect x="5" y="11" width="3" height="1" fill="black"/>' +
          '<rect x="9" y="11" width="1" height="3" fill="black"/><rect x="11" y="11" width="1" height="1" fill="black"/>' +
          '<rect x="13" y="11" width="1" height="1" fill="black"/><rect x="17" y="11" width="1" height="1" fill="black"/>' +
          '<rect x="9" y="13" width="5" height="1" fill="black"/><rect x="15" y="13" width="1" height="1" fill="black"/>' +
          '<rect x="17" y="13" width="3" height="1" fill="black"/>' +
          '<rect x="9" y="15" width="1" height="1" fill="black"/><rect x="11" y="15" width="3" height="1" fill="black"/>' +
          '<rect x="15" y="15" width="1" height="3" fill="black"/><rect x="17" y="15" width="1" height="3" fill="black"/>' +
          '<rect x="9" y="17" width="1" height="3" fill="black"/><rect x="11" y="17" width="1" height="1" fill="black"/>' +
          '<rect x="13" y="17" width="1" height="3" fill="black"/><rect x="19" y="17" width="1" height="1" fill="black"/>' +
          '<rect x="11" y="19" width="1" height="1" fill="black"/><rect x="19" y="19" width="1" height="1" fill="black"/>' +
          '</svg></div>';
      }

      html += '<div style="flex:1;padding:2px 4px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:1px;min-width:0">';
      if (S.showName)  html += '<div style="font-size:'+(fs+1)+'px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#111">'+f.name+'</div>';
      if (S.showBrand&&f.brand) html += '<div style="font-size:'+fs+'px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.brand+'</div>';
      if (S.showMat)   html += '<div style="font-size:'+fs+'px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.material+(f.elegoo_subtype?' '+f.elegoo_subtype:'')+'</div>';
      if (S.showColor&&f.color_name) html += '<div style="display:flex;align-items:center;gap:2px;font-size:'+fs+'px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+
        '<span style="width:5px;height:5px;border-radius:50%;background:'+(f.color_hex||'#ccc')+';flex-shrink:0;display:inline-block"></span>'+f.color_name+'</div>';
      if (S.showStock) html += '<div style="font-size:'+fs+'px;font-weight:600;color:'+barCol+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+Math.round(f.weight_remaining)+'g / '+f.weight_total+'g</div>'+
        '<div style="height:3px;background:#eee;border-radius:2px;margin:1px 0"><div style="height:100%;width:'+pct+'%;background:'+barCol+';border-radius:2px"></div></div>';
      if (S.showTemp)  html += '<div style="font-size:'+(fs-1)+'px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🌡 '+(f.temp_nozzle_min||'?')+'–'+(f.temp_nozzle_max||'?')+'°C</div>';
      if (S.showLoc&&f.location) html += '<div style="font-size:'+(fs-1)+'px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📍 '+f.location+'</div>';
      if (S.showSpool&&f.spool_number) html += '<div style="font-size:'+(fs-1)+'px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"># '+f.spool_number+'</div>';
      html += '</div>';
    }
    html += '</div>';
  });

  return html + '</div>';
}

function leScalePreview() {
  const wrap = document.querySelector('#le-preview')?.parentElement;
  const prev = document.getElementById('le-preview');
  const child = prev?.firstElementChild;
  if (!wrap || !prev || !child) return;
  const availW = wrap.clientWidth  - 28;
  const availH = wrap.clientHeight - 50;
  const scale  = Math.min(availW / child.offsetWidth, availH / child.offsetHeight, 1);
  prev.style.transform       = 'scale(' + scale + ')';
  prev.style.transformOrigin = 'top left';
  prev.style.height = Math.round(child.offsetHeight * scale) + 'px';
  prev.style.width  = Math.round(child.offsetWidth  * scale) + 'px';
}

// ── Impression ────────────────────────────────────────────────────────────
function lePrint() {
  const S = _labelState;
  const filaments = allFilaments.filter(function(f){ return S.selected.has(f.id) && !f.archived; });
  if (!filaments.length) { toast('Aucune bobine sélectionnée', 'error'); return; }

  const items = [];
  filaments.forEach(function(f){ for (var c=0;c<S.copies;c++) items.push(f); });

  const cells = [];
  for (var i=0; i<S.startAt-1; i++) cells.push(null);
  items.forEach(function(f){ cells.push(f); });

  const perPage  = S.cols * S.rows;
  const baseUrl  = window.location.origin;
  const fs       = Math.max(6, Math.min(10, S.hMm / 5));
  const fsTiny   = Math.max(4, Math.min(7, S.hMm / 7));

  function renderCell(f) {
    if (!f) return '<div class="lc"></div>';
    const pct    = f.weight_total>0 ? Math.round(f.weight_remaining/f.weight_total*100) : 0;
    const barCol = pct<15?'#ef4444':pct<25?'#f59e0b':'#10b981';
    const url    = baseUrl + '/#filament/' + f.id;
    const qid    = 'qr_' + f.id + '_' + Math.random().toString(36).slice(2,6);

    return '<div class="lc">' +
      (S.showQr ? '<div class="lqr" id="'+qid+'" data-url="'+url+'"></div>' : '') +
      '<div class="lt">' +
        (S.showName  ? '<div class="ln">'+f.name+'</div>' : '') +
        (S.showBrand&&f.brand ? '<div class="ls">'+f.brand+'</div>' : '') +
        (S.showMat   ? '<div class="lr">'+f.material+(f.elegoo_subtype?' · '+f.elegoo_subtype:'')+'</div>' : '') +
        (S.showColor&&f.color_name ? '<div class="lr lrc"><span class="dot" style="background:'+(f.color_hex||'#ccc')+'"></span>'+f.color_name+'</div>' : '') +
        (S.showStock ? '<div class="lr lrb" style="color:'+barCol+'">'+Math.round(f.weight_remaining)+'g / '+f.weight_total+'g ('+pct+'%)</div>'+
          '<div class="sb"><div class="sf" style="width:'+pct+'%;background:'+barCol+'"></div></div>' : '') +
        (S.showTemp  ? '<div class="lt2">🌡 Buse '+(f.temp_nozzle_min||'?')+'–'+(f.temp_nozzle_max||'?')+'°C · Plateau '+(f.temp_bed_min||'?')+'–'+(f.temp_bed_max||'?')+'°C</div>' : '') +
        (S.showLoc&&f.location ? '<div class="lt2">📍 '+f.location+'</div>' : '') +
        (S.showSpool&&f.spool_number ? '<div class="lt2">N° '+f.spool_number+'</div>' : '') +
      '</div>' +
    '</div>';
  }

  const pages = [];
  for (var p=0; p<cells.length; p+=perPage) pages.push(cells.slice(p, p+perPage));

  const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
    '<title>Étiquettes filaments</title>' +
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:system-ui,sans-serif;background:#fff}' +
    '.page{width:'+S.pageW+'mm;height:'+S.pageH+'mm;position:relative;overflow:hidden}'+
    '.page+.page{page-break-before:always}' +
    '.grid{position:absolute;top:'+S.marginV+'mm;left:'+S.marginH+'mm;' +
      'display:grid;grid-template-columns:repeat('+S.cols+','+S.wMm+'mm);' +
      'grid-template-rows:repeat('+S.rows+','+S.hMm+'mm);' +
      'column-gap:'+S.gapH+'mm;row-gap:'+S.gapV+'mm}' +
    '.lc{width:'+S.wMm+'mm;height:'+S.hMm+'mm;overflow:hidden;display:flex;align-items:stretch;box-sizing:border-box}' +
    '.lqr{width:'+Math.round(S.hMm*0.82)+'mm;min-width:'+Math.round(S.hMm*0.82)+'mm;height:'+S.hMm+'mm;display:flex;align-items:center;justify-content:center;padding:1.5mm;flex-shrink:0;box-sizing:border-box}' +
    '.lqr canvas{display:block!important;width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important}'+
    '.lqr img{display:none!important}' +
    '.lt{flex:1;padding:1.5mm 2mm;display:flex;flex-direction:column;justify-content:center;gap:0.4mm;overflow:hidden;min-width:0}' +
    '.ln{font-size:'+Math.round(fs)+'pt;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ls{font-size:'+Math.round(fs-1)+'pt;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lr{font-size:'+Math.round(fs-1)+'pt;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.lrb{font-weight:600}' +
    '.lrc{display:flex;align-items:center;gap:1mm}' +
    '.lt2{font-size:'+Math.round(fsTiny)+'pt;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.dot{width:2mm;height:2mm;border-radius:50%;flex-shrink:0;display:inline-block}' +
    '.sb{height:1.5mm;background:#e5e7eb;border-radius:1mm;overflow:hidden}' +
    '.sf{height:100%;border-radius:1mm}' +
    '@media print{@page{margin:0;size:'+S.pageW+'mm '+S.pageH+'mm}body{margin:0;padding:0}.page+.page{page-break-before:always}}' +
    '</style></head><body>' +
    pages.map(function(page) {
      while (page.length < perPage) page.push(null);
      return '<div class="page"><div class="grid">'+page.map(renderCell).join('')+'</div></div>';
    }).join('') +
    '<script>' +
    'document.querySelectorAll("[data-url]").forEach(function(el){' +
    'var qrSz=Math.round(el.offsetHeight);new QRCode(el,{text:el.dataset.url,width:qrSz,height:qrSz,' +
    'colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.M});});' +
    'setTimeout(function(){window.print();},800);' +
    '<\/script></body></html>';

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
