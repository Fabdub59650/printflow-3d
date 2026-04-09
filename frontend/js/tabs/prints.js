let allPrints = [];
let printsFilters = { status: '', printer_id: '' };

async function renderPrints() {
  document.getElementById('page-title').textContent = 'Impressions';
  // Injecter les styles filter-btn si besoin
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
    API.get('/prints?limit=200'),
    API.get('/printers'),
  ]);
  allPrints = prints;
  window._allPrinters = printers;

  const statusBtns = [
    { val: '',          label: 'Tous'      },
    { val: 'printing',  label: 'En cours'  },
    { val: 'done',      label: 'Réussies'  },
    { val: 'failed',    label: 'Échouées'  },
    { val: 'paused',    label: 'En pause'  },
    { val: 'cancelled', label: 'Annulées'  },
  ];

  const filterBar =
    '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">' +
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
    '</div>' +
    '<div id="prints-table-wrap"></div>';

  document.getElementById('content').innerHTML = '<div class="card">' + filterBar + '</div>';
  renderPrintsTable();
}

function renderPrintsTable() {
  const printers = window._allPrinters || [];
  let data = allPrints;
  if (printsFilters.status) data = data.filter(p => p.status === printsFilters.status);
  if (printsFilters.printer_id) data = data.filter(p => String(p.printer_id) === printsFilters.printer_id);

  // Mettre à jour l'état actif des boutons de filtre
  document.querySelectorAll('#prints-filter-btns .filter-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.val === printsFilters.status);
  });

  const wrap = document.getElementById('prints-table-wrap');
  if (!data.length) {
    wrap.innerHTML = '<div class="empty-state"><p>Aucune impression trouvée.</p></div>';
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr>
        <th>Projet</th><th>Imprimante</th><th>Filament</th>
        <th>Durée</th><th>Consommé</th><th>Date</th><th>Statut</th><th></th>
      </tr></thead>
      <tbody>
        ${data.map(p => `<tr>
          <td><strong style="font-weight:500">${p.name}</strong>${p.file_name ? `<br><span style="font-size:11px;color:var(--text3)">${p.file_name}</span>` : ''}</td>
          <td>${p.printer_name || '—'}</td>
          <td>${p.filament_name ? `<span style="display:flex;align-items:center;gap:6px"><span class="filament-dot" style="background:${p.color_hex}"></span>${p.filament_name}</span>` : '—'}</td>
          <td>${fmtDuration(p.actual_duration || p.estimated_duration)}</td>
          <td>${p.filament_used ? p.filament_used + 'g' : '—'}</td>
          <td style="white-space:nowrap">${fmtDateTime(p.created_at)}</td>
          <td>${statusBadge(p.status)}</td>
          <td><div class="td-actions">
            <button class="btn btn-sm" onclick="openPrintDetail(${p.id})">Détail</button>
            <button class="btn btn-sm" onclick="openPrintForm(${p.id})">✏</button>
            <button class="btn btn-sm btn-danger" onclick="deletePrint(${p.id})">✕</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function openPrintDetail(id) {
  const p = await API.get('/prints/' + id);
  openModal(`
    <div class="grid-2" style="margin-bottom:16px">
      <div>
        <div class="stat-row"><span class="stat-label">Imprimante</span><span class="stat-val">${p.printer_name||'—'}</span></div>
        <div class="stat-row"><span class="stat-label">Filament</span><span class="stat-val">${p.filament_name||'—'}</span></div>
        <div class="stat-row"><span class="stat-label">Fichier</span><span class="stat-val" style="font-size:12px">${p.file_name||'—'}</span></div>
        <div class="stat-row"><span class="stat-label">Statut</span><span class="stat-val">${statusBadge(p.status)}</span></div>
        <div class="stat-row"><span class="stat-label">Progression</span><span class="stat-val">${p.progress||0}%</span></div>
      </div>
      <div>
        <div class="stat-row"><span class="stat-label">Durée estimée</span><span class="stat-val">${fmtDuration(p.estimated_duration)}</span></div>
        <div class="stat-row"><span class="stat-label">Durée réelle</span><span class="stat-val">${fmtDuration(p.actual_duration)}</span></div>
        <div class="stat-row"><span class="stat-label">Filament consommé</span><span class="stat-val">${p.filament_used ? p.filament_used+'g' : '—'}</span></div>
        <div class="stat-row"><span class="stat-label">Hauteur couche</span><span class="stat-val">${p.layer_height ? p.layer_height+'mm' : '—'}</span></div>
        <div class="stat-row"><span class="stat-label">Remplissage</span><span class="stat-val">${p.infill_percent ? p.infill_percent+'%' : '—'}</span></div>
        <div class="stat-row"><span class="stat-label">Temp. buse</span><span class="stat-val">${p.print_temp ? p.print_temp+'°C' : '—'}</span></div>
        <div class="stat-row"><span class="stat-label">Temp. plateau</span><span class="stat-val">${p.bed_temp ? p.bed_temp+'°C' : '—'}</span></div>
      </div>
    </div>
    ${p.notes ? `<div style="margin-bottom:16px"><div class="form-label" style="margin-bottom:6px">Notes</div><div style="font-size:13px;color:var(--text2);background:var(--bg3);padding:10px;border-radius:var(--radius)">${p.notes}</div></div>` : ''}
    <div style="font-size:12px;color:var(--text3)">
      Créée : ${fmtDateTime(p.created_at)} · 
      Débutée : ${fmtDateTime(p.started_at)} · 
      Terminée : ${fmtDateTime(p.finished_at)}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Fermer</button>
      <button class="btn btn-primary" onclick="closeModal();openPrintForm(${p.id})">Modifier</button>
    </div>`, p.name);
}

async function openPrintForm(id = null, prefillProjectId = null) {
  const [printers, filaments, projects] = await Promise.all([
    API.get('/printers'),
    API.get('/filaments'),
    API.get('/projects'),
  ]);
  const p = id ? allPrints.find(x => x.id === id) || await API.get('/prints/' + id) : {};
  const selectedProject = prefillProjectId || p.project_id || '';

  openModal(`
    <div class="form-grid">
      <div class="form-group full"><label class="form-label">Nom du projet d'impression *</label><input id="prf-name" value="${p.name||''}"></div>
      <div class="form-group"><label class="form-label">Projet</label>
        <select id="prf-project">
          <option value="">— Aucun projet —</option>
          ${projects.map(pj => `<option value="${pj.id}" ${selectedProject==pj.id?'selected':''}>${pj.code} — ${pj.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Nom de la pièce (dans le projet)</label>
        <input id="prf-item-name" value="${p.project_item_name||''}" placeholder="ex: Couvercle, Roue avant…">
      </div>
      <div class="form-group"><label class="form-label">Imprimante</label>
        <select id="prf-printer">
          <option value="">— Sélectionner —</option>
          ${printers.map(pr => `<option value="${pr.id}" ${p.printer_id==pr.id?'selected':''}>${pr.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Filament</label>
        <div style="display:flex;gap:6px;margin-bottom:4px">
          <button type="button" class="btn btn-sm" style="font-size:11px"
            onclick="nfcWaitForFilament(function(f){ document.getElementById('prf-filament').value=f.id; toast(f.name+' sélectionné','success'); })">
            📡 Scanner bobine NFC
          </button>
        </div>
        <select id="prf-filament">
          <option value="">— Sélectionner —</option>
          ${filaments.map(f => `<option value="${f.id}" ${p.filament_id==f.id?'selected':''}>${f.name} (${Math.round(f.weight_remaining)}g restants)</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="prf-status">
          ${['queued','printing','paused','done','failed','cancelled'].map(s =>
            `<option value="${s}" ${(p.status||'queued')==s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Progression (%)</label><input id="prf-progress" type="number" min="0" max="100" value="${p.progress||0}"></div>
      <div class="form-group"><label class="form-label">Durée estimée (min)</label><input id="prf-edur" type="number" value="${p.estimated_duration||''}"></div>
      <div class="form-group"><label class="form-label">Durée réelle (min)</label><input id="prf-adur" type="number" value="${p.actual_duration||''}"></div>
      <div class="form-group"><label class="form-label">Filament consommé (g)</label><input id="prf-grams" type="number" step="0.1" value="${p.filament_used||''}"></div>
      <div class="form-group"><label class="form-label">Fichier source</label><input id="prf-file" value="${p.file_name||''}"></div>
      <div class="form-group"><label class="form-label">Hauteur couche (mm)</label><input id="prf-layer" type="number" step="0.01" value="${p.layer_height||''}"></div>
      <div class="form-group"><label class="form-label">Remplissage (%)</label><input id="prf-infill" type="number" value="${p.infill_percent||''}"></div>
      <div class="form-group"><label class="form-label">Temp. buse (°C)</label><input id="prf-tnoz" type="number" value="${p.print_temp||''}"></div>
      <div class="form-group"><label class="form-label">Temp. plateau (°C)</label><input id="prf-tbed" type="number" value="${p.bed_temp||''}"></div>
      <div class="form-group full"><label class="form-label">Notes</label><textarea id="prf-notes">${p.notes||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePrint(${id||'null'})">Enregistrer</button>
    </div>`, id ? 'Modifier impression' : 'Nouvelle impression');
}

async function savePrint(id) {
  const body = {
    name:              document.getElementById('prf-name').value,
    printer_id:        document.getElementById('prf-printer').value || null,
    filament_id:       document.getElementById('prf-filament').value || null,
    project_id:        document.getElementById('prf-project').value || null,
    project_item_name: document.getElementById('prf-item-name').value || null,
    status:            document.getElementById('prf-status').value,
    progress: document.getElementById('prf-progress').value || 0,
    estimated_duration: document.getElementById('prf-edur').value || null,
    actual_duration: document.getElementById('prf-adur').value || null,
    filament_used: document.getElementById('prf-grams').value || null,
    file_name: document.getElementById('prf-file').value,
    layer_height: document.getElementById('prf-layer').value || null,
    infill_percent: document.getElementById('prf-infill').value || null,
    print_temp: document.getElementById('prf-tnoz').value || null,
    bed_temp: document.getElementById('prf-tbed').value || null,
    notes: document.getElementById('prf-notes').value,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    if (id) await API.put('/prints/' + id, body);
    else await API.post('/prints', body);
    closeModal();
    toast(id ? 'Impression mise à jour' : 'Impression ajoutée', 'success');
    renderPrints();
  } catch (e) { toast(e.message, 'error'); }
}

async function deletePrint(id) {
  confirmDelete('Supprimer cette impression ?', async () => {
    try {
      await API.del('/prints/' + id);
      toast('Impression supprimée');
      renderPrints();
    } catch (e) { toast(e.message, 'error'); }
  });
}
