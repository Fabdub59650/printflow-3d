async function renderMaintenance() {
  document.getElementById('page-title').textContent = 'Maintenance';
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary" onclick="openMaintenanceForm()">+ Ajouter</button>`;
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  const [records, printers] = await Promise.all([
    API.get('/maintenance'),
    API.get('/printers'),
  ]);

  // Upcoming due dates
  const today = new Date();
  const upcoming = records.filter(m => {
    if (!m.next_due) return false;
    const d = new Date(m.next_due);
    const diff = (d - today) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).sort((a, b) => new Date(a.next_due) - new Date(b.next_due));

  document.getElementById('content').innerHTML = `
    ${upcoming.length > 0 ? `
    <div class="card" style="border-color:var(--warning);margin-bottom:16px">
      <div class="card-header"><span class="card-title" style="color:var(--warning)">⚠ Maintenance à prévoir</span></div>
      ${upcoming.map(m => {
        const d = new Date(m.next_due);
        const diff = Math.round((d - today) / (1000*60*60*24));
        const isOverdue = diff < 0;
        return `<div class="stat-row">
          <span class="stat-label">${m.printer_name} — ${m.type}</span>
          <span class="stat-val" style="color:${isOverdue?'var(--danger)':'var(--warning)'}">
            ${isOverdue ? `En retard de ${Math.abs(diff)}j` : `Dans ${diff}j (${fmtDate(m.next_due)})`}
          </span>
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-header">
        <span class="card-title">Historique de maintenance</span>
      </div>
      ${records.length === 0 ? '<div class="empty-state"><p>Aucune maintenance enregistrée.</p></div>' : `
      <table>
        <thead><tr>
          <th>Date</th><th>Imprimante</th><th>Type</th><th>Description</th><th>Prochaine</th><th></th>
        </tr></thead>
        <tbody>
          ${records.map(m => `<tr>
            <td style="white-space:nowrap">${fmtDate(m.performed_at)}</td>
            <td>${m.printer_name||'—'}</td>
            <td><span class="badge badge-neutral">${m.type}</span></td>
            <td style="max-width:280px;font-size:12px">${m.description||'—'}</td>
            <td style="white-space:nowrap">${m.next_due ? fmtDate(m.next_due) : '—'}</td>
            <td><div class="td-actions">
              <button class="btn btn-sm" onclick="openMaintenanceForm(null,${m.id})">✏</button>
              <button class="btn btn-sm btn-danger" onclick="deleteMaintenance(${m.id})">✕</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>`;
}

function openMaintenanceForm(printerId = null, editId = null) {
  API.get('/printers').then(async printers => {
    let m = {};
    if (editId) {
      try { m = await API.get('/maintenance/' + editId); } catch(_) {}
    }
    const today = new Date().toISOString().split('T')[0];
    const selPrinter = printerId || m.printer_id || '';
    const TYPES = ['nettoyage','calibration','remplacement_buse','remplacement_plateau','graissage','autre'];
    openModal(
      '<div class="form-grid">' +
        '<div class="form-group"><label class="form-label">Imprimante *</label>' +
          '<select id="mf-printer">' +
            '<option value="">— Sélectionner —</option>' +
            printers.map(p => '<option value="' + p.id + '"' + (selPrinter==p.id?' selected':'') + '>' + p.name + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Type *</label>' +
          '<select id="mf-type">' +
            TYPES.map(t => '<option value="' + t + '"' + (m.type===t?' selected':'') + '>' + t.replace(/_/g,' ') + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Date de réalisation *</label>' +
          '<input id="mf-date" type="date" value="' + (m.performed_at ? m.performed_at.split('T')[0] : today) + '">' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Prochaine échéance</label>' +
          '<input id="mf-next" type="date" value="' + (m.next_due ? m.next_due.split('T')[0] : '') + '">' +
        '</div>' +
        '<div class="form-group full"><label class="form-label">Description</label>' +
          '<input id="mf-desc" value="' + (m.description||'').replace(/"/g,'&quot;') + '" placeholder="ex: Remplacement buse 0.4mm">' +
        '</div>' +
        '<div class="form-group full"><label class="form-label">Notes</label>' +
          '<textarea id="mf-notes" placeholder="Détails, références pièces…">' + (m.notes||'') + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-primary" onclick="saveMaintenance(' + (editId||'null') + ')">' + (editId ? 'Enregistrer' : 'Ajouter') + '</button>' +
      '</div>',
      editId ? 'Modifier la maintenance' : 'Ajouter une maintenance'
    );
  });
}

async function saveMaintenance(editId = null) {
  const body = {
    printer_id:   document.getElementById('mf-printer').value || null,
    type:         document.getElementById('mf-type').value,
    performed_at: document.getElementById('mf-date').value,
    next_due:     document.getElementById('mf-next').value || null,
    description:  document.getElementById('mf-desc').value,
    notes:        document.getElementById('mf-notes').value,
  };
  if (!body.printer_id)   return toast('Sélectionner une imprimante', 'error');
  if (!body.performed_at) return toast('Date requise', 'error');
  try {
    if (editId) {
      await API.put('/maintenance/' + editId, body);
      toast('Maintenance mise à jour', 'success');
    } else {
      await API.post('/maintenance', body);
      toast('Maintenance enregistrée', 'success');
    }
    closeModal();
    renderMaintenance();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteMaintenance(id) {
  confirmDelete('Supprimer cette entrée de maintenance ?', async () => {
    try {
      await API.del('/maintenance/' + id);
      toast('Entrée supprimée');
      renderMaintenance();
    } catch (e) { toast(e.message, 'error'); }
  });
}
