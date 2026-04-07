let allPrinters = [];

async function renderPrinters() {
  document.getElementById('page-title').textContent = 'Imprimantes';
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary" onclick="openPrinterForm()">+ Ajouter</button>`;
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  allPrinters = await API.get('/printers');
  renderPrinterCards();
}

function renderPrinterCards() {
  const container = document.getElementById('content');
  if (!allPrinters.length) {
    container.innerHTML = `<div class="empty-state"><p>Aucune imprimante enregistrée.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="printer-grid">${allPrinters.map(printerCard).join('')}</div>`;
}

function printerCard(p) {
  const successRate = p.total_prints > 0 ? Math.round((p.total_success / p.total_prints) * 100) : 0;
  return `
  <div class="printer-card ${p.status === 'printing' ? 'printing' : ''}">
    <div class="printer-card-header">
      <div>
        <div class="printer-name">${p.name}</div>
        <div class="printer-model">${p.model || ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        ${statusBadge(p.status)}
        ${p.interface_url ? `<span style="font-size:10px;color:var(--text3)">${interfaceTypeLabel(p.interface_type)}</span>` : ''}
      </div>
    </div>

    ${p.status === 'printing' ? `
    <div class="job-bar">
      <div class="job-name">Impression en cours</div>
      <div class="progress-wrap" style="margin-top:6px"><div class="progress-fill" style="width:${p.progress||0}%"></div></div>
      <div class="job-pct" style="margin-top:4px">${p.progress||0}%</div>
    </div>` : ''}

    <div class="printer-stats-mini">
      <div class="pstat"><div class="pstat-label">Impressions</div><div class="pstat-val">${p.total_prints}</div></div>
      <div class="pstat"><div class="pstat-label">Réussite</div><div class="pstat-val">${successRate}%</div></div>
      <div class="pstat"><div class="pstat-label">Heures total</div><div class="pstat-val">${Math.round(p.total_hours)}h</div></div>
      <div class="pstat"><div class="pstat-label">Filament</div><div class="pstat-val">${(p.total_grams/1000).toFixed(1)}kg</div></div>
    </div>

    ${window._showLocations && p.location ? `<div style="font-size:11px;color:var(--text3);margin-bottom:10px">📍 ${p.location}</div>` : ''}

    <div class="printer-actions">
      ${p.interface_url ? `<button class="btn btn-primary btn-sm" onclick="openPrinterIframe(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        Ouvrir interface
      </button>` : ''}
      <button class="btn btn-sm" onclick="openPrinterDetail(${p.id})">Détails</button>
      <button class="btn btn-sm" onclick="openPrinterForm(${p.id})">Modifier</button>
      <button class="btn btn-sm btn-danger" onclick="deletePrinter(${p.id})">Suppr.</button>
    </div>
  </div>`;
}

async function openPrinterDetail(id) {
  const [p, prints, maint] = await Promise.all([
    API.get('/printers/' + id),
    API.get('/printers/' + id + '/prints'),
    API.get('/printers/' + id + '/maintenance'),
  ]);
  const successRate = p.total_prints > 0 ? Math.round((p.total_success / p.total_prints) * 100) : 0;

  openModal(`
    <div class="grid-2" style="margin-bottom:16px">
      <div>
        <div class="form-group" style="margin-bottom:10px">
          <div class="form-label">Informations</div>
        </div>
        <div class="stat-row"><span class="stat-label">Modèle</span><span class="stat-val">${p.model||'—'}</span></div>
        <div class="stat-row"><span class="stat-label">Volume</span><span class="stat-val">${p.volume_x}×${p.volume_y}×${p.volume_z} mm</span></div>
        <div class="stat-row"><span class="stat-label">Buse</span><span class="stat-val">Ø${p.nozzle_size}mm · max ${p.temp_nozzle_max}°C</span></div>
        <div class="stat-row"><span class="stat-label">Plateau max</span><span class="stat-val">${p.temp_bed_max}°C</span></div>
        <div class="stat-row"><span class="stat-label">Interface</span><span class="stat-val">${interfaceTypeLabel(p.interface_type)}</span></div>
        <div class="stat-row"><span class="stat-label">IP</span><span class="stat-val">${p.ip_address||'—'}</span></div>
        ${window._showLocations ? `<div class="stat-row"><span class="stat-label">Emplacement</span><span class="stat-val">${p.location||'—'}</span></div>` : ''}
      </div>
      <div>
        <div class="form-label" style="margin-bottom:10px">Statistiques</div>
        <div class="stat-row"><span class="stat-label">Total impressions</span><span class="stat-val">${p.total_prints}</span></div>
        <div class="stat-row"><span class="stat-label">Taux de réussite</span><span class="stat-val">${successRate}%</span></div>
        <div class="stat-row"><span class="stat-label">Heures totales</span><span class="stat-val">${Math.round(p.total_hours)}h</span></div>
        <div class="stat-row"><span class="stat-label">Filament total</span><span class="stat-val">${(p.total_grams/1000).toFixed(2)}kg</span></div>
      </div>
    </div>

    ${p.interface_url ? `
    <div style="margin-bottom:16px">
      <button class="btn btn-primary" onclick="closeModal();openPrinterIframe(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        Ouvrir l'interface ${interfaceTypeLabel(p.interface_type)}
      </button>
    </div>` : ''}

    <div class="form-label" style="margin-bottom:8px">Historique des impressions</div>
    <table>
      <thead><tr><th>Projet</th><th>Filament</th><th>Durée</th><th>Consommé</th><th>Statut</th></tr></thead>
      <tbody>
        ${prints.slice(0,10).map(pr => `<tr>
          <td>${pr.name}</td>
          <td>${pr.filament_name ? `<span class="filament-dot" style="background:${pr.color_hex}"></span> ${pr.filament_name}` : '—'}</td>
          <td>${fmtDuration(pr.actual_duration)}</td>
          <td>${pr.filament_used ? pr.filament_used+'g' : '—'}</td>
          <td>${statusBadge(pr.status)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="form-label" style="margin:16px 0 8px">Maintenance</div>
    ${maint.length === 0 ? '<p style="color:var(--text3);font-size:13px">Aucune maintenance enregistrée.</p>' :
      maint.slice(0,5).map(m => `<div class="stat-row">
        <span class="stat-label">${fmtDate(m.performed_at)} — ${m.type}</span>
        <span style="font-size:12px;color:var(--text3)">${m.description||''}</span>
      </div>`).join('')}

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Fermer</button>
      <button class="btn btn-primary" onclick="closeModal();openPrinterForm(${p.id})">Modifier</button>
    </div>`, p.name);
}

function openPrinterForm(id = null) {
  const p = id ? allPrinters.find(x => x.id === id) : {};
  const title = id ? 'Modifier ' + p.name : 'Nouvelle imprimante';
  openModal(`
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Nom affiché *</label><input id="pf-name" value="${p.name||''}"></div>
      <div class="form-group"><label class="form-label">Modèle</label>
        <select id="pf-model">
          ${['Bambu Lab X1C','Bambu Lab P1S','Bambu Lab A1 Mini','Prusa MK4','Prusa MK3S+','Prusa MINI+','Creality Ender 3','Creality Ender 3 V3','Creality K1','Voron 2.4','Voron Trident','Voron 0.2','Autre']
            .map(m => `<option ${(p.model||'')==m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Adresse IP</label><input id="pf-ip" value="${p.ip_address||''}" placeholder="192.168.1.100"></div>
      <div class="form-group"><label class="form-label">Type d'interface</label>
        <select id="pf-itype">
          ${['octoprint','moonraker','bambu','duet','repetier','other'].map(t =>
            `<option value="${t}" ${(p.interface_type||'')==t?'selected':''}>${interfaceTypeLabel(t)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label class="form-label">URL interface web</label>
        <input id="pf-iurl" value="${p.interface_url||''}" placeholder="http://192.168.1.100">
      </div>
      <div class="form-group full"><label class="form-label">Clé API (OctoPrint / Moonraker)</label>
        <input id="pf-apikey" value="${p.api_key||''}" placeholder="optionnel">
      </div>
      <div class="form-group"><label class="form-label">Volume X (mm)</label><input id="pf-vx" type="number" value="${p.volume_x||220}"></div>
      <div class="form-group"><label class="form-label">Volume Y (mm)</label><input id="pf-vy" type="number" value="${p.volume_y||220}"></div>
      <div class="form-group"><label class="form-label">Volume Z (mm)</label><input id="pf-vz" type="number" value="${p.volume_z||250}"></div>
      <div class="form-group"><label class="form-label">Diamètre buse (mm)</label>
        <select id="pf-noz">
          ${['0.2','0.4','0.6','0.8'].map(v => `<option ${(p.nozzle_size||0.4)==v?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Temp buse max (°C)</label><input id="pf-tnoz" type="number" value="${p.temp_nozzle_max||260}"></div>
      <div class="form-group"><label class="form-label">Temp plateau max (°C)</label><input id="pf-tbed" type="number" value="${p.temp_bed_max||110}"></div>
      ${window._showLocations ? `<div class="form-group"><label class="form-label">Emplacement</label><input id="pf-loc" value="${p.location||''}"></div>` : ''}
      <div class="form-group"><label class="form-label">Statut</label>
        <select id="pf-status">
          ${['idle','printing','paused','error','offline','maintenance'].map(s =>
            `<option value="${s}" ${(p.status||'idle')==s?'selected':''}>${statusBadge(s).replace(/<[^>]+>/g,'').trim()}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label class="form-label">Notes / maintenance</label><textarea id="pf-notes">${p.notes||''}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePrinter(${id||'null'})">Enregistrer</button>
    </div>`, title);
}

async function savePrinter(id) {
  const body = {
    name: document.getElementById('pf-name').value,
    model: document.getElementById('pf-model').value,
    ip_address: document.getElementById('pf-ip').value,
    interface_type: document.getElementById('pf-itype').value,
    interface_url: document.getElementById('pf-iurl').value,
    api_key: document.getElementById('pf-apikey').value,
    volume_x: document.getElementById('pf-vx').value,
    volume_y: document.getElementById('pf-vy').value,
    volume_z: document.getElementById('pf-vz').value,
    nozzle_size: document.getElementById('pf-noz').value,
    temp_nozzle_max: document.getElementById('pf-tnoz').value,
    temp_bed_max: document.getElementById('pf-tbed').value,
    location: document.getElementById('pf-loc')?.value || '',
    status: document.getElementById('pf-status').value,
    notes: document.getElementById('pf-notes').value,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    if (id) await API.put('/printers/' + id, body);
    else await API.post('/printers', body);
    closeModal();
    toast(id ? 'Imprimante mise à jour' : 'Imprimante ajoutée', 'success');
    renderPrinters();
  } catch (e) { toast(e.message, 'error'); }
}

async function deletePrinter(id) {
  confirmDelete('Supprimer cette imprimante ?', async () => {
    try {
      await API.del('/printers/' + id);
      toast('Imprimante supprimée');
      renderPrinters();
    } catch (e) { toast(e.message, 'error'); }
  });
}
