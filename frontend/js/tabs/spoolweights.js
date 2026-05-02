// ── Onglet Base de référence poids bobines ───────────────────────────────

async function renderSpoolweights() {
  document.getElementById('page-title').textContent = 'Base de référence — Bobines vides';
  document.getElementById('topbar-actions').innerHTML =
    '<button class="btn btn-primary" onclick="openAddSpoolWeightTab()">+ Ajouter</button>';

  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:40px 0 0 4px">Chargement…</div>';

  try {
    const list = await API.get('/spool-weights');

    if (!list.length) {
      content.innerHTML = '<div class="empty-state"><p>Aucune entrée dans la base.</p>' +
        '<button class="btn btn-primary" onclick="openAddSpoolWeightTab()">+ Ajouter la première entrée</button></div>';
      return;
    }

    // Grouper par fabricant
    const byBrand = {};
    list.forEach(function(s) {
      if (!byBrand[s.brand]) byBrand[s.brand] = [];
      byBrand[s.brand].push(s);
    });

    let html = '<div class="card">' +
      '<table>' +
      '<thead><tr>' +
        '<th>Fabricant</th>' +
        '<th>Modèle</th>' +
        '<th>Tare (g)</th>' +
        '<th>Taille bobine</th>' +
        '<th>Diamètre</th>' +
        '<th>Notes</th>' +
        '<th></th>' +
      '</tr></thead>' +
      '<tbody>';

    list.forEach(function(s) {
      html += '<tr>' +
        '<td style="font-weight:500">' + s.brand + '</td>' +
        '<td style="color:var(--text3)">' + (s.model || '—') + '</td>' +
        '<td><span style="font-weight:600;color:var(--accent)">' + parseFloat(s.weight_g).toFixed(0) + ' g</span></td>' +
        '<td style="font-size:12px;color:var(--text3)">' + (s.spool_size_g || 1000) + ' g</td>' +
        '<td style="font-size:12px;color:var(--text3)">' + (s.diameter_mm || 1.75) + ' mm</td>' +
        '<td style="font-size:12px;color:var(--text3)">' + (s.notes || '—') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn btn-sm" onclick="editSpoolWeightTab(' + s.id + ')">✏</button> ' +
          '<button class="btn btn-sm btn-danger" onclick="deleteSpoolWeightTab(' + s.id + ')">✕</button>' +
        '</td>' +
      '</tr>';
    });

    html += '</tbody></table></div>';
    content.innerHTML = html;

  } catch(e) {
    content.innerHTML = '<div class="empty-state"><p>Erreur : ' + e.message + '</p></div>';
  }
}

function openAddSpoolWeightTab(existing) {
  const s = existing || {};
  openModal(
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label class="form-label">Fabricant *</label>' +
        '<input id="sw-brand" value="' + (s.brand||'') + '" placeholder="ex: Bambu Lab">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Modèle</label>' +
        '<input id="sw-model" value="' + (s.model||'') + '" placeholder="ex: Standard AMS">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Poids bobine vide (g) *</label>' +
        '<input id="sw-weight" type="number" step="0.1" min="0" value="' + (s.weight_g||'') + '" placeholder="ex: 250">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Taille bobine (g de filament)</label>' +
        '<input id="sw-size" type="number" value="' + (s.spool_size_g||1000) + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Diamètre (mm)</label>' +
        '<input id="sw-diam" type="number" step="0.01" value="' + (s.diameter_mm||1.75) + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Notes</label>' +
        '<input id="sw-notes" value="' + (s.notes||'') + '" placeholder="Optionnel">' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveSpoolWeightTab(' + (s.id||'null') + ')">' +
        (s.id ? 'Enregistrer' : 'Ajouter') +
      '</button>' +
    '</div>',
    s.id ? 'Modifier l\'entrée' : 'Ajouter un poids de référence'
  );
}

async function saveSpoolWeightTab(id) {
  const brand  = document.getElementById('sw-brand')?.value?.trim();
  const weight = document.getElementById('sw-weight')?.value;
  if (!brand || !weight) return toast('Fabricant et poids requis', 'error');
  const body = {
    brand,
    model:        document.getElementById('sw-model')?.value || null,
    weight_g:     parseFloat(weight),
    spool_size_g: parseInt(document.getElementById('sw-size')?.value) || 1000,
    diameter_mm:  parseFloat(document.getElementById('sw-diam')?.value) || 1.75,
    notes:        document.getElementById('sw-notes')?.value || null,
  };
  try {
    if (id) await API.put('/spool-weights/' + id, body);
    else     await API.post('/spool-weights', body);
    closeModal();
    toast(id ? 'Entrée mise à jour' : 'Entrée ajoutée', 'success');
    renderSpoolweights();
  } catch(e) { toast(e.message, 'error'); }
}

async function editSpoolWeightTab(id) {
  try {
    const list = await API.get('/spool-weights');
    const s = list.find(function(x){ return x.id === id; });
    if (s) openAddSpoolWeightTab(s);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteSpoolWeightTab(id) {
  confirmDelete('Supprimer cette entrée de la base ?', async function() {
    try {
      await API.del('/spool-weights/' + id);
      toast('Entrée supprimée');
      renderSpoolweights();
    } catch(e) { toast(e.message, 'error'); }
  });
}
