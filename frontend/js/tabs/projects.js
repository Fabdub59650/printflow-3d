let allProjects = [];
let projectFilter = 'all'; // 'all' | 'in_progress' | 'draft' | 'done' | 'cancelled'
let _pendingLibraryParts = [];

async function renderProjects() {
  document.getElementById('page-title').textContent = 'Projets';
  document.getElementById('topbar-actions').innerHTML =
    `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
       <div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">
         <button class="filter-btn active" data-filter="all"      onclick="setProjectFilter('all',this)">Tous</button>
         <button class="filter-btn"        data-filter="in_progress" onclick="setProjectFilter('in_progress',this)">En cours</button>
         <button class="filter-btn"        data-filter="draft"    onclick="setProjectFilter('draft',this)">Brouillon</button>
         <button class="filter-btn"        data-filter="done"     onclick="setProjectFilter('done',this)">Terminés</button>
         <button class="filter-btn"        data-filter="cancelled" onclick="setProjectFilter('cancelled',this)">Annulés</button>
       </div>
       <button class="btn btn-primary" onclick="openProjectForm()">+ Nouveau projet</button>
     </div>`;

  // Inject filter button styles if not already present
  if (!document.getElementById('project-filter-style')) {
    const style = document.createElement('style');
    style.id = 'project-filter-style';
    style.textContent = '.filter-btn{padding:6px 12px;font-size:12px;font-weight:500;border:none;' +
      'background:transparent;cursor:pointer;color:var(--text2);transition:background 0.12s,color 0.12s}' +
      '.filter-btn:hover{background:var(--bg3);color:var(--text)}' +
      '.filter-btn.active{background:var(--text);color:var(--bg2)}';
    document.head.appendChild(style);
  }

  // Restore active filter button
  const activeBtn = document.querySelector('.filter-btn[data-filter="' + projectFilter + '"]');
  if (activeBtn) { document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); activeBtn.classList.add('active'); }
  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  allProjects = await API.get('/projects');
  renderProjectList();
}

function setProjectFilter(filter, btn) {
  projectFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProjectList();
}

function renderProjectList() {
  const content = document.getElementById('content');
  if (!allProjects.length) {
    content.innerHTML = `<div class="empty-state"><p>Aucun projet.</p></div>`;
    return;
  }
  // Apply status filter
  const filtered = projectFilter === 'all'
    ? allProjects
    : allProjects.filter(p => p.status === projectFilter);

  if (!filtered.length) {
    const labels2 = { all:'', in_progress:'en cours', draft:'en brouillon', done:'terminés', cancelled:'annulés' };
    content.innerHTML = `<div class="empty-state"><p>Aucun projet ${labels2[projectFilter]||''}.</p>
      <button class="btn btn-primary" onclick="openProjectForm()" style="margin-top:12px">+ Nouveau projet</button></div>`;
    return;
  }

  const groups = { in_progress:[], draft:[], done:[], cancelled:[] };
  filtered.forEach(p => (groups[p.status] || groups.draft).push(p));
  const order  = ['in_progress','draft','done','cancelled'];
  const labels = { in_progress:'En cours', draft:'Brouillon', done:'Terminés', cancelled:'Annulés' };

  content.innerHTML = order.filter(s => groups[s].length).map(status => `
    <div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);text-transform:uppercase;
                  letter-spacing:0.07em;margin-bottom:10px">${labels[status]} · ${groups[status].length}</div>
      ${groups[status].map(projectCard).join('')}
    </div>`).join('');
}

function projectCard(p) {
  const totalPrints = parseInt(p.total_prints)||0;
  const donePrints  = parseInt(p.done_prints)||0;
  const totalItems  = parseInt(p.total_items)||0;
  const active      = parseInt(p.active_prints)||0;
  const grams       = parseFloat(p.total_grams)||0;
  const pct_        = totalPrints > 0 ? Math.round((donePrints/totalPrints)*100) : 0;
  const barColor    = pct_ === 100 ? 'var(--success)' : active > 0 ? 'var(--accent)' : 'var(--text3)';

  return `
  <div class="card" style="margin-bottom:10px;cursor:pointer" onclick="openProjectDetail(${p.id})">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
          <code style="font-size:12px;font-weight:500;background:var(--bg3);padding:2px 8px;
                       border-radius:var(--radius);color:var(--text2)">${p.code}</code>
          <span style="font-size:15px;font-weight:500">${p.name}</span>
          ${statusBadge(p.status)}
          ${p.status_forced ? '<span class="badge badge-neutral" style="font-size:10px">forcé</span>' : ''}
        </div>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--text3);flex-wrap:wrap">
          ${totalItems > 0 ? `<span>${totalItems} pièce${totalItems>1?'s':''}</span>` : ''}
          <span>${totalPrints > 0 ? `${donePrints}/${totalPrints} impressions` : 'Aucune impression'}</span>
          ${grams > 0 ? `<span>${grams.toFixed(0)}g</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0" onclick="event.stopPropagation()">
        <button class="btn btn-sm" title="Exporter PDF" onclick="exportProjectPDF(${p.id})">PDF</button>
        <button class="btn btn-sm" onclick="openProjectForm(${p.id})">✏</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProject(${p.id})">✕</button>
      </div>
    </div>
    ${totalPrints > 0 ? `
    <div style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;color:var(--text3)">${donePrints}/${totalPrints} terminées</span>
        <span style="font-size:11px;color:var(--text3)">${pct_}%</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-fill" style="width:${pct_}%;background:${barColor}"></div>
      </div>
    </div>` : ''}
  </div>`;
}

async function openProjectDetail(id) {
  const [project, history] = await Promise.all([
    API.get('/projects/'+id),
    API.get('/projects/'+id+'/history'),
  ]);
  const { stats } = project;
  const pct_ = stats.totalPrints > 0 ? Math.round((stats.donePrints/stats.totalPrints)*100) : 0;

  const structureHtml = project.items.length === 0 && project.direct_prints.length === 0
    ? `<p style="color:var(--text3);font-size:13px;padding:12px 0">Aucun élément — ajoutez des pièces ou rattachez des impressions.</p>`
    : [...project.items.map(item => itemBlock(id, item)),
       ...project.direct_prints.length ? [directPrintsBlock(id, project.direct_prints)] : []
      ].join('');

  const historyHtml = history.length === 0
    ? '<p style="color:var(--text3);font-size:13px">Aucun événement enregistré.</p>'
    : `<div style="display:flex;flex-direction:column;gap:0">
        ${history.map(h => `
          <div style="display:flex;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--border)">
            <div style="font-size:11px;color:var(--text3);white-space:nowrap;min-width:110px;padding-top:1px">${fmtDateTime(h.created_at)}</div>
            <div style="flex:1">
              <div style="font-size:13px">${h.label}</div>
              ${h.detail_before && h.detail_after
                ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">
                     ${h.detail_before} → ${h.detail_after}
                   </div>` : ''}
            </div>
          </div>`).join('')}
       </div>`;

  openModal(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <code style="font-size:13px;font-weight:500;background:var(--bg3);padding:3px 10px;
                   border-radius:var(--radius);color:var(--text2)">${project.code}</code>
      <span style="font-size:16px;font-weight:500">${project.name}</span>
      ${statusBadge(project.status)}
      ${project.status_forced ? '<span class="badge badge-neutral" style="font-size:10px">statut forcé</span>' : ''}
    </div>

    <div class="metrics-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px">
      <div class="metric-card">
        <div class="metric-label">Progression</div>
        <div class="metric-value">${pct_}<span style="font-size:14px">%</span></div>
        <div class="metric-sub">${stats.donePrints}/${stats.totalPrints} impressions</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Pièces</div>
        <div class="metric-value">${project.items.length}</div>
        <div class="metric-sub">+ ${project.direct_prints.length} directe${project.direct_prints.length>1?'s':''}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Filament</div>
        <div class="metric-value">${stats.totalGrams.toFixed(0)}<span style="font-size:14px">g</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Temps total</div>
        <div class="metric-value" style="font-size:18px">${fmtDuration(stats.totalMin)}</div>
      </div>
    </div>

    ${stats.totalPrints > 0 ? `<div style="margin-bottom:16px">
      <div class="progress-wrap" style="height:6px">
        <div class="progress-fill" style="width:${pct_}%;background:${pct_===100?'var(--success)':'var(--accent)'}"></div>
      </div></div>` : ''}

    ${project.description ? `<div style="font-size:13px;color:var(--text2);margin-bottom:12px">${project.description}</div>` : ''}

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="form-label">Éléments</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="openAddItemForm(${id})">+ Nouvelle pièce</button>
        <button class="btn btn-sm" onclick="openAddDirectPrint(${id})">+ Impression directe</button>
      </div>
    </div>
    ${structureHtml}

    <div style="margin-top:20px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span class="form-label">Historique des modifications</span>
        <span style="font-size:12px;color:var(--text3)">${history.length} événement${history.length>1?'s':''}</span>
      </div>
      ${historyHtml}
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:14px;border-top:0.5px solid var(--border);margin-top:8px">
      <button class="btn" onclick="closeModal()">Fermer</button>
      <button class="btn" onclick="closeModal();openProjectForm(${id})">Modifier</button>
      <button class="btn btn-sm" onclick="exportProjectPDF(${id})">Exporter PDF</button>
      <div style="margin-left:auto;display:flex;gap:6px">
        ${project.status !== 'done'
          ? `<button class="btn btn-success btn-sm" onclick="forceProjectStatus(${id},'done')">✓ Terminer</button>`
          : `<button class="btn btn-sm" onclick="forceProjectStatus(${id},'in_progress')">↩ Rouvrir</button>`}
        <button class="btn btn-sm" onclick="autoRefreshStatus(${id})">↻ Recalc.</button>
      </div>
    </div>
  `, `${project.code} — ${project.name}`);
}

// ── PDF Export ────────────────────────────────────────────
async function exportProjectPDF(id) {
  try {
    toast('Génération du PDF…');
    const project = await API.get('/projects/'+id);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const pageW = 210; const margin = 18; const colW = pageW - margin*2;
    let y = margin;

    const addText = (text, x, size=11, style='normal', color=[30,30,30]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
      doc.text(String(text), x, y);
    };
    const line = (color=[220,220,220]) => {
      doc.setDrawColor(...color);
      doc.line(margin, y, pageW-margin, y);
      y += 4;
    };
    const newPage = () => { doc.addPage(); y = margin; };
    const checkPage = (needed=20) => { if (y + needed > 280) newPage(); };

    // ── En-tête ──
    doc.setFillColor(24,95,165);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text('PrintFlow', margin, 12);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Rapport de projet', margin, 20);
    doc.setFontSize(12); doc.setFont('helvetica','bold');
    doc.text(project.code, pageW-margin, 12, { align:'right' });
    y = 38;

    // ── Titre projet ──
    addText(project.name, margin, 16, 'bold', [10,10,10]); y += 7;
    const statusLabels = { draft:'Brouillon', in_progress:'En cours', done:'Terminé', cancelled:'Annulé' };
    addText(`Statut : ${statusLabels[project.status]||project.status}`, margin, 10, 'normal', [100,100,100]); y += 5;
    addText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, margin, 10, 'normal', [100,100,100]); y += 8;
    line();

    // ── Stats ──
    const { stats } = project;
    const pctV = stats.totalPrints > 0 ? Math.round((stats.donePrints/stats.totalPrints)*100) : 0;
    addText('Résumé', margin, 12, 'bold'); y += 6;
    const statsData = [
      ['Progression', `${pctV}% (${stats.donePrints}/${stats.totalPrints} impressions)`],
      ['Pièces', String(project.items.length)],
      ['Filament consommé', `${stats.totalGrams.toFixed(0)} g`],
      ['Temps total', fmtDuration(stats.totalMin)],
    ];
    statsData.forEach(([label, val]) => {
      addText(label, margin, 10, 'normal', [80,80,80]);
      addText(val, margin+55, 10, 'bold', [30,30,30]);
      y += 6;
    });
    y += 4; line();

    // ── Pièces & impressions ──
    addText('Éléments du projet', margin, 12, 'bold'); y += 7;

    const allItems = [
      ...project.items.map(item => ({ type:'item', data: item })),
      ...project.direct_prints.length ? [{ type:'direct', data: project.direct_prints }] : []
    ];

    allItems.forEach(({ type, data }) => {
      checkPage(30);
      if (type === 'item') {
        const item = data;
        doc.setFillColor(245,245,248);
        doc.rect(margin, y-4, colW, 8, 'F');
        addText(`Pièce : ${item.name}${item.quantity>1?' × '+item.quantity:''}`, margin+2, 11, 'bold', [24,95,165]);
        y += 8;
        if (item.prints && item.prints.length) {
          item.prints.forEach(pr => {
            checkPage(10);
            addText(`  • ${pr.name}`, margin+4, 9, 'normal', [50,50,50]);
            const detail = [
              pr.printer_name, pr.filament_name,
              pr.filament_used ? pr.filament_used+'g' : null,
              fmtDuration(pr.actual_duration||pr.estimated_duration),
              statusLabels[pr.status]||pr.status
            ].filter(Boolean).join('  ·  ');
            addText(detail, margin+8, 8, 'normal', [120,120,120]); y += 5;
            y += 4;
          });
        } else {
          addText('  Aucune impression', margin+4, 9, 'italic', [160,160,160]); y += 6;
        }
      } else {
        checkPage(10);
        addText('Impressions directes', margin+2, 10, 'bold', [80,80,80]); y += 6;
        data.forEach(pr => {
          checkPage(8);
          addText(`  • ${pr.name}  ·  ${pr.filament_name||'—'}  ·  ${pr.filament_used||'—'}g  ·  ${statusLabels[pr.status]||pr.status}`,
            margin+4, 9, 'normal', [50,50,50]); y += 5;
        });
      }
      y += 2;
    });

    // ── Numéros de page ──
    const totalPages = doc.getNumberOfPages();
    for (let i=1; i<=totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8); doc.setTextColor(160,160,160);
      doc.text(`PrintFlow · ${project.code} · Page ${i}/${totalPages}`, pageW/2, 293, { align:'center' });
    }

    doc.save(`${project.code}.pdf`);
    toast('PDF téléchargé', 'success');
  } catch (e) {
    console.error(e);
    toast('Erreur génération PDF : ' + e.message, 'error');
  }
}

// ── Formulaires & helpers (identiques à v3) ───────────────
function openProjectForm(id=null) {
  if (!id) _pendingLibraryParts = [];
  const p    = id ? allProjects.find(x=>x.id===id) : {};
  const isNew = !id;
  const ym   = String(new Date().getFullYear()).slice(-2) + String(new Date().getMonth()+1).padStart(2,'0');

  openModal(`
    <div class="form-grid">
      <div class="form-group full"><label class="form-label">Nom *</label>
        <input id="pjf-name" value="${p.name||''}" placeholder="ex: Boîtier imprimante…"></div>
      <div class="form-group full"><label class="form-label">Description</label>
        <input id="pjf-desc" value="${p.description||''}"></div>
      ${id ? `<div class="form-group"><label class="form-label">Statut</label>
        <select id="pjf-status">
          ${['draft','in_progress','done','cancelled'].map(s=>
            `<option value="${s}" ${(p.status||'draft')===s?'selected':''}>${
              {draft:'Brouillon',in_progress:'En cours',done:'Terminé',cancelled:'Annulé'}[s]
            }</option>`).join('')}
        </select></div>` : ''}
      <div class="form-group full"><label class="form-label">Notes</label>
        <textarea id="pjf-notes">${p.notes||''}</textarea></div>
    </div>

    ${isNew ? `
    <div style="border:0.5px solid var(--border);border-radius:var(--radius-lg);
                padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:500">Importer depuis la bibliothèque</span>
        <button class="btn btn-sm" onclick="openLibraryPicker()">Parcourir la bibliothèque</button>
      </div>
      <div id="pjf-library-preview" style="font-size:12px;color:var(--text3)">
        Optionnel — les parties de l'objet sélectionné seront créées comme pièces du projet.
      </div>
    </div>
    <div style="padding:10px;background:var(--bg3);border-radius:var(--radius);
                font-size:12px;color:var(--text3);margin-bottom:16px">
      Code généré automatiquement · ex : <strong>P-${ym}-001</strong>
    </div>` : `<div style="margin-bottom:16px;font-size:12px;color:var(--text3)">
      Code : <strong>${p.code||''}</strong></div>`}

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveProject(${id||'null'})">
        ${id ? 'Enregistrer' : 'Créer le projet'}
      </button>
    </div>
  `, id ? 'Modifier le projet' : 'Nouveau projet');
}

async function openLibraryPicker() {
  let objects = [];
  try { objects = await API.get('/library/objects'); }
  catch(e) { toast('Impossible de charger la bibliothèque', 'error'); return; }

  if (!objects.length) {
    toast('Aucun objet dans la bibliothèque', 'error');
    return;
  }

  openModal(`
    <div style="margin-bottom:14px;font-size:13px;color:var(--text2)">
      Sélectionnez un objet — ses parties seront créées comme pièces du projet.
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto">
      ${objects.map(o => `
      <div onclick="selectLibraryObject(${o.id})"
           style="display:flex;align-items:center;gap:12px;padding:12px;
                  border:0.5px solid var(--border);border-radius:var(--radius-lg);
                  cursor:pointer;background:transparent"
           onmouseover="this.style.background='var(--bg3)'"
           onmouseout="this.style.background='transparent'">
        <div style="width:36px;height:36px;border-radius:var(--radius);background:var(--accent-bg);
                    display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">◈</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500">${o.name}</div>
          <div style="font-size:11px;color:var(--text3)">
            ${o.file_count} fichier${o.file_count != 1 ? 's' : ''}
            ${o.theme_name ? ' · ' + o.theme_name : ''}
          </div>
          ${o.description ? `<div style="font-size:11px;color:var(--text2);margin-top:2px">${o.description}</div>` : ''}
        </div>
        <span style="font-size:20px;color:var(--text3)">›</span>
      </div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="openProjectForm()">Annuler</button>
    </div>
  `, 'Bibliothèque — choisir un objet');
}

async function selectLibraryObject(objectId) {
  try {
    const obj = await API.get('/library/objects/' + objectId);
    _pendingLibraryParts = obj.files.map(f => ({
      name:      f.part_name || f.name,
      file_id:   f.id,
      file_name: f.original_name,
    }));
    // Passer l'objet directement — pas de reset de _pendingLibraryParts
    openProjectFormWithLibrary(obj);
  } catch(e) { toast('Erreur : ' + e.message, 'error'); }
}

function openProjectFormWithLibrary(obj) {
  const ym = String(new Date().getFullYear()).slice(-2) + String(new Date().getMonth()+1).padStart(2,'0');

  let partsHtml = '';
  _pendingLibraryParts.forEach((part, i) => {
    partsHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;' +
      'background:var(--bg3);border-radius:var(--radius);margin-bottom:4px">' +
      '<span style="font-size:11px;color:var(--text3);min-width:16px">' + (i+1) + '.</span>' +
      '<input id="pjf-part-' + i + '" value="' + part.name + '" style="flex:1;font-size:12px;padding:4px 8px">' +
      '<span style="font-size:10px;color:var(--text3)">' + part.file_name + '</span>' +
      '</div>';
  });

  const partsPreview = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
    '<span style="font-size:12px;font-weight:500;color:var(--accent)">◈ ' + obj.name + '</span>' +
    '<button class="btn btn-sm" style="font-size:10px;padding:2px 7px" onclick="openProjectForm()">' +
    '✕ Retirer</button></div>' +
    partsHtml +
    '<div style="font-size:11px;color:var(--text3);margin-top:6px">' +
    _pendingLibraryParts.length + ' pièce' + (_pendingLibraryParts.length > 1 ? 's' : '') +
    ' — renommez-les si besoin avant de créer.</div>';

  openModal(
    '<div class="form-grid">' +
    '<div class="form-group full"><label class="form-label">Nom *</label>' +
    '<input id="pjf-name" value="' + obj.name + '" placeholder="ex: Boîtier imprimante…"></div>' +
    '<div class="form-group full"><label class="form-label">Description</label>' +
    '<input id="pjf-desc" value=""></div>' +
    '<div class="form-group full"><label class="form-label">Notes</label>' +
    '<textarea id="pjf-notes"></textarea></div>' +
    '</div>' +
    '<div style="border:0.5px solid var(--accent);border-radius:var(--radius-lg);padding:14px;margin-bottom:14px">' +
    '<div style="font-size:13px;font-weight:500;margin-bottom:10px">Pièces importées depuis la bibliothèque</div>' +
    partsPreview +
    '</div>' +
    '<div style="padding:10px;background:var(--bg3);border-radius:var(--radius);font-size:12px;color:var(--text3);margin-bottom:16px">' +
    'Code généré automatiquement · ex : <strong>P-' + ym + '-001</strong></div>' +
    '<div class="modal-footer">' +
    '<button class="btn" onclick="closeModal()">Annuler</button>' +
    '<button class="btn btn-primary" onclick="collectPartsAndSave()">Créer le projet</button>' +
    '</div>',
    'Nouveau projet'
  );
}

// Collecte les noms de pièces éventuellement renommés avant de sauvegarder
function collectPartsAndSave() {
  _pendingLibraryParts.forEach((part, i) => {
    const el = document.getElementById('pjf-part-' + i);
    if (el) part.name = el.value || part.name;
  });
  saveProject(null);
}

async function saveProject(id) {
  const body = {
    name:        document.getElementById('pjf-name').value,
    description: document.getElementById('pjf-desc').value,
    notes:       document.getElementById('pjf-notes').value,
  };
  if (id) body.status = document.getElementById('pjf-status').value;
  if (!body.name) return toast('Le nom est requis','error');
  try {
    const saved = id ? await API.put('/projects/'+id, body) : await API.post('/projects', body);

    // Créer les pièces depuis la bibliothèque si applicable (création uniquement)
    if (!id && _pendingLibraryParts.length > 0) {
      for (let i = 0; i < _pendingLibraryParts.length; i++) {
        const part = _pendingLibraryParts[i];
        try {
          const item = await API.post('/projects/' + saved.id + '/items', {
            name:      part.name,
            sort_order: i,
          });
          // Rattacher le fichier bibliothèque à la pièce si disponible
          if (part.file_id && item.id) {
            await API.post(`/projects/${saved.id}/items/${item.id}/prints`, {
              print_id: null, // pas d'impression existante — juste la structure
            }).catch(() => {}); // silencieux si pas d'impression associée
          }
        } catch(e) { console.warn('Pièce non créée:', part.name, e.message); }
      }
      _pendingLibraryParts = [];
      toast(`Projet ${saved.code} créé avec ${saved.items ? saved.items.length : ''} pièces`, 'success');
    } else {
      toast(id ? 'Projet mis à jour' : `Projet ${saved.code} créé`, 'success');
    }

    closeModal();
    renderProjects();
  } catch(e){ toast(e.message,'error'); }
}

async function deleteProject(id) {
  const p = allProjects.find(x=>x.id===id);
  confirmDelete(`Supprimer ${p?.code} "${p?.name}" ?\nLes impressions seront conservées.`, async()=>{
    try{ await API.del('/projects/'+id); toast('Projet supprimé'); renderProjects(); }
    catch(e){ toast(e.message,'error'); }
  });
}

function itemBlock(projectId, item) {
  const prints = item.prints||[];
  const done   = prints.filter(p=>p.status==='done').length;
  const grams  = prints.reduce((s,p)=>s+(parseFloat(p.filament_used)||0),0);
  const pct_   = prints.length>0?Math.round((done/prints.length)*100):0;
  return `
  <div style="background:var(--bg3);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:500;flex:1">${item.name}${item.quantity>1?` <span style="color:var(--text3)">×${item.quantity}</span>`:''}</span>
      <span style="font-size:11px;color:var(--text3)">${done}/${prints.length} · ${grams.toFixed(0)}g</span>
      ${prints.length>0?`<div style="width:50px"><div class="progress-wrap" style="height:3px">
        <div class="progress-fill" style="width:${pct_}%;background:${pct_===100?'var(--success)':'var(--accent)'}"></div>
      </div></div>`:''}
      <button class="btn btn-sm" onclick="openAddPrintToItem(${projectId},${item.id})">+ Impression</button>
      <button class="btn btn-sm btn-danger" onclick="deleteItem(${projectId},${item.id})">✕</button>
    </div>
    ${prints.length>0?printsMiniTable(prints,projectId,item.id)
      :`<div style="font-size:12px;color:var(--text3)">Aucune impression — cliquez "+ Impression".</div>`}
  </div>`;
}

function directPrintsBlock(projectId, prints) {
  return `<div style="margin-top:8px">
    <div style="font-size:11px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Impressions directes</div>
    ${printsMiniTable(prints,projectId,null)}
  </div>`;
}

function printsMiniTable(prints, projectId, itemId) {
  return `<table style="width:100%;font-size:12px">
    <thead><tr><th>Impression</th><th>Imprimante</th><th>Filament</th><th>Durée</th><th>Consommé</th><th>Statut</th><th></th></tr></thead>
    <tbody>
      ${prints.map(pr=>`<tr>
        <td style="font-weight:500">${pr.name}</td>
        <td>${pr.printer_name||'—'}</td>
        <td>${pr.filament_name?`<span style="display:flex;align-items:center;gap:5px">
          <span class="filament-dot" style="background:${pr.color_hex}"></span>${pr.filament_name}</span>`:'—'}</td>
        <td>${fmtDuration(pr.actual_duration||pr.estimated_duration)}</td>
        <td>${pr.filament_used?pr.filament_used+'g':'—'}</td>
        <td>${statusBadge(pr.status)}</td>
        <td><button class="btn btn-sm btn-danger"
          onclick="detachPrint(${projectId},${itemId||'null'},${pr.id})">✕</button></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function openAddItemForm(projectId) {
  openModal(`
    <div class="form-grid">
      <div class="form-group full"><label class="form-label">Nom *</label>
        <input id="itf-name" placeholder="ex: Couvercle, Châssis…"></div>
      <div class="form-group"><label class="form-label">Description</label>
        <input id="itf-desc" placeholder="optionnel"></div>
      <div class="form-group"><label class="form-label">Quantité</label>
        <input id="itf-qty" type="number" min="1" value="1"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveItem(${projectId},null)">Ajouter</button>
    </div>
  `,'Nouvelle pièce');
}

async function saveItem(projectId, itemId) {
  const body = {
    name:        document.getElementById('itf-name').value,
    description: document.getElementById('itf-desc').value,
    quantity:    parseInt(document.getElementById('itf-qty').value)||1,
  };
  if (!body.name) return toast('Le nom est requis','error');
  try {
    if (itemId) await API.put(`/projects/${projectId}/items/${itemId}`,body);
    else        await API.post(`/projects/${projectId}/items`,body);
    closeModal(); toast(itemId?'Pièce modifiée':'Pièce ajoutée','success');
    openProjectDetail(projectId);
  } catch(e){ toast(e.message,'error'); }
}

async function deleteItem(projectId, itemId) {
  confirmDelete('Supprimer cette pièce ?', async()=>{
    try{ await API.del(`/projects/${projectId}/items/${itemId}`); openProjectDetail(projectId); }
    catch(e){ toast(e.message,'error'); }
  });
}

async function openAddPrintToItem(projectId, itemId) {
  const prints = await API.get('/prints?limit=200');
  const free   = prints.filter(p=>!p.project_id||p.project_id==projectId);
  openModal(`
    <div class="form-group"><label class="form-label">Impression *</label>
      <select id="atp-print">
        <option value="">— Sélectionner —</option>
        ${free.map(p=>`<option value="${p.id}">${p.name}${p.filament_name?' · '+p.filament_name:''} · ${p.status}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="attachPrintToItem(${projectId},${itemId})">Rattacher</button>
    </div>
  `,'Rattacher une impression');
}

async function attachPrintToItem(projectId, itemId) {
  const printId = document.getElementById('atp-print').value;
  if (!printId) return toast('Sélectionnez une impression','error');
  try {
    await API.post(`/projects/${projectId}/items/${itemId}/prints`,{print_id:printId});
    closeModal(); toast('Impression rattachée','success'); openProjectDetail(projectId);
  } catch(e){ toast(e.message,'error'); }
}

async function openAddDirectPrint(projectId) {
  const prints = await API.get('/prints?limit=200');
  const free   = prints.filter(p=>!p.project_id);
  openModal(`
    <div class="form-group"><label class="form-label">Impression *</label>
      <select id="adp-print">
        <option value="">— Sélectionner —</option>
        ${free.map(p=>`<option value="${p.id}">${p.name} · ${p.status}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="attachDirectPrint(${projectId})">Rattacher</button>
    </div>
  `,'Impression directe');
}

async function attachDirectPrint(projectId) {
  const printId = document.getElementById('adp-print').value;
  if (!printId) return toast('Sélectionnez une impression','error');
  try {
    await API.post(`/projects/${projectId}/prints`,{print_id:printId});
    closeModal(); toast('Impression rattachée','success'); openProjectDetail(projectId);
  } catch(e){ toast(e.message,'error'); }
}

async function detachPrint(projectId, itemId, printId) {
  try {
    if (itemId && itemId!=='null') await API.del(`/projects/${projectId}/items/${itemId}/prints/${printId}`);
    else await API.del(`/projects/${projectId}/prints/${printId}`);
    toast('Impression détachée'); openProjectDetail(projectId);
  } catch(e){ toast(e.message,'error'); }
}

async function forceProjectStatus(projectId, status) {
  try {
    await API.patch('/projects/'+projectId+'/status',{status,force:true});
    toast('Statut mis à jour','success'); closeModal(); renderProjects();
  } catch(e){ toast(e.message,'error'); }
}

async function autoRefreshStatus(projectId) {
  try {
    await API.patch('/projects/'+projectId+'/status',{force:false});
    toast('Statut recalculé'); closeModal(); renderProjects();
  } catch(e){ toast(e.message,'error'); }
}
