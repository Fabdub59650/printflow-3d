let allPrints = [];
let printsFilters = {
  status: '', printer_id: '',
  // Filtres avancés
  date_from: '', date_to: '',
  filament_id: '', rating: '',
  duration_min: '', duration_max: '',
  weight_min: '', weight_max: '',
  name: '',
};
let _printsAdvancedOpen = false;

async function renderPrints() {
  document.getElementById('page-title').textContent = 'Impressions';
  if (!document.getElementById('prints-filter-style')) {
    const s = document.createElement('style');
    s.id = 'prints-filter-style';
    s.textContent = '.filter-btn{padding:6px 12px;font-size:12px;font-weight:500;border:none;background:transparent;cursor:pointer;color:var(--text2);transition:background 0.12s,color 0.12s}.filter-btn:hover{background:var(--bg3);color:var(--text)}.filter-btn.active{background:var(--text);color:var(--bg2)}';
    document.head.appendChild(s);
  }
  document.getElementById('topbar-actions').innerHTML =
    '<button class="btn btn-primary" onclick="openPrintForm()">+ Nouvelle impression</button>';
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  const [prints, printers] = await Promise.all([
    API.get('/prints?limit=500'),
    API.get('/printers'),
  ]);
  allPrints = prints;
  window._allPrinters = printers;

  // Collecter les filaments uniques pour le filtre avancé
  const filamentMap = {};
  prints.forEach(function(p) {
    if (p.filament_id && p.filament_name) filamentMap[p.filament_id] = p.filament_name;
    if (p.filaments) p.filaments.forEach(function(f) {
      if (f.filament_id && f.filament_name) filamentMap[f.filament_id] = f.filament_name;
    });
  });
  window._printsFilamentMap = filamentMap;

  const activeAdvanced = countActiveAdvancedFilters();

  const statusBtns = [
    { val: '',          label: 'Tous'      },
    { val: 'printing',  label: 'En cours'  },
    { val: 'done',      label: 'Réussies'  },
    { val: 'failed',    label: 'Échouées'  },
    { val: 'paused',    label: 'En pause'  },
    { val: 'cancelled', label: 'Annulées'  },
    { val: 'planned',   label: 'Planifiées'},
  ];

  const filterBar =
    '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">' +
      '<div id="prints-filter-btns" style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">' +
        statusBtns.map(function(b) {
          return '<button class="filter-btn ' + (printsFilters.status === b.val ? 'active' : '') + '" ' +
            'data-val="' + b.val + '" ' +
            'onclick="printsFilters.status=\'' + b.val + '\';renderPrintsTable()">' +
            b.label + '</button>';
        }).join('') +
      '</div>' +
      '<select style="width:180px" onchange="printsFilters.printer_id=this.value;renderPrintsTable()">' +
        '<option value="">Toutes les imprimantes</option>' +
        printers.map(function(p) {
          return '<option value="' + p.id + '"' + (printsFilters.printer_id === String(p.id) ? ' selected' : '') + '>' + p.name + '</option>';
        }).join('') +
      '</select>' +
      '<button onclick="togglePrintsAdvanced()" style="display:flex;align-items:center;gap:6px;' +
        'padding:6px 12px;font-size:12px;border-radius:var(--radius);cursor:pointer;' +
        'border:0.5px solid ' + (activeAdvanced > 0 ? 'var(--accent)' : 'var(--border2)') + ';' +
        'background:' + (activeAdvanced > 0 ? 'var(--accent-bg)' : 'var(--bg3)') + ';' +
        'color:' + (activeAdvanced > 0 ? 'var(--accent)' : 'var(--text2)') + '">' +
        '🔍 Filtres' + (activeAdvanced > 0 ? ' <span style="background:var(--accent);color:#fff;border-radius:10px;padding:0 6px;font-size:10px;font-weight:700">' + activeAdvanced + '</span>' : '') +
      '</button>' +
      (activeAdvanced > 0 || printsFilters.status || printsFilters.printer_id ?
        '<button onclick="resetPrintsFilters()" style="font-size:12px;padding:6px 10px;' +
        'border-radius:var(--radius);border:0.5px solid var(--border2);background:var(--bg3);' +
        'color:var(--text3);cursor:pointer" title="Réinitialiser tous les filtres">↺</button>' : '') +
      '<span id="prints-count" style="font-size:12px;color:var(--text3);margin-left:4px"></span>' +
    '</div>' +
    '<div id="prints-advanced-panel" style="display:' + (_printsAdvancedOpen ? 'block' : 'none') + ';' +
      'background:var(--bg3);border:0.5px solid var(--border2);border-radius:var(--radius);' +
      'padding:14px;margin-bottom:12px">' +
      renderAdvancedPanel() +
    '</div>' +
    '<div id="prints-table-wrap"></div>';

  document.getElementById('content').innerHTML = '<div class="card">' + filterBar + '</div>';
  renderPrintsTable();
}

function renderAdvancedPanel() {
  const filamentMap = window._printsFilamentMap || {};
  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">' +

    // Recherche nom
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Recherche nom / fichier</label>' +
    '<input id="af-name" value="' + (printsFilters.name||'') + '" placeholder="Nom ou fichier…" ' +
    'oninput="printsFilters.name=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

    // Date de
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Date — du</label>' +
    '<input id="af-date-from" type="date" value="' + (printsFilters.date_from||'') + '" ' +
    'onchange="printsFilters.date_from=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

    // Date à
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Date — au</label>' +
    '<input id="af-date-to" type="date" value="' + (printsFilters.date_to||'') + '" ' +
    'onchange="printsFilters.date_to=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

    // Filament
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Filament</label>' +
    '<select id="af-filament" onchange="printsFilters.filament_id=this.value;renderPrintsTable()" style="width:100%;font-size:12px">' +
    '<option value="">Tous</option>' +
    Object.entries(filamentMap).map(function(e) {
      return '<option value="' + e[0] + '"' + (printsFilters.filament_id === e[0] ? ' selected' : '') + '>' + e[1] + '</option>';
    }).join('') +
    '</select></div>' +

    // Note
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Note minimale</label>' +
    '<select id="af-rating" onchange="printsFilters.rating=this.value;renderPrintsTable()" style="width:100%;font-size:12px">' +
    '<option value="">Toutes</option>' +
    [5,4,3,2,1].map(function(r) {
      return '<option value="' + r + '"' + (printsFilters.rating == r ? ' selected' : '') + '>' + '★'.repeat(r) + ' et +</option>';
    }).join('') +
    '</select></div>' +

    // Durée min
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Durée min (min)</label>' +
    '<input id="af-dur-min" type="number" value="' + (printsFilters.duration_min||'') + '" placeholder="ex: 60" ' +
    'oninput="printsFilters.duration_min=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

    // Durée max
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Durée max (min)</label>' +
    '<input id="af-dur-max" type="number" value="' + (printsFilters.duration_max||'') + '" placeholder="ex: 480" ' +
    'oninput="printsFilters.duration_max=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

    // Filament utilisé min
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Filament utilisé min (g)</label>' +
    '<input id="af-w-min" type="number" value="' + (printsFilters.weight_min||'') + '" placeholder="ex: 10" ' +
    'oninput="printsFilters.weight_min=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

    // Filament utilisé max
    '<div><label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Filament utilisé max (g)</label>' +
    '<input id="af-w-max" type="number" value="' + (printsFilters.weight_max||'') + '" placeholder="ex: 500" ' +
    'oninput="printsFilters.weight_max=this.value;renderPrintsTable()" style="width:100%;font-size:12px"></div>' +

  '</div>';
}

function countActiveAdvancedFilters() {
  return ['date_from','date_to','filament_id','rating','duration_min','duration_max','weight_min','weight_max','name']
    .filter(function(k) { return !!printsFilters[k]; }).length;
}

function togglePrintsAdvanced() {
  _printsAdvancedOpen = !_printsAdvancedOpen;
  const panel = document.getElementById('prints-advanced-panel');
  if (panel) panel.style.display = _printsAdvancedOpen ? 'block' : 'none';
  // Mettre à jour le style du bouton
  renderPrints();
}

function resetPrintsFilters() {
  printsFilters = { status: '', printer_id: '', date_from: '', date_to: '',
    filament_id: '', rating: '', duration_min: '', duration_max: '',
    weight_min: '', weight_max: '', name: '' };
  _printsAdvancedOpen = false;
  renderPrints();
}


function renderFilamentCell(p) {
  // Multi-filament
  if (p.filaments && p.filaments.length > 1) {
    const dots = p.filaments.map(function(f) {
      return '<span class="filament-dot" style="background:' + (f.color_hex||'#888') + '" title="' + f.filament_name + '"></span>';
    }).join('');
    return '<span style="display:flex;align-items:center;gap:3px">' + dots +
      '<span style="font-size:11px;color:var(--text3);margin-left:4px">' + p.filaments.length + ' filaments</span></span>';
  }
  // Mono-filament (filaments[0] ou filament_id principal)
  const f = (p.filaments && p.filaments.length === 1) ? p.filaments[0] : p;
  const name = f.filament_name || p.filament_name;
  const hex  = f.color_hex    || p.color_hex;
  if (!name) return '—';
  return '<span style="display:flex;align-items:center;gap:6px">' +
    '<span class="filament-dot" style="background:' + (hex||'#888') + '"></span>' + name + '</span>';
}

function renderPrintsTable() {
  const printers = window._allPrinters || [];
  let data = allPrints;

  // Filtres rapides
  if (printsFilters.status)     data = data.filter(p => p.status === printsFilters.status);
  if (printsFilters.printer_id) data = data.filter(p => String(p.printer_id) === printsFilters.printer_id);

  // Filtres avancés
  if (printsFilters.name) {
    const q = printsFilters.name.toLowerCase();
    data = data.filter(function(p) {
      return (p.name||'').toLowerCase().includes(q) || (p.file_name||'').toLowerCase().includes(q);
    });
  }
  if (printsFilters.date_from) {
    data = data.filter(function(p) { return p.created_at && p.created_at >= printsFilters.date_from; });
  }
  if (printsFilters.date_to) {
    data = data.filter(function(p) { return p.created_at && p.created_at.slice(0,10) <= printsFilters.date_to; });
  }
  if (printsFilters.filament_id) {
    data = data.filter(function(p) {
      if (String(p.filament_id) === printsFilters.filament_id) return true;
      if (p.filaments) return p.filaments.some(function(f) { return String(f.filament_id) === printsFilters.filament_id; });
      return false;
    });
  }
  if (printsFilters.rating) {
    data = data.filter(function(p) { return (p.rating||0) >= parseInt(printsFilters.rating); });
  }
  if (printsFilters.duration_min) {
    data = data.filter(function(p) { return (p.actual_duration||0) >= parseInt(printsFilters.duration_min); });
  }
  if (printsFilters.duration_max) {
    data = data.filter(function(p) { return p.actual_duration && p.actual_duration <= parseInt(printsFilters.duration_max); });
  }
  if (printsFilters.weight_min) {
    data = data.filter(function(p) { return (parseFloat(p.filament_used)||0) >= parseFloat(printsFilters.weight_min); });
  }
  if (printsFilters.weight_max) {
    data = data.filter(function(p) { return p.filament_used && parseFloat(p.filament_used) <= parseFloat(printsFilters.weight_max); });
  }

  // Compteur
  const countEl = document.getElementById('prints-count');
  if (countEl) countEl.textContent = data.length + ' résultat' + (data.length !== 1 ? 's' : '');

  // Mettre à jour l'état actif des boutons de filtre
  document.querySelectorAll('#prints-filter-btns .filter-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.val === printsFilters.status);
  });

  const wrap = document.getElementById('prints-table-wrap');
  if (!data.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Aucune impression trouvée.</p></div>';
    return;
  }
  wrap.innerHTML =
    '<table><thead><tr>' +
      '<th></th><th>Projet</th><th>Imprimante</th><th>Filament</th><th>Note</th>' +
      '<th>Durée</th><th>Consommé</th><th>Coût réel</th><th>Date</th><th>Statut</th><th></th>' +
    '</tr></thead><tbody>' +
    data.map(function(p) {
      const thumbHtml = p.photo_path
        ? '<img src="/api/prints/' + p.id + '/photo?t=' + Date.now() + '" ' +
          'style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer" ' +
          'onclick="openPrintDetail(' + p.id + ')" onerror="this.style.display=\'none\'">'
        : '<div style="width:36px;height:36px;border-radius:4px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;color:var(--text3)" onclick="openPrintDetail(' + p.id + ')">📷</div>';
      return '<tr>' +
        '<td style="width:44px;padding:4px">' + thumbHtml + '</td>' +
        '<td><strong style="font-weight:500">' + p.name + '</strong>' +
          (p.file_name ? '<br><span style="font-size:11px;color:var(--text3)">' + p.file_name + '</span>' : '') + '</td>' +
        '<td>' + (p.printer_name || '—') + '</td>' +
        '<td>' + renderFilamentCell(p) + '</td>' +
        '<td>' + renderStars(p.rating, p.id) + '</td>' +
        '<td>' + fmtDuration(p.actual_duration || p.estimated_duration) + '</td>' +
        '<td>' + (p.filament_used ? p.filament_used + 'g' : '—') + '</td>' +
        '<td style="color:' + (p.real_cost ? 'var(--success)' : 'var(--text3)') + '">' +
          (p.real_cost ? parseFloat(p.real_cost).toFixed(2) + ' €' : '—') +
        '</td>' +
        '<td style="white-space:nowrap">' + fmtDateTime(p.created_at) + '</td>' +
        '<td>' + statusBadge(p.status) + '</td>' +
        '<td><div class="td-actions">' +
          '<button class="btn btn-sm" onclick="openPrintDetail(' + p.id + ')">Détail</button>' +
          '<button class="btn btn-sm" onclick="openPrintForm(' + p.id + ')">✏</button>' +
          '<button class="btn btn-sm" title="Dupliquer" onclick="duplicatePrint(' + p.id + ')">⎘</button>' +
          '<button class="btn btn-sm btn-danger" onclick="deletePrint(' + p.id + ')">✕</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

function costBox(label, value, color) {
  return '<div style="background:var(--bg2);border-radius:var(--radius);padding:10px;text-align:center">' +
    '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">' + label + '</div>' +
    '<div style="font-size:16px;font-weight:700;color:' + color + '">' + value + '</div>' +
  '</div>';
}

async function recalcPrintCost(id) {
  const btn = document.getElementById('btn-recalc-' + id);
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const r = await API.patch('/prints/' + id + '/recalc-cost', {});
    if (r.ok) {
      toast('Coût réel calculé : ' + r.real_cost.toFixed(2) + ' €', 'success');
      openPrintDetail(id); // Recharger la fiche
    }
  } catch(e) {
    toast('Erreur : ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Recalculer'; }
  }
}

async function openPrintDetail(id) {
  const p = await API.get('/prints/' + id);

  // Calculer le coût estimé
  let costHtml = '';
  try {
    const costs = await API.get('/stats/costs?days=3650').catch(() => null);
    if (costs) {
      const pc = costs.prints.find(function(x) { return x.id === id; });
      if (pc) {
        const tot = (parseFloat(pc.cost_filament)||0) + (parseFloat(pc.cost_electricity)||0);
        const fmt = function(v) { return (Math.round(v*100)/100).toFixed(2); };
        costHtml = '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
          '<div class="metric-card" style="flex:1;min-width:100px">' +
            '<div class="metric-label">Coût filament</div>' +
            '<div class="metric-value" style="font-size:16px;color:var(--accent)">' + fmt(parseFloat(pc.cost_filament)||0) + ' €</div>' +
          '</div>' +
          '<div class="metric-card" style="flex:1;min-width:100px">' +
            '<div class="metric-label">Coût électricité</div>' +
            '<div class="metric-value" style="font-size:16px;color:#f59e0b">' + fmt(parseFloat(pc.cost_electricity)||0) + ' €</div>' +
          '</div>' +
          '<div class="metric-card" style="flex:1;min-width:100px">' +
            '<div class="metric-label">Coût total</div>' +
            '<div class="metric-value" style="font-size:16px;font-weight:600">' + fmt(tot) + ' €</div>' +
          '</div>' +
        '</div>';
      }
    }
  } catch(_) {}

  // Section photo
  const photoHtml = '<div style="margin-bottom:14px">' +
    '<div class="form-label" style="margin-bottom:8px">Photo du résultat</div>' +
    (p.photo_path
      ? '<div style="position:relative;display:inline-block">' +
          '<img id="print-photo-' + p.id + '" src="/api/prints/' + p.id + '/photo?t=' + Date.now() + '" ' +
          'style="max-width:100%;max-height:200px;border-radius:var(--radius);object-fit:cover;display:block">' +
          '<button class="btn btn-sm btn-danger" style="position:absolute;top:6px;right:6px;opacity:0.85" ' +
          'onclick="deletePrintPhoto(' + p.id + ')">✕</button>' +
        '</div>'
      : '<div style="background:var(--bg3);border-radius:var(--radius);padding:20px;text-align:center;color:var(--text3);font-size:13px">Aucune photo</div>') +
    '<div style="margin-top:8px;display:flex;gap:8px">' +
      '<label class="btn btn-sm" style="cursor:pointer">' +
        '📷 ' + (p.photo_path ? 'Remplacer' : 'Ajouter une photo') +
        '<input type="file" accept="image/*" style="display:none" onchange="uploadPrintPhoto(' + p.id + ',this)">' +
      '</label>' +
    '</div>' +
  '</div>';

  openModal(
    photoHtml +
    costHtml +
    '<div class="grid-2" style="margin-bottom:14px">' +
      '<div>' +
        '<div class="stat-row"><span class="stat-label">Imprimante</span><span class="stat-val">' + (p.printer_name||'—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Filament(s)</span><span class="stat-val">' + renderFilamentDetail(p) + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Fichier</span><span class="stat-val" style="font-size:12px">' + (p.file_name||'—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Statut</span><span class="stat-val">' + statusBadge(p.status) + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Progression</span><span class="stat-val">' + (p.progress||0) + '%</span></div>' +
        (p.library_object_name ? '<div class="stat-row"><span class="stat-label">📚 Bibliothèque</span><span class="stat-val">' +
          '<a href="#" onclick="closeModal();switchTab(\'library\',document.querySelector(\'[data-tab=library]\'))" ' +
          'style="color:var(--accent);text-decoration:none">' + p.library_object_name + '</a>' +
          (p.library_file_name ? '<br><span style="font-size:11px;color:var(--text3)">' + p.library_file_name + '</span>' : '') +
          '</span></div>' : '') +
      '</div>' +
      '<div>' +
        '<div class="stat-row"><span class="stat-label">Durée estimée</span><span class="stat-val">' + fmtDuration(p.estimated_duration) + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Durée réelle</span><span class="stat-val">' + fmtDuration(p.actual_duration) + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Filament consommé</span><span class="stat-val">' + (p.filament_used ? p.filament_used+'g' : '—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Hauteur couche</span><span class="stat-val">' + (p.layer_height ? p.layer_height+'mm' : '—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Remplissage</span><span class="stat-val">' + (p.infill_percent ? p.infill_percent+'%' : '—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Temp. buse</span><span class="stat-val">' + (p.print_temp ? p.print_temp+'°C' : '—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">Temp. plateau</span><span class="stat-val">' + (p.bed_temp ? p.bed_temp+'°C' : '—') + '</span></div>' +
      '</div>' +
    '</div>' +

    // ── Coût réel ──────────────────────────────────────────────────────────
    (p.status === 'done' ? (function() {
      const hasRealCost = p.real_cost !== null && p.real_cost !== undefined;
      const canCalc     = p.filament_used || p.actual_duration;
      const rc  = hasRealCost ? parseFloat(p.real_cost) : null;
      const rfc = hasRealCost ? parseFloat(p.real_filament_cost || 0) : null;
      const rec = hasRealCost ? parseFloat(p.real_electricity_cost || 0) : null;

      return '<div style="background:var(--bg3);border-radius:var(--radius);padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
          '<div style="font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.05em">Coût réel</div>' +
          (canCalc ? '<button class="btn btn-sm" onclick="recalcPrintCost(' + p.id + ')" id="btn-recalc-' + p.id + '">Recalculer</button>' : '') +
        '</div>' +
        (hasRealCost ? (
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' +
            costBox('Matière',     rfc !== null ? rfc.toFixed(3) + ' €' : '—', '#3b82f6') +
            costBox('Électricité', rec !== null ? rec.toFixed(3) + ' €' : '—', '#8b5cf6') +
            costBox('Total réel',  rc  !== null ? rc.toFixed(2)  + ' €' : '—', '#10b981') +
          '</div>'
        ) : (
          canCalc
            ? '<div style="font-size:13px;color:var(--text3);text-align:center;padding:8px 0">' +
                'Coût non calculé — <a href="#" onclick="recalcPrintCost(' + p.id + ');return false" style="color:var(--accent)">Calculer maintenant</a>' +
              '</div>'
            : '<div style="font-size:13px;color:var(--text3);text-align:center;padding:8px 0">' +
                'Renseignez le filament consommé et la durée réelle pour calculer le coût.' +
              '</div>'
        )) +
      '</div>';
    })() : '') +
    (p.notes ? '<div style="margin-bottom:12px"><div class="form-label" style="margin-bottom:6px">Notes</div><div style="font-size:13px;color:var(--text2);background:var(--bg3);padding:10px;border-radius:var(--radius)">' + p.notes + '</div></div>' : '') +
    '<div style="margin-bottom:12px;display:flex;align-items:center;gap:10px">' +
      '<div class="form-label" style="margin:0">Note</div>' +
      renderStarsEditable(p.rating, p.id) +
    '</div>' +
    '<div style="font-size:12px;color:var(--text3);margin-bottom:4px">' +
      'Créée : ' + fmtDateTime(p.created_at) + ' · ' +
      'Débutée : ' + fmtDateTime(p.started_at) + ' · ' +
      'Terminée : ' + fmtDateTime(p.finished_at) +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Fermer</button>' +
      '<button class="btn" onclick="exportPrintPDF(' + p.id + ')">↓ PDF</button>' +
      '<button class="btn" onclick="closeModal();duplicatePrint(' + p.id + ')">⎘ Dupliquer</button>' +
      '<button class="btn btn-primary" onclick="closeModal();openPrintForm(' + p.id + ')">Modifier</button>' +
    '</div>',
    p.name
  );
}

async function openPrintForm(id = null, prefillProjectId = null, defaultStatus = null, isDuplicate = false) {
  const [printers, filaments, projects, libraryObjects] = await Promise.all([
    API.get('/printers'),
    API.get('/filaments'),
    window._projectsEnabled ? API.get('/projects') : Promise.resolve([]),
    API.get('/library/objects').catch(() => []),
  ]);
  const p = id ? allPrints.find(x => x.id === id) || await API.get('/prints/' + id) : {};
  if (!id && defaultStatus) p.status = defaultStatus;
  // Appliquer les données source si duplication
  if (isDuplicate && window._duplicateSource) {
    Object.assign(p, window._duplicateSource);
    window._duplicateSource = null;
  }
  const selectedProject = prefillProjectId || p.project_id || '';
  const selectedObject  = p.library_object_id || '';

  openModal(`
    <!-- ── Identification ───────────────────────────────── -->
    <div style="margin-bottom:12px">
      <label class="form-label">Nom *</label>
      <input id="prf-name" value="${p.name||''}" placeholder="Nom de l'impression">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      ${window._projectsEnabled ? `
      <div>
        <label class="form-label">Projet</label>
        <select id="prf-project">
          <option value="">— Aucun —</option>
          ${projects.map(pj => `<option value="${pj.id}" ${selectedProject==pj.id?'selected':''}>${pj.code} — ${pj.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="form-label">Pièce dans le projet</label>
        <input id="prf-item-name" value="${p.project_item_name||''}" placeholder="ex: Couvercle…">
      </div>` : ''}
      <div>
        <label class="form-label">Objet bibliothèque</label>
        <select id="prf-library-object" onchange="onLibraryObjectChange(this)">
          <option value="">— Aucun lien —</option>
          ${libraryObjects.map(o => `<option value="${o.id}" ${selectedObject==o.id?'selected':''}>${o.name}</option>`).join('')}
        </select>
      </div>
      <div id="prf-library-file-wrap" style="${selectedObject?'':'visibility:hidden'}">
        <label class="form-label">Fichier utilisé</label>
        <select id="prf-library-file">
          <option value="">— Sélectionner —</option>
        </select>
      </div>
    </div>

    <!-- ── Matériel ──────────────────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Matériel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label class="form-label">Imprimante</label>
          <select id="prf-printer">
            <option value="">— Sélectionner —</option>
            ${printers.map(pr => `<option value="${pr.id}" ${p.printer_id==pr.id?'selected':''}>${pr.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Fichier source</label>
          <input id="prf-file" value="${p.file_name||''}" placeholder="fichier.stl">
        </div>
      </div>
    </div>

    <!-- ── Filaments ─────────────────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase">Filaments</div>
        <div style="display:flex;gap:6px">
          <button type="button" class="btn btn-sm" style="font-size:11px"
            onclick="nfcWaitForFilament(function(f){ addFilamentRow(f.id, f.name, f.color_hex); })">📡 NFC</button>
          <button type="button" class="btn btn-sm" onclick="addFilamentRow()">+ Filament</button>
        </div>
      </div>
      <div id="prf-filaments-list" style="display:flex;flex-direction:column;gap:6px"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
        <span style="font-size:11px;color:var(--text3)">Total consommé :</span>
        <input id="prf-grams" type="number" step="0.1" readonly
               style="width:80px;background:var(--bg3);color:var(--text3);cursor:not-allowed;font-weight:500"
               value="${p.filament_used||''}">
        <span style="font-size:11px;color:var(--text3)">g (auto)</span>
      </div>
    </div>

    <!-- ── Suivi ─────────────────────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Suivi</div>
      <!-- Ligne 1 : Statut + Date planifiée -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label class="form-label">Statut</label>
          <select id="prf-status" onchange="togglePlannedAt(this.value)">
            ${['planned','queued','printing','paused','done','failed','cancelled'].map(s =>
              `<option value="${s}" ${(p.status||'queued')==s?'selected':''}>${statusBadge(s).replace(/<[^>]+>/g,'').trim()}</option>`).join('')}
          </select>
        </div>
        <div id="prf-planned-at-wrap" style="display:${(p.status==='planned')?'block':'none'}">
          <label class="form-label">Date planifiée</label>
          <input id="prf-planned-at" type="date"
            value="${p.planned_at ? p.planned_at.slice(0,10) : ''}">
        </div>
      </div>
      <!-- Ligne 2 : Progression + Durées -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div>
          <label class="form-label">Progression (%)</label>
          <input id="prf-progress" type="number" min="0" max="100" value="${p.progress||0}">
        </div>
        <div>
          <label class="form-label">Durée estimée (min)</label>
          <input id="prf-edur" type="number" value="${p.estimated_duration||''}">
        </div>
        <div>
          <label class="form-label">Durée réelle (min)</label>
          <input id="prf-adur" type="number" value="${p.actual_duration||''}">
        </div>
      </div>
    </div>

    <!-- ── Paramètres impression ──────────────────────────  -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Paramètres impression</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
        <div>
          <label class="form-label">Couche (mm)</label>
          <input id="prf-layer" type="number" step="0.01" value="${p.layer_height||''}">
        </div>
        <div>
          <label class="form-label">Remplissage (%)</label>
          <input id="prf-infill" type="number" value="${p.infill_percent||''}">
        </div>
        <div>
          <label class="form-label">Temp. buse (°C)</label>
          <input id="prf-tnoz" type="number" value="${p.print_temp||''}">
        </div>
        <div>
          <label class="form-label">Temp. plateau (°C)</label>
          <input id="prf-tbed" type="number" value="${p.bed_temp||''}">
        </div>
      </div>
    </div>

    <!-- ── Notes ─────────────────────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px">
      <label class="form-label">Notes</label>
      <textarea id="prf-notes" style="min-height:60px">${p.notes||''}</textarea>
    </div>

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePrint(${id||'null'})">Enregistrer</button>
    </div>`, id ? 'Modifier impression' : 'Nouvelle impression');

  // Charger les fichiers si un objet est déjà sélectionné
  if (selectedObject) {
    loadLibraryFilesForPrint(selectedObject, p.library_file_id);
  }

  // Initialiser les lignes filament
  window._printFilaments = filaments; // stocker pour les selects
  const existingFilaments = p.filaments && p.filaments.length > 0
    ? p.filaments
    : (p.filament_id ? [{ filament_id: p.filament_id, filament_name: p.filament_name,
        color_hex: p.color_hex, quantity_estimated: p.filament_used, quantity_actual: p.filament_used }] : []);
  existingFilaments.forEach(function(f) {
    addFilamentRow(f.filament_id, f.filament_name, f.color_hex, f.quantity_estimated, f.quantity_actual);
  });
  if (existingFilaments.length === 0) addFilamentRow();
}

async function savePrint(id) {
  // Collecter les filaments depuis les lignes dynamiques
  const rows = document.querySelectorAll('#prf-filaments-list .prf-filament-row');
  const filaments = [];
  rows.forEach(function(row) {
    const sel = row.querySelector('.prf-fil-select');
    const est = row.querySelector('.prf-fil-est');
    const act = row.querySelector('.prf-fil-act');
    if (sel && sel.value) {
      filaments.push({
        filament_id:        sel.value,
        quantity_estimated: est?.value || null,
        quantity_actual:    act?.value || null,
      });
    }
  });

  const body = {
    name:              document.getElementById('prf-name').value,
    printer_id:        document.getElementById('prf-printer').value || null,
    filament_id:       filaments.length > 0 ? filaments[0].filament_id : null,
    filament_used:     filaments.reduce(function(s,f) { return s + (parseFloat(f.quantity_actual)||0); }, 0) || null,
    filaments:         filaments,
    project_id:        document.getElementById('prf-project').value || null,
    project_item_name: document.getElementById('prf-item-name').value || null,
    library_object_id: document.getElementById('prf-library-object')?.value || null,
    library_file_id:   document.getElementById('prf-library-file')?.value || null,
    status:            document.getElementById('prf-status').value,
    planned_at:        document.getElementById('prf-planned-at')?.value || null,
    progress:          document.getElementById('prf-progress').value || 0,
    estimated_duration: document.getElementById('prf-edur').value || null,
    actual_duration:    document.getElementById('prf-adur').value || null,
    file_name:          document.getElementById('prf-file').value,
    layer_height:       document.getElementById('prf-layer').value || null,
    infill_percent:     document.getElementById('prf-infill').value || null,
    print_temp:         document.getElementById('prf-tnoz').value || null,
    bed_temp:           document.getElementById('prf-tbed').value || null,
    notes:              document.getElementById('prf-notes').value,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    if (id) await API.put('/prints/' + id, body);
    else await API.post('/prints', body);
    closeModal();
    toast(id ? 'Impression mise à jour' : 'Impression ajoutée', 'success');
    // Revenir sur le bon onglet selon d'où on vient
    if (currentTab === 'schedule') renderSchedule();
    else if (currentTab === 'gallery') renderGallery();
    else renderPrints();
  } catch (e) { toast(e.message, 'error'); }
}

async function duplicatePrint(id) {
  try {
    const src = allPrints.find(function(p) { return p.id === id; })
              || await API.get('/prints/' + id);

    // Ouvrir le formulaire pré-rempli avec les données source
    // On passe l'objet source via une variable temporaire
    window._duplicateSource = {
      name:               src.name + ' (copie)',
      printer_id:         src.printer_id,
      filament_id:        src.filament_id,
      file_name:          src.file_name,
      estimated_duration: src.estimated_duration,
      layer_height:       src.layer_height,
      infill_percent:     src.infill_percent,
      print_temp:         src.print_temp,
      bed_temp:           src.bed_temp,
      notes:              src.notes,
      project_id:         src.project_id,
      library_object_id:  src.library_object_id,
      library_file_id:    src.library_file_id,
      // Statut remis à queued, dates effacées
      status:             'queued',
      planned_at:         null,
    };

    await openPrintForm(null, null, null, true);
  } catch(e) { toast('Erreur duplication : ' + e.message, 'error'); }
}

async function deletePrint(id) {
  confirmDelete('Supprimer cette impression ?', async () => {
    try {
      await API.del('/prints/' + id);
      toast('Impression supprimée');
      if (currentTab === 'schedule') renderSchedule();
      else if (currentTab === 'gallery') renderGallery();
      else renderPrints();
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ── Photo impression ────────────────────────────────────────────────────────
async function uploadPrintPhoto(id, input) {
  if (!input.files || !input.files[0]) return;
  const fd = new FormData();
  fd.append('photo', input.files[0]);
  try {
    toast('Upload en cours…');
    const r = await fetch('/api/prints/' + id + '/photo', { method: 'POST', body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erreur upload');
    toast('Photo enregistrée ✓', 'success');
    closeModal();
    openPrintDetail(id);
    renderPrints();
  } catch(e) { toast(e.message, 'error'); }
}

async function deletePrintPhoto(id) {
  confirmDelete('Supprimer la photo de cette impression ?', async function() {
    try {
      await API.del('/prints/' + id + '/photo');
      toast('Photo supprimée', 'success');
      closeModal();
      openPrintDetail(id);
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── Export PDF fiche impression ─────────────────────────────────────────────
async function exportPrintPDF(id) {
  // jsPDF UMD s'expose sous window.jspdf.jsPDF
  const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if (typeof jsPDFClass === 'undefined') {
    toast('jsPDF non disponible', 'error'); return;
  }
  try {
    const p = await API.get('/prints/' + id);
    const doc = new jsPDFClass({ unit: 'mm', format: 'a4' });
    const W = 210, M = 15;
    let y = M;

    // En-tête
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('PrintFlow 3D — Fiche Impression', M, 10);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Généré le ' + new Date().toLocaleDateString('fr-FR'), M, 17);
    y = 30;

    // Titre impression
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(p.name || 'Impression', M, y); y += 8;

    // Statut
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Statut : ' + (p.status || '—') + '   Créée : ' + new Date(p.created_at).toLocaleDateString('fr-FR'), M, y);
    y += 10;

    // Photo si présente
    if (p.photo_path) {
      try {
        const imgResp = await fetch('/api/prints/' + id + '/photo');
        const blob = await imgResp.blob();
        const b64 = await new Promise(function(res) {
          const reader = new FileReader();
          reader.onloadend = function() { res(reader.result); };
          reader.readAsDataURL(blob);
        });
        const ext = blob.type.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(b64, ext, M, y, 80, 60);
        y += 66;
      } catch(_) {}
    }

    // Grille infos
    doc.setFillColor(245, 247, 250);
    doc.rect(M, y, W - M*2, 8, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Paramètres d\'impression', M + 2, y + 5.5); y += 12;

    const rows = [
      ['Imprimante',      p.printer_name  || '—'],
      ['Filament',        p.filament_name || '—'],
      ['Fichier',         p.file_name     || '—'],
      ['Durée estimée',   p.estimated_duration ? Math.floor(p.estimated_duration/60)+'h'+String(p.estimated_duration%60).padStart(2,'0') : '—'],
      ['Durée réelle',    p.actual_duration    ? Math.floor(p.actual_duration/60)+'h'+String(p.actual_duration%60).padStart(2,'0')    : '—'],
      ['Filament utilisé',p.filament_used      ? p.filament_used + ' g' : '—'],
      ['Hauteur couche',  p.layer_height       ? p.layer_height + ' mm' : '—'],
      ['Remplissage',     p.infill_percent     ? p.infill_percent + ' %' : '—'],
      ['Temp. buse',      p.print_temp         ? p.print_temp + ' °C'   : '—'],
      ['Temp. plateau',   p.bed_temp           ? p.bed_temp  + ' °C'    : '—'],
    ];

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    rows.forEach(function(row, i) {
      if (i % 2 === 0) { doc.setFillColor(250,250,250); doc.rect(M, y-4, W-M*2, 7, 'F'); }
      doc.setTextColor(100,100,100); doc.text(row[0], M+2, y);
      doc.setTextColor(30,30,30);    doc.text(row[1], M+55, y);
      y += 7;
    });

    // Coûts
    try {
      const costs = await API.get('/stats/costs?days=3650').catch(() => null);
      if (costs) {
        const pc = costs.prints.find(function(x) { return x.id === id; });
        if (pc) {
          y += 4;
          doc.setFillColor(245, 247, 250);
          doc.rect(M, y, W-M*2, 8, 'F');
          doc.setTextColor(59, 130, 246);
          doc.setFontSize(10); doc.setFont('helvetica', 'bold');
          doc.text('Coûts estimés', M+2, y+5.5); y += 12;
          const fmt = function(v) { return (Math.round(v*100)/100).toFixed(2) + ' €'; };
          const tot = (parseFloat(pc.cost_filament)||0) + (parseFloat(pc.cost_electricity)||0);
          const costRows = [
            ['Coût filament',     fmt(parseFloat(pc.cost_filament)||0)],
            ['Coût électricité',  fmt(parseFloat(pc.cost_electricity)||0)],
            ['Coût total',        fmt(tot)],
          ];
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
          costRows.forEach(function(row, i) {
            if (i % 2 === 0) { doc.setFillColor(250,250,250); doc.rect(M, y-4, W-M*2, 7, 'F'); }
            doc.setTextColor(100,100,100); doc.text(row[0], M+2, y);
            doc.setTextColor(30,30,30);    doc.text(row[1], M+55, y);
            y += 7;
          });
        }
      }
    } catch(_) {}

    // Notes
    if (p.notes) {
      y += 4;
      doc.setFillColor(245, 247, 250);
      doc.rect(M, y, W-M*2, 8, 'F');
      doc.setTextColor(59,130,246);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Notes', M+2, y+5.5); y += 12;
      doc.setTextColor(60,60,60); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(p.notes, W - M*2 - 4);
      doc.text(lines, M+2, y);
    }

    // Footer
    doc.setTextColor(150,150,150); doc.setFontSize(8);
    doc.text('PrintFlow v1.9.0 — ' + window.location.hostname, M, 290);

    doc.save('impression_' + p.name.replace(/[^a-z0-9]/gi,'_') + '.pdf');
    toast('PDF généré ✓', 'success');
  } catch(e) { toast('Erreur PDF : ' + e.message, 'error'); }
}

// ── Lien bibliothèque ───────────────────────────────────────────────────────
async function onLibraryObjectChange(sel) {
  const objectId = sel.value;
  const wrap = document.getElementById('prf-library-file-wrap');
  const fileSelect = document.getElementById('prf-library-file');
  if (!objectId) {
    if (wrap) wrap.style.display = 'none';
    if (fileSelect) fileSelect.innerHTML = '<option value="">— Sélectionner un fichier —</option>';
    return;
  }
  if (wrap) wrap.style.display = '';
  await loadLibraryFilesForPrint(objectId, null);
}

async function loadLibraryFilesForPrint(objectId, selectedFileId) {
  const fileSelect = document.getElementById('prf-library-file');
  const wrap = document.getElementById('prf-library-file-wrap');
  if (!fileSelect) return;
  try {
    const files = await API.get('/library/files?object_id=' + objectId).catch(() => []);
    fileSelect.innerHTML = '<option value="">— Sélectionner un fichier —</option>' +
      files.map(function(f) {
        const sel = selectedFileId && String(f.id) === String(selectedFileId) ? ' selected' : '';
        const label = f.name || f.original_name || 'Fichier #' + f.id;
        return '<option value="' + f.id + '"' + sel + '>' + label + '</option>';
      }).join('');
    if (wrap) wrap.style.display = files.length ? '' : 'none';
  } catch(_) {}
}

// ── Multi-filaments ──────────────────────────────────────────────────────────
var _filamentRowCounter = 0;

function addFilamentRow(filamentId, filamentName, colorHex, qtyEst, qtyAct) {
  const list = document.getElementById('prf-filaments-list');
  if (!list) return;
  const filaments = window._printFilaments || [];
  const rowId = ++_filamentRowCounter;

  const options = filaments.map(function(f) {
    const sel = String(f.id) === String(filamentId) ? ' selected' : '';
    return '<option value="' + f.id + '"' + sel + '>' +
      f.name + ' — ' + Math.round(f.weight_remaining) + 'g</option>';
  }).join('');

  const row = document.createElement('div');
  row.className = 'prf-filament-row';
  row.style.cssText = 'display:flex;flex-direction:column;gap:6px;background:var(--bg3);padding:10px;border-radius:var(--radius)';
  row.innerHTML =
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<div style="width:10px;height:10px;border-radius:50%;background:' + (colorHex||'#888') + ';flex-shrink:0" id="prf-fil-dot-' + rowId + '"></div>' +
      '<select class="prf-fil-select" style="flex:1" onchange="updateFilamentDot(this,' + rowId + ')">' +
        '<option value="">— Filament —</option>' + options +
      '</select>' +
      '<button type="button" class="btn btn-sm btn-danger" onclick="this.closest(\'.prf-filament-row\').remove()" style="flex-shrink:0">✕</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
      '<div style="flex:1">' +
        '<div style="font-size:11px;color:var(--text3);margin-bottom:3px">Estimé (g)</div>' +
        '<input class="prf-fil-est" type="number" step="0.1" placeholder="0" style="width:100%" value="' + (qtyEst||'') + '">' +
      '</div>' +
      '<div style="flex:1">' +
        '<div style="font-size:11px;color:var(--text3);margin-bottom:3px">Réel (g)</div>' +
        '<input class="prf-fil-act" type="number" step="0.1" placeholder="0" style="width:100%" value="' + (qtyAct||'') + '" oninput="updateTotalFilament()">' +
      '</div>' +
    '</div>';

  list.appendChild(row);
}

function updateFilamentDot(sel, rowId) {
  const dot = document.getElementById('prf-fil-dot-' + rowId);
  if (!dot) return;
  const filaments = window._printFilaments || [];
  const f = filaments.find(function(x) { return String(x.id) === sel.value; });
  dot.style.background = (f && f.color_hex) ? f.color_hex : '#888';
}

function renderFilamentDetail(p) {
  const filaments = p.filaments && p.filaments.length > 0 ? p.filaments : null;

  if (!filaments) {
    // Ancien format mono-filament
    if (!p.filament_name) return '—';
    return '<span style="display:flex;align-items:center;gap:6px">' +
      '<span style="width:10px;height:10px;border-radius:50%;background:' + (p.color_hex||'#888') + ';display:inline-block"></span>' +
      p.filament_name + (p.filament_used ? ' · ' + p.filament_used + 'g' : '') + '</span>';
  }

  if (filaments.length === 1) {
    const f = filaments[0];
    const qty = f.quantity_actual || f.quantity_estimated;
    return '<span style="display:flex;align-items:center;gap:6px">' +
      '<span style="width:10px;height:10px;border-radius:50%;background:' + (f.color_hex||'#888') + ';display:inline-block"></span>' +
      f.filament_name + (qty ? ' · ' + qty + 'g' : '') + '</span>';
  }

  // Multi-filament — tableau compact
  const total = filaments.reduce(function(s, f) { return s + (parseFloat(f.quantity_actual)||0); }, 0);
  return '<div style="display:flex;flex-direction:column;gap:4px;width:100%">' +
    filaments.map(function(f, i) {
      const est = f.quantity_estimated ? parseFloat(f.quantity_estimated).toFixed(1) : '—';
      const act = f.quantity_actual    ? parseFloat(f.quantity_actual).toFixed(1)    : '—';
      const diff = (f.quantity_estimated && f.quantity_actual)
        ? parseFloat(f.quantity_actual) - parseFloat(f.quantity_estimated)
        : null;
      const diffCol = diff === null ? '' : diff > 2 ? '#ef4444' : diff < -2 ? '#3b82f6' : '#10b981';
      return '<div style="display:flex;align-items:center;gap:6px;font-size:12px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + (f.color_hex||'#888') + ';flex-shrink:0;display:inline-block"></span>' +
        '<span style="flex:1">' + f.filament_name + '</span>' +
        '<span style="color:var(--text3)">' + est + 'g → </span>' +
        '<span style="font-weight:500">' + act + 'g</span>' +
        (diff !== null ? '<span style="color:' + diffCol + ';font-size:11px">' + (diff>0?'+':'') + diff.toFixed(1) + 'g</span>' : '') +
      '</div>';
    }).join('') +
    (total > 0 ? '<div style="font-size:11px;color:var(--text3);border-top:0.5px solid var(--border);padding-top:4px;margin-top:2px">Total : <strong>' + total.toFixed(1) + 'g</strong></div>' : '') +
  '</div>';
}

function updateTotalFilament() {
  const rows = document.querySelectorAll('#prf-filaments-list .prf-filament-row');
  let total = 0;
  rows.forEach(function(row) {
    const act = row.querySelector('.prf-fil-act');
    if (act && act.value) total += parseFloat(act.value) || 0;
  });
  const gramsEl = document.getElementById('prf-grams');
  if (gramsEl) gramsEl.value = total > 0 ? total.toFixed(1) : '';
}

// ── Notation étoiles ─────────────────────────────────────────────────────────
function renderStars(rating, printId) {
  if (!rating) return '<span style="color:var(--text3);font-size:13px">—</span>';
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const color = rating >= 4 ? '#f59e0b' : rating >= 3 ? '#fb923c' : '#94a3b8';
  return '<span style="color:' + color + ';font-size:14px;cursor:pointer;letter-spacing:1px" ' +
    'onclick="openPrintDetail(' + printId + ')" title="' + rating + '/5">' + stars + '</span>';
}

function renderStarsEditable(rating, printId) {
  let html = '<div style="display:flex;align-items:center;gap:4px">';
  for (let i = 1; i <= 5; i++) {
    const filled = rating && i <= rating;
    html += '<span id="star-' + printId + '-' + i + '" ' +
      'style="font-size:22px;cursor:pointer;color:' + (filled ? '#f59e0b' : '#d1d5db') + ';transition:color 0.1s" ' +
      'onmouseover="hoverStars(' + printId + ',' + i + ')" ' +
      'onmouseout="resetStars(' + printId + ',' + (rating||0) + ')" ' +
      'onclick="ratePrint(' + printId + ',' + i + ')">★</span>';
  }
  html += '</div>';
  if (rating) {
    html += '<button onclick="ratePrint(' + printId + ',null)" ' +
      'style="font-size:11px;color:var(--text3);background:none;border:none;cursor:pointer;padding:0 4px" ' +
      'title="Supprimer la note">✕</button>';
  }
  return html;
}

function hoverStars(printId, upTo) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('star-' + printId + '-' + i);
    if (el) el.style.color = i <= upTo ? '#fbbf24' : '#d1d5db';
  }
}

function resetStars(printId, currentRating) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('star-' + printId + '-' + i);
    if (el) el.style.color = (currentRating && i <= currentRating) ? '#f59e0b' : '#d1d5db';
  }
}

async function ratePrint(printId, rating) {
  try {
    await API.patch('/prints/' + printId + '/rating', { rating });
    toast(rating ? rating + ' étoile' + (rating > 1 ? 's' : '') + ' enregistré ✓' : 'Note supprimée', 'success');
    // Rafraîchir la fiche détail et le tableau
    openPrintDetail(printId);
    renderPrints();
  } catch(e) { toast(e.message, 'error'); }
}

function togglePlannedAt(status) {
  var wrap = document.getElementById('prf-planned-at-wrap');
  if (wrap) wrap.style.display = status === 'planned' ? 'block' : 'none';
  // Pré-remplir demain si vide
  if (status === 'planned') {
    var input = document.getElementById('prf-planned-at');
    if (input && !input.value) {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      // Utiliser les composantes locales pour éviter le décalage UTC
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      input.value = yyyy + '-' + mm + '-' + dd;
    }
  }
}
