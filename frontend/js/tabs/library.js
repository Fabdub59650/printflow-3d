let libraryThemes  = [];
let libraryObjects = [];
let libraryFiles   = [];
let activeThemeId  = null;
let librarySearch  = '';
let libView        = 'objects'; // 'objects' | 'files'

let _libraryView = 'gallery'; // 'gallery' | 'list'

function setLibraryView(view) {
  _libraryView = view;
  // Mettre à jour les boutons sans reconstruire toute la topbar
  const btnGallery = document.getElementById('lib-btn-gallery');
  const btnList    = document.getElementById('lib-btn-list');
  if (btnGallery) {
    btnGallery.style.background = view === 'gallery' ? 'var(--text)' : 'transparent';
    btnGallery.style.color      = view === 'gallery' ? 'var(--bg2)'  : 'var(--text2)';
  }
  if (btnList) {
    btnList.style.background = view === 'list' ? 'var(--text)' : 'transparent';
    btnList.style.color      = view === 'list' ? 'var(--bg2)'  : 'var(--text2)';
  }
  renderLibraryLayout();
}

async function renderLibrary() {
  await loadTags();
  document.getElementById('page-title').textContent = 'Bibliothèque';
  // Filtre par tag dans la topbar
  const tagFilterHtml = _allTags.length > 0
    ? '<select id="lib-tag-filter" onchange="renderLibrary()" style="font-size:12px;margin-right:4px">' +
      '<option value="">Tous les tags</option>' +
      _allTags.map(t => '<option value="' + t.id + '">' + t.name + '</option>').join('') +
      '</select>'
    : '';
  document.getElementById('topbar-actions').innerHTML = tagFilterHtml +
    `<div id="lib-view-btns" style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden;margin-right:4px">
       <button onclick="setLibraryView('gallery')" title="Vue galerie" id="lib-btn-gallery"
         style="padding:5px 9px;border:none;cursor:pointer;background:${_libraryView==='gallery'?'var(--text)':'transparent'};color:${_libraryView==='gallery'?'var(--bg2)':'var(--text2)'}">⊞</button>
       <button onclick="setLibraryView('list')" title="Vue liste" id="lib-btn-list"
         style="padding:5px 9px;border:none;cursor:pointer;background:${_libraryView==='list'?'var(--text)':'transparent'};color:${_libraryView==='list'?'var(--bg2)':'var(--text2)'}">☰</button>
     </div>
     <button class="btn btn-sm" onclick="openThemeForm()" style="margin-right:4px">+ Thème</button>
     <button class="btn btn-sm" onclick="openObjectForm()" style="margin-right:4px">+ Objet</button>
     <button class="btn btn-primary" onclick="openUploadForm()">↑ Importer fichier</button>
     <label class="btn" style="cursor:pointer" title="Importer un objet depuis un ZIP PrintFlow">
       📦 Importer ZIP
       <input type="file" accept=".zip" style="display:none" onchange="importLibraryZip(this)">
     </label>`;
  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  libraryThemes = await API.get('/library/themes');
  await loadLibraryContent();
}

async function loadLibraryContent() {
  let objUrl  = '/library/objects?';
  let fileUrl = '/library/files?standalone=1&';
  if (activeThemeId) { objUrl  += 'theme_id='+activeThemeId+'&'; fileUrl += 'theme_id='+activeThemeId+'&'; }
  if (librarySearch) { objUrl  += 'search='+encodeURIComponent(librarySearch)+'&';
                       fileUrl += 'search='+encodeURIComponent(librarySearch)+'&'; }
  [libraryThemes, libraryObjects, libraryFiles] = await Promise.all([
    API.get('/library/themes'), API.get(objUrl), API.get(fileUrl)
  ]);
  renderLibraryLayout();
}

function renderLibraryLayout() {
  const content = document.getElementById('content');
  const allThemes = flatThemes();
  const total = libraryObjects.length + libraryFiles.length;

  content.innerHTML = `
  <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start">

    <!-- Sidebar thèmes -->
    <div>
      <div class="card" style="padding:12px">
        <div style="font-size:11px;font-weight:500;color:var(--text3);text-transform:uppercase;
                    letter-spacing:0.06em;margin-bottom:10px">Thèmes</div>
        ${themeItem(null, 'Tout', null)}
        ${allThemes.map(t => themeItem(t.id, t.name, t.level, t.object_count)).join('')}
        <button class="btn btn-sm" style="width:100%;margin-top:10px;font-size:11px"
          onclick="openThemeForm()">+ Nouveau thème</button>
      </div>
    </div>

    <!-- Zone principale -->
    <div>
      <!-- Barre recherche + toggle vue -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" id="lib-search" placeholder="Rechercher…"
               value="${librarySearch}" style="flex:1;min-width:150px"
               oninput="librarySearch=this.value;loadLibraryContent()">
        ${librarySearch ? `<button class="btn btn-sm" onclick="librarySearch='';document.getElementById('lib-search').value='';loadLibraryContent()">✕</button>` : ''}
      </div>

      ${total === 0
        ? `<div class="empty-state">
             <p>${librarySearch ? 'Aucun résultat.' : 'Bibliothèque vide.'}</p>
             <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
               <button class="btn btn-primary" onclick="openObjectForm()">+ Créer un objet</button>
               <button class="btn" onclick="openUploadForm()">↑ Importer un fichier</button>
             </div>
           </div>`
        : `<!-- Objets -->
           ${libraryObjects.length > 0 ? `
           <div style="margin-bottom:8px;font-size:11px;font-weight:500;color:var(--text3);
                       text-transform:uppercase;letter-spacing:0.06em">
             Objets · ${libraryObjects.length}
           </div>
           ${_libraryView === 'gallery'
             ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:24px">' +
               libraryObjects.map(objectCard).join('') + '</div>'
             : '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">' +
               libraryObjects.map(objectCardList).join('') + '</div>'
           }` : ''}

           <!-- Fichiers standalone -->
           ${libraryFiles.length > 0 ? `
           <div style="margin-bottom:8px;font-size:11px;font-weight:500;color:var(--text3);
                       text-transform:uppercase;letter-spacing:0.06em">
             Fichiers standalone · ${libraryFiles.length}
           </div>
           <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
             ${libraryFiles.map(fileCard).join('')}
           </div>` : ''}`}
    </div>
  </div>`;
}

function flatThemes() {
  const out = [];
  libraryThemes.forEach(t => {
    out.push({ ...t, level: 0 });
    (t.children||[]).forEach(c => out.push({ ...c, level: 1 }));
  });
  return out;
}

function themeItem(id, name, level, count) {
  const active = activeThemeId == id;
  const badge  = count !== null && count !== undefined ? ` · ${count}` : '';
  return `
  <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
    <div onclick="setActiveTheme(${id})"
         style="flex:1;display:flex;align-items:center;justify-content:space-between;
                padding:6px 8px;padding-left:${level>0?'18':'8'}px;
                border-radius:var(--radius);cursor:pointer;
                background:${active?'var(--accent-bg)':'transparent'};
                color:${active?'var(--accent)':'var(--text2)'}">
      <span style="font-size:13px">${level>0?'└ ':''}${name}</span>
      <span style="font-size:11px;opacity:0.6">${badge}</span>
    </div>
    ${id !== null ? `
    <button class="btn btn-sm" style="padding:2px 5px;font-size:10px"
      onclick="openThemeForm(${id})">✏</button>
    <button class="btn btn-sm btn-danger" style="padding:2px 5px;font-size:10px"
      onclick="deleteTheme(${id})">✕</button>` : ''}
  </div>`;
}

// ── Carte objet ───────────────────────────────────────────
function objectCard(o) {
  const size  = formatFileSize(o.total_size || 0);
  const tags  = o.tags ? o.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
  const photoUrl = o.photo_path ? '/api/library/objects/' + o.id + '/photo' : null;
  return `
  <div class="card" style="padding:0;display:flex;flex-direction:column;overflow:hidden">
    ${photoUrl ? `
    <div style="width:100%;height:180px;overflow:hidden;position:relative;background:var(--bg3);display:flex;align-items:center;justify-content:center">
      <img src="${photoUrl}" alt="${o.name}"
           style="width:100%;height:100%;object-fit:contain"
           onerror="this.parentElement.style.display='none'">
    </div>` : `
    <div style="width:100%;height:80px;background:var(--accent-bg);
                display:flex;align-items:center;justify-content:center;font-size:32px">◈</div>`}
    <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;
                    text-overflow:ellipsis">${o.name}</div>
        <div style="font-size:11px;color:var(--text3)">
          ${o.file_count} fichier${o.file_count!=1?'s':''}
          ${size ? ' · '+size : ''}
          ${o.theme_name ? ' · '+o.theme_name : ''}
        </div>
      </div>
    </div>
    ${o.description ? `<div style="font-size:12px;color:var(--text2);line-height:1.4">${o.description}</div>` : ''}
    ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px">
      ${tags.map(t=>`<span style="font-size:10px;padding:2px 7px;background:var(--bg3);
        border-radius:20px;color:var(--text2)">#${t}</span>`).join('')}
    </div>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">
      <button class="btn btn-sm btn-primary" onclick="openObjectDetail(${o.id})">Ouvrir</button>
      <button class="btn btn-sm" onclick="openObjectForm(${o.id})">✏</button>
      <button class="btn btn-sm" onclick="openObjectStats(${o.id}, '${o.name.replace(/['"]/g, '')}')">📊</button>
      <button class="btn btn-sm" onclick="exportObjectPDF(${o.id})" title="Export PDF">↓ PDF</button>
      <button class="btn btn-sm btn-danger" onclick="deleteObject(${o.id})">✕</button>
    </div>
    </div>
  </div>`;
}

// ── Carte objet vue liste ────────────────────────────────
function objectCardList(o) {
  const tags     = o.tags ? o.tags.split(',').map(function(t){ return t.trim(); }).filter(Boolean) : [];
  const photoUrl = o.photo_path ? '/api/library/objects/' + o.id + '/photo' : null;
  return '<div class="card" style="padding:10px;display:flex;align-items:center;gap:12px">' +
    (photoUrl
      ? '<img src="' + photoUrl + '" style="width:56px;height:56px;object-fit:cover;border-radius:var(--radius);flex-shrink:0" onerror="this.style.display=\'none\'">'
      : '<div style="width:56px;height:56px;background:var(--accent-bg);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">◈</div>') +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + o.name + '</div>' +
      '<div style="font-size:11px;color:var(--text3)">' +
        o.file_count + ' fichier' + (o.file_count!=1?'s':'') +
        (o.theme_name ? ' · ' + o.theme_name : '') +
        (o.description ? ' — ' + o.description.substring(0,60) + (o.description.length>60?'…':'') : '') +
      '</div>' +
      (tags.length ? '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px">' +
        tags.map(function(t){ return '<span style="font-size:10px;padding:1px 6px;background:var(--bg3);border-radius:20px;color:var(--text2)">#' + t + '</span>'; }).join('') +
        '</div>' : '') +
      (o.source_url ? '<div style="margin-top:5px">' + renderSourceBadge(o.source_url) + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;gap:5px;flex-shrink:0">' +
      '<button class="btn btn-sm btn-primary" onclick="openObjectDetail(' + o.id + ')">Ouvrir</button>' +
      '<button class="btn btn-sm" title="QR Code" onclick="openQRCode(' + o.id + ',\'' + o.name.replace(/'/g,"\\'") + '\')">▦</button>' +
      '<button class="btn btn-sm" onclick="openObjectForm(' + o.id + ')">✏</button>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteObject(' + o.id + ')">✕</button>' +
    '</div></div>';
}

// ── Carte fichier standalone ──────────────────────────────
function fileCard(f) {
  const ext      = (f.file_type||'').toUpperCase();
  const extColor = {STL:'#185FA5','3MF':'#1D9E75',OBJ:'#BA7517',GCODE:'#888780',STEP:'#534AB7'}[ext]||'#888780';
  const tags     = f.tags ? f.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
  return `
  <div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="width:38px;height:38px;border-radius:var(--radius);
                  background:${extColor}18;display:flex;align-items:center;
                  justify-content:center;flex-shrink:0">
        <span style="font-size:10px;font-weight:700;color:${extColor}">${ext}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;
                    text-overflow:ellipsis">${f.name}</div>
        <div style="font-size:11px;color:var(--text3)">${formatFileSize(f.file_size)}${f.theme_name?' · '+f.theme_name:''}</div>
      </div>
    </div>
    ${f.description ? `<div style="font-size:12px;color:var(--text2)">${f.description}</div>` : ''}
    ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px">
      ${tags.map(t=>`<span style="font-size:10px;padding:2px 7px;background:var(--bg3);border-radius:20px;color:var(--text2)">#${t}</span>`).join('')}
    </div>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <a href="/api/library/files/${f.id}/download" class="btn btn-sm btn-primary"
         style="text-decoration:none">↓ Télécharger</a>
      <button class="btn btn-sm" onclick="openLinkToPrint(${f.id})">Associer impression</button>
      <button class="btn btn-sm" onclick="openFileEditForm(${f.id})">✏</button>
      <button class="btn btn-sm btn-danger" onclick="deleteFile(${f.id})">✕</button>
    </div>
    <div style="font-size:10px;color:var(--text3)">${f.download_count} téléchargement${f.download_count>1?'s':''} · ${fmtDate(f.created_at)}</div>
  </div>`;
}

// ── Détail objet ──────────────────────────────────────────
async function openObjectDetail(id) {
  const [obj, linkedPrints] = await Promise.all([
    API.get('/library/objects/' + id),
    API.get('/prints?limit=200').then(function(prints) {
      return prints.filter(function(p) { return String(p.library_object_id) === String(id); });
    }).catch(() => []),
  ]);
  const totalSize = obj.files.reduce(function(s,f){ return s+(f.file_size||0); }, 0);
  const photoUrl  = obj.photo_path ? '/api/library/objects/' + obj.id + '/photo' : null;

  // Document joint
  const attachHtml = obj.attachment_path
    ? '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg3);border-radius:var(--radius);margin-bottom:12px">' +
        '<span style="font-size:18px">' + (obj.attachment_name && obj.attachment_name.endsWith('.pdf') ? '📄' : '🖼') + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (obj.attachment_name||'Document joint') + '</div>' +
          '<div style="font-size:11px;color:var(--text3)">Document joint</div>' +
        '</div>' +
        '<a href="/api/library/objects/' + id + '/attachment" target="_blank" class="btn btn-sm" style="text-decoration:none">↗ Ouvrir</a>' +
        '<a href="/api/library/objects/' + id + '/attachment" download class="btn btn-sm" style="text-decoration:none">↓</a>' +
        '<button class="btn btn-sm btn-danger" onclick="deleteObjectAttachment(' + id + ')">✕</button>' +
      '</div>'
    : '<div style="margin-bottom:12px">' +
        '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg3);border-radius:var(--radius);cursor:pointer;font-size:13px;color:var(--text2)">' +
          '<span>📎</span> Ajouter un document joint (PDF, image...)' +
          '<input type="file" accept=".pdf,image/*" style="display:none" onchange="uploadObjectAttachment(' + id + ',this)">' +
        '</label>' +
      '</div>';

  // Calculs notation
  const ratedPrints = linkedPrints.filter(function(p) { return p.rating; });
  const avgRating   = ratedPrints.length
    ? (ratedPrints.reduce(function(s,p){ return s+p.rating; }, 0) / ratedPrints.length).toFixed(1)
    : null;
  const bestPrint = linkedPrints.reduce(function(best,p) {
    return (!best || (p.rating||0) > (best.rating||0)) ? p : best;
  }, null);

  // Section impressions liées
  const printsHtml = linkedPrints.length > 0
    ? '<div style="margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
          '<div style="font-size:13px;font-weight:500;color:var(--text2)">🖨 ' + linkedPrints.length +
            ' impression' + (linkedPrints.length>1?'s':'') + ' liée' + (linkedPrints.length>1?'s':'') + '</div>' +
          (avgRating ? '<div style="display:flex;align-items:center;gap:5px">' +
            '<span style="font-size:13px;color:#f59e0b">★</span>' +
            '<span style="font-size:13px;font-weight:500">' + avgRating + '</span>' +
            '<span style="font-size:11px;color:var(--text3)">/ 5 (' + ratedPrints.length + ' noté' + (ratedPrints.length>1?'s':'') + ')</span>' +
          '</div>' : '') +
        '</div>' +
        (bestPrint && bestPrint.rating >= 4 ?
          '<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:var(--radius);padding:8px 12px;margin-bottom:8px;border:1px solid #fbbf24">' +
            '<div style="font-size:11px;font-weight:500;color:#92400e;margin-bottom:4px">⭐ Meilleure impression</div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
              '<span style="font-size:13px;font-weight:500;flex:1">' + bestPrint.name + '</span>' +
              '<span style="color:#f59e0b;font-size:14px">' + '★'.repeat(bestPrint.rating) + '</span>' +
              '<button class="btn btn-sm" onclick="closeModal();setTimeout(function(){openPrintDetail(' + bestPrint.id + ')},100)">Détail</button>' +
            '</div>' +
            (bestPrint.layer_height || bestPrint.infill_percent || bestPrint.print_temp ?
              '<div style="font-size:11px;color:#92400e;margin-top:4px">' +
              (bestPrint.layer_height ? 'Couche: ' + bestPrint.layer_height + 'mm ' : '') +
              (bestPrint.infill_percent ? '· Remplissage: ' + bestPrint.infill_percent + '% ' : '') +
              (bestPrint.print_temp ? '· Buse: ' + bestPrint.print_temp + '°C' : '') + '</div>' : '') +
          '</div>' : '') +
        '<div style="display:flex;flex-direction:column;gap:6px">' +
        linkedPrints.slice(0,5).map(function(p) {
          const stars = p.rating ? '<span style="color:#f59e0b;font-size:12px">' + '★'.repeat(p.rating) + '☆'.repeat(5-p.rating) + '</span>' : '';
          return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 10px;background:var(--bg3);border-radius:var(--radius)">' +
            (p.color_hex ? '<span style="width:8px;height:8px;border-radius:50%;background:' + p.color_hex + ';flex-shrink:0;display:inline-block"></span>' : '') +
            '<span style="flex:1">' + p.name + '</span>' + stars +
            '<span style="color:var(--text3)">' + fmtDate(p.created_at) + '</span>' +
            statusBadge(p.status) +
            '<button class="btn btn-sm" onclick="closeModal();setTimeout(function(){openPrintDetail(' + p.id + ')},100)">Détail</button>' +
          '</div>';
        }).join('') +
        (linkedPrints.length > 5 ? '<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:4px">' + (linkedPrints.length-5) + ' autres impression(s)…</div>' : '') +
      '</div></div>'
    : '';

  // Section fichiers
  const filesHtml = obj.files.length === 0
    ? '<p style="color:var(--text3);font-size:13px;padding:12px 0">Aucun fichier. Cliquez "+ Ajouter un fichier".</p>'
    : '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;' + (obj.files.length > 4 ? 'max-height:340px;overflow-y:auto;padding-right:4px;' : '') + '">' +
        obj.files.map(function(f) {
          const ext      = (f.file_type||'').toUpperCase();
          const extColor = {STL:'#185FA5','3MF':'#1D9E75',OBJ:'#BA7517',GCODE:'#888780',STEP:'#534AB7'}[ext]||'#888780';
          const is3d     = ['stl','3mf','obj'].includes((f.file_type||'').toLowerCase());
          const safeN    = (f.part_name||f.name).replace(/'/g,"\\'");
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg3);border-radius:var(--radius)">' +
            '<span style="font-size:10px;font-weight:700;color:' + extColor + ';background:' + extColor + '18;padding:3px 6px;border-radius:4px;white-space:nowrap">' + ext + '</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                '<span style="font-size:13px;font-weight:500">' + (f.part_name||f.name) + '</span>' +
                (f.quantity && f.quantity > 1 ? '<span style="font-size:10px;padding:2px 7px;border-radius:20px;background:#f0fdf4;color:#10b981;font-weight:600">×' + f.quantity + '</span>' : '') +
                (f.color_ref ? '<span style="font-size:10px;padding:2px 7px;border-radius:20px;background:var(--bg3);color:var(--text2);border:1px solid var(--border)">🎨 ' + f.color_ref + '</span>' : '') +
                (f.version ? '<span style="font-size:10px;padding:2px 7px;border-radius:20px;background:var(--accent-bg);color:var(--accent);font-weight:500">' + f.version + '</span>' : '') +
              '</div>' +
              (f.changelog ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;font-style:italic">↳ ' + f.changelog + '</div>' : '') +
              (f.recommended_materials ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' +
                f.recommended_materials.split(',').map(function(m){ return '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--accent-bg);color:var(--accent)">' + m + '</span>'; }).join('') +
              '</div>' : '') +
              '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + f.original_name + ' · ' + formatFileSize(f.file_size) + '</div>' +
              (f.version_history && f.version_history.length > 1 ?
                '<button onclick="toggleVersionHistory(' + f.id + ')" style="font-size:10px;color:var(--accent);background:none;border:none;cursor:pointer;padding:0;margin-top:2px">' +
                  (f.version_history.length-1) + ' version(s) précédente(s) ▾' +
                '</button><div id="vh-' + f.id + '" style="display:none;margin-top:4px"></div>' : '') +
            '</div>' +
            '<a href="/api/library/files/' + f.id + '/download" class="btn btn-sm" style="text-decoration:none">↓</a>' +
            (is3d ? '<button class="btn btn-sm" onclick="openSTLPreview(' + f.id + ',\'' + safeN + '\',' + id + ')" title="Prévisualiser 3D">👁 3D</button>' : '') +
            '<button class="btn btn-sm" title="Nouvelle version" onclick="openNewVersionForm(' + f.id + ',\'' + safeN + '\',' + id + ')">⬆ v+</button>' +
            '<button class="btn btn-sm" onclick="openFileEditForm(' + f.id + ')" title="Modifier matières et infos">⚙</button>' +
            '<button class="btn btn-sm" onclick="openPartNameEdit(' + id + ',' + f.id + ',\'' + safeN + '\')">✏</button>' +
            '<button class="btn btn-sm btn-danger" onclick="removeFileFromObject(' + id + ',' + f.id + ')">✕</button>' +
          '</div>';
        }).join('') +
      '</div>';

  // Photo
  const photoHtml = photoUrl
    ? '<div style="margin-bottom:12px;border-radius:var(--radius-lg);overflow:hidden;max-height:220px;background:var(--bg3);display:flex;align-items:center;justify-content:center">' +
        '<img src="' + photoUrl + '" alt="' + obj.name + '" style="width:100%;max-height:220px;object-fit:contain;display:block" onerror="this.parentElement.style.display=\'none\'">' +
      '</div>'
    : '';

  const tagsHtml = obj.tags
    ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">' +
        obj.tags.split(',').map(function(t){ return '<span style="font-size:10px;padding:2px 7px;background:var(--bg3);border-radius:20px;color:var(--text2)">#' + t.trim() + '</span>'; }).join('') +
      '</div>'
    : '';

  openModal(
    photoHtml +
    '<div style="margin-bottom:16px">' +
      (obj.theme_name ? '<span style="font-size:12px;color:var(--text3)">' + obj.theme_name + '</span>' : '') +
      (obj.description ? '<p style="font-size:13px;color:var(--text2);margin-top:8px">' + obj.description + '</p>' : '') +
      tagsHtml +
      (obj.source_url ? '<div style="margin-top:10px">' + renderSourceBadge(obj.source_url) + '</div>' : '') +
    '</div>' +
    printsHtml +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<span class="form-label">' + obj.files.length + ' fichier' + (obj.files.length!=1?'s':'') + ' · ' + formatFileSize(totalSize) + '</span>' +
      '<button class="btn btn-sm btn-primary" onclick="openUploadForm(' + id + ')">+ Ajouter un fichier</button>' +
    '</div>' +
    filesHtml +
    attachHtml +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Fermer</button>' +
      '<button class="btn" onclick="exportLibraryObject(' + id + ',\'' + obj.name.replace(/'/g,"\\'") + '\')">↓ Exporter</button>' +
      '<button class="btn" onclick="openQRCode(' + id + ',\'' + obj.name.replace(/'/g,"\\'") + '\')">QR Code</button>' +
      '<button class="btn" onclick="closeModal();openObjectForm(' + id + ')">Modifier</button>' +
      '<button class="btn btn-danger btn-sm" onclick="confirmDeleteObjectFull(' + id + ')">Supprimer tout</button>' +
    '</div>',
    'Objet : ' + obj.name
  );
}
function openPartNameEdit(objectId, fileId, currentName) {
  openModal(`
    <div class="form-group">
      <label class="form-label">Nom de la partie</label>
      <input id="pn-name" value="${currentName}" placeholder="ex: Tête, Corps, Bras gauche…">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePartName(${objectId},${fileId})">Enregistrer</button>
    </div>
  `, 'Renommer la partie');
}

async function savePartName(objectId, fileId) {
  const name = document.getElementById('pn-name').value;
  try {
    await API.patch(`/library/objects/${objectId}/files/${fileId}`, { part_name: name });
    closeModal();
    openObjectDetail(objectId);
  } catch (e) { toast(e.message, 'error'); }
}

async function removeFileFromObject(objectId, fileId) {
  try {
    await API.del(`/library/objects/${objectId}/files/${fileId}`);
    toast('Fichier retiré de l\'objet');
    await loadLibraryContent();
    openObjectDetail(objectId);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Formulaire objet ──────────────────────────────────────


function toggleMaterial(el) {
  const sel = el.dataset.selected === '1';
  el.dataset.selected  = sel ? '0' : '1';
  el.style.background  = sel ? 'var(--bg3)'    : 'var(--accent)';
  el.style.borderColor = sel ? 'var(--border2)' : 'var(--accent)';
  el.style.color       = sel ? 'var(--text2)'   : '#fff';
}

// ── Matières pour objets bibliothèque ────────────────────
const LIBRARY_MATERIALS = ['PLA','PLA+','PLA-CF','PETG','PETG-CF','PETG-GF',
  'ABS','ASA','TPU','Nylon','PC','HIPS','PVA','Résine','Autre'];

function openObjectForm(id=null) {
  const o = id ? libraryObjects.find(x=>x.id===id) : {};
  const allT = flatThemes();
  openModal(`
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Nom de l'objet *</label>
        <input id="of-name" value="${o&&o.name||''}" placeholder="ex: Statuette dragon, Support bureau…">
      </div>
      <div class="form-group">
        <label class="form-label">Thème</label>
        <select id="of-theme">
          <option value="">— Sans thème —</option>
          ${allT.map(t=>`<option value="${t.id}" ${o&&o.theme_id==t.id?'selected':''}>
            ${'└ '.repeat(t.level)}${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">URL source</label>
        <input id="of-url" value="${o&&o.source_url||''}" type="url" placeholder="https://…">
      </div>
      <div class="form-group full">
        <label class="form-label">Tags</label>
        <input id="of-tags" value="${o&&o.tags||''}" placeholder="ex: décoration, figurine, articulation">
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea id="of-desc">${o&&o.description||''}</textarea>
      </div>

      <div class="form-group full">
        <label class="form-label">Photo de l'objet</label>
        ${id && o && o.photo_path ? `
        <div style="margin-bottom:8px">
          <img src="/api/library/objects/${id}/photo" alt="Photo actuelle"
               style="max-height:120px;border-radius:var(--radius);object-fit:cover"
               onerror="this.style.display='none'">
          <button class="btn btn-sm btn-danger" style="margin-left:8px;vertical-align:top"
            onclick="deleteObjectPhoto(${id})">Supprimer la photo</button>
        </div>` : ''}
        <input id="of-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
        <div style="font-size:11px;color:var(--text3);margin-top:3px">JPG, PNG, WebP — max 10 Mo</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveObject(${id||'null'})">${id?'Enregistrer':'Créer l\'objet'}</button>
    </div>
  `, id ? "Modifier l'objet" : 'Nouvel objet');




}

// ── Tags ─────────────────────────────────────────────────
let _allTags = [];

async function loadTags() {
  try { _allTags = await API.get('/library/tags'); } catch(_) { _allTags = []; }
}

function renderTagPicker(selectedIds = []) {
  return '<div id="tag-picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">' +
    _allTags.map(t =>
      '<span onclick="toggleTag(' + t.id + ',this)" ' +
      'style="padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;border:1px solid var(--border2);' +
      'background:' + (selectedIds.includes(t.id)?'var(--accent)':'var(--bg3)') + ';' +
      'color:' + (selectedIds.includes(t.id)?'#fff':'var(--text2)') + '" ' +
      'data-tag-id="' + t.id + '" data-selected="' + (selectedIds.includes(t.id)?'1':'0') + '">' +
      t.name + '</span>'
    ).join('') +
    '<button class="btn btn-sm" onclick="promptNewTag()" style="font-size:11px">+ Tag</button>' +
    '</div>';
}

function toggleTag(id, el) {
  const sel = el.dataset.selected === '1';
  el.dataset.selected = sel ? '0' : '1';
  el.style.background = sel ? 'var(--bg3)' : 'var(--accent)';
  el.style.color      = sel ? 'var(--text2)' : '#fff';
}

async function promptNewTag() {
  const name = prompt('Nom du nouveau tag :');
  if (!name || !name.trim()) return;
  try {
    const tag = await API.post('/library/tags', { name: name.trim() });
    _allTags.push(tag);
    const picker = document.getElementById('tag-picker');
    if (picker) {
      const span = document.createElement('span');
      span.onclick = () => toggleTag(tag.id, span);
      span.style.cssText = 'padding:3px 10px;border-radius:12px;font-size:12px;cursor:pointer;border:1px solid var(--border2);background:var(--bg3);color:var(--text2)';
      span.dataset.tagId = tag.id;
      span.dataset.selected = '0';
      span.textContent = tag.name;
      picker.insertBefore(span, picker.lastElementChild);
    }
  } catch(e) { toast(e.message, 'error'); }
}

function getSelectedTagIds() {
  return Array.from(document.querySelectorAll('#tag-picker [data-tag-id]'))
    .filter(el => el.dataset.selected === '1')
    .map(el => parseInt(el.dataset.tagId));
}

async function saveObject(id) {
  const body = {
    name:        document.getElementById('of-name').value,
    theme_id:    document.getElementById('of-theme').value || null,
    source_url:  document.getElementById('of-url').value || null,
    tags:        document.getElementById('of-tags').value || null,
    description: document.getElementById('of-desc').value || null,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    const saved = id ? await API.put('/library/objects/'+id, body)
                     : await API.post('/library/objects', body);

    // Upload la photo si sélectionnée
    const photoInput = document.getElementById('of-photo');
    if (photoInput && photoInput.files && photoInput.files.length > 0) {
      const fd = new FormData();
      fd.append('file', photoInput.files[0]);
      await fetch('/api/library/objects/' + saved.id + '/photo', {
        method: 'POST', body: fd
      });
    }

    closeModal();
    toast(id ? 'Objet mis à jour' : 'Objet créé', 'success');
    if (!id) {
      await loadLibraryContent();
      openObjectDetail(saved.id);
    } else {
      await loadLibraryContent();
      openObjectDetail(saved.id);
    }
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteObjectPhoto(objectId) {
  try {
    await fetch('/api/library/objects/' + objectId + '/photo', { method: 'DELETE' });
    toast('Photo supprimée');
    closeModal();
    openObjectForm(objectId);
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteObject(id) {
  confirmDelete('Supprimer cet objet ? Les fichiers seront conservés en standalone.', async () => {
    try { await API.del('/library/objects/'+id); toast('Objet supprimé'); loadLibraryContent(); }
    catch (e) { toast(e.message, 'error'); }
  });
}

async function confirmDeleteObjectFull(id) {
  confirmDelete('Supprimer l\'objet ET tous ses fichiers du disque ? Cette action est irréversible.', async () => {
    try {
      await fetch('/api/library/objects/'+id+'/full', { method:'DELETE' });
      toast('Objet et fichiers supprimés');
      closeModal();
      loadLibraryContent();
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ── Upload ────────────────────────────────────────────────
async function uploadObjectAttachment(id, input) {
  if (!input.files || !input.files[0]) return;
  const fd = new FormData();
  fd.append('file', input.files[0]);
  try {
    await fetch('/api/library/objects/' + id + '/attachment', { method: 'POST', body: fd });
    toast('Document joint ajouté', 'success');
    await loadLibraryContent();
    openObjectDetail(id);
  } catch(e) { toast('Erreur : ' + e.message, 'error'); }
}

async function deleteObjectAttachment(id) {
  confirmDelete('Supprimer le document joint ?', async function() {
    try {
      await fetch('/api/library/objects/' + id + '/attachment', { method: 'DELETE' });
      toast('Document supprimé');
      await loadLibraryContent();
      openObjectDetail(id);
    } catch(e) { toast('Erreur : ' + e.message, 'error'); }
  });
}

// ── Export / Import objet bibliothèque ───────────────────────────────────

function exportLibraryObject(id, name) {
  toast('Préparation de l\'export…', 'info');
  const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const a = document.createElement('a');
  a.href = '/api/library/objects/' + id + '/export';
  a.download = 'printflow_' + safeName + '.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function importLibraryZip(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  input.value = ''; // Reset pour permettre de réimporter le même fichier

  // Afficher progression
  const toastId = toast('Import en cours : ' + file.name + '…', 'info', 0);
  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/library/import', { method: 'POST', body: fd });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || 'Erreur import');

    toast(
      'Import réussi : "' + result.name + '" · ' +
      result.files_imported + ' fichier(s)' +
      (result.has_photo ? ' · photo' : '') +
      (result.has_attachment ? ' · document' : ''),
      'success'
    );
    await loadLibraryContent();
    openObjectDetail(result.object_id);
  } catch(e) {
    toast('Erreur import : ' + e.message, 'error');
  }
}

function openUploadForm(prefillObjectId=null) {
  const allT = flatThemes();
  const objectOptions = libraryObjects.map(o=>
    `<option value="${o.id}" ${o.id==prefillObjectId?'selected':''}>${o.name}</option>`
  ).join('');

  openModal(`
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">Fichier * (.stl, .3mf, .obj, .gcode, .step)</label>
        <input id="lib-file" type="file" accept=".stl,.3mf,.obj,.gcode,.step"
               onchange="updateUploadName(this)">
      </div>
      <div class="form-group full">
        <label class="form-label">Nom affiché</label>
        <input id="lib-name" placeholder="Laissez vide pour utiliser le nom du fichier">
      </div>
      <div class="form-group">
        <label class="form-label">Rattacher à un objet</label>
        <select id="lib-object">
          <option value="">— Fichier standalone —</option>
          ${objectOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nom de la partie (si objet)</label>
        <input id="lib-partname" placeholder="ex: Tête, Corps, Bras gauche…">
      </div>
      <div class="form-group">
        <label class="form-label">Thème (si standalone)</label>
        <select id="lib-theme">
          <option value="">— Sans thème —</option>
          ${allT.map(t=>`<option value="${t.id}" ${activeThemeId==t.id?'selected':''}>
            ${'└ '.repeat(t.level)}${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">URL source</label>
        <input id="lib-url" type="url" placeholder="https://…">
      </div>
      <div class="form-group">
        <label class="form-label">Version</label>
        <input id="lib-version" placeholder="ex: v1.0, v2.1, rev3">
      </div>
      <div class="form-group full">
        <label class="form-label">Tags</label>
        <input id="lib-tags" placeholder="tag1, tag2…">
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea id="lib-desc" style="min-height:60px"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Quantité à imprimer</label>
        <input id="lib-quantity" type="number" min="1" max="99" value="1" style="width:80px">
      </div>
      <div class="form-group">
        <label class="form-label">Couleur recommandée</label>
        <input id="lib-color-ref" placeholder="ex: Blanc, Rouge, Noir…">
      </div>
      <div class="form-group full">
        <label class="form-label">Matières recommandées</label>
        <div id="upload-materials-picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${LIBRARY_MATERIALS.map(function(mat) {
            return '<span onclick="toggleMaterial(this)" data-mat="' + mat + '" data-selected="0" ' +
              'style="padding:5px 14px;border-radius:20px;border:1px solid var(--border2);cursor:pointer;' +
              'font-size:12px;background:var(--bg3);color:var(--text2);white-space:nowrap;user-select:none;transition:all 0.15s">' + mat + '</span>';
          }).join('')}
        </div>
      </div>
    </div>
    <div id="upload-progress" style="display:none;margin-bottom:12px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:6px">Envoi en cours…</div>
      <div class="progress-wrap"><div id="upload-bar" class="progress-fill" style="width:0%;transition:width 0.3s"></div></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" id="upload-btn" onclick="uploadFile()">Importer</button>
    </div>
  `, 'Importer un fichier');
}

function updateUploadName(input) {
  const file = input.files[0];
  if (!file) return;
  const nameEl = document.getElementById('lib-name');
  if (!nameEl.value) nameEl.value = file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
}

async function uploadFile() {
  const fileInput = document.getElementById('lib-file');
  if (!fileInput.files.length) return toast('Sélectionnez un fichier', 'error');
  const file = fileInput.files[0];
  if (file.size > 300*1024*1024) return toast('Fichier trop volumineux (max 300 Mo)', 'error');

  const btn = document.getElementById('upload-btn');
  btn.disabled = true; btn.textContent = 'Envoi…';
  document.getElementById('upload-progress').style.display = 'block';

  const fd = new FormData();
  fd.append('file',        file);
  fd.append('name',        document.getElementById('lib-name').value || file.name.replace(/\.[^.]+$/,''));
  fd.append('object_id',   document.getElementById('lib-object').value);
  fd.append('part_name',   document.getElementById('lib-partname').value);
  fd.append('theme_id',    document.getElementById('lib-theme').value);
  fd.append('tags',        document.getElementById('lib-tags').value);
  fd.append('description', document.getElementById('lib-desc').value);
  fd.append('source_url',  document.getElementById('lib-url').value);
  fd.append('version',     document.getElementById('lib-version')?.value || '');
  fd.append('quantity',    document.getElementById('lib-quantity')?.value || '1');
  fd.append('color_ref',   document.getElementById('lib-color-ref')?.value || '');
  const uploadMatSpans = document.querySelectorAll('#upload-materials-picker [data-mat]');
  const uploadMats = Array.from(uploadMatSpans).filter(function(s){ return s.dataset.selected==='1'; }).map(function(s){ return s.dataset.mat; });
  if (uploadMats.length) fd.append('recommended_materials', uploadMats.join(','));

  try {
    // Progression simulée — multer bufferise côté serveur donc onprogress ne reçoit pas d'events
    const bar = document.getElementById('upload-bar');
    let pct = 0;
    const estimatedMs = Math.max(1000, file.size / 50000); // ~50 Ko/ms estimé
    const step = 100 / (estimatedMs / 100);
    const progressTimer = setInterval(function() {
      pct = Math.min(pct + step, 90); // plafonner à 90% — le vrai 100% arrive à la réponse
      if (bar) bar.style.width = pct + '%';
    }, 100);

    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        clearInterval(progressTimer);
        if (bar) bar.style.width = '100%';
        if (xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch(_) { resolve({}); }
        } else {
          let msg = 'Erreur ' + xhr.status;
          try { msg = JSON.parse(xhr.responseText).error || msg; } catch(_) {
            msg = xhr.status === 413 ? 'Fichier trop volumineux — vérifiez la config Nginx (client_max_body_size)' :
                  xhr.status === 404 ? 'Route introuvable' :
                  xhr.status === 500 ? 'Erreur serveur' : msg;
          }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => { clearInterval(progressTimer); reject(new Error('Erreur réseau')); };
      xhr.open('POST', '/api/library/files');
      xhr.send(fd);
    });
    closeModal();
    toast('Fichier importé', 'success');
    // Rouvrir le détail objet si rattaché
    await loadLibraryContent();
    if (result.object_id) openObjectDetail(result.object_id);
  } catch (e) {
    toast('Erreur : '+e.message, 'error');
    btn.disabled = false; btn.textContent = 'Importer';
  }
}

// ── Modifier fichier standalone ───────────────────────────
async function openFileEditForm(id) {
  // Le fichier peut être dans libraryFiles (standalone) ou dans obj.files (lié à un objet)
  let f = libraryFiles.find(x => x.id === id);
  if (!f) {
    try { f = await API.get('/library/files/' + id); } catch(_) {}
  }
  if (!f) return toast('Fichier introuvable', 'error');
  const allT = flatThemes();
  // Sécuriser les valeurs pour le template
  const safeName  = (f.name||'').replace(/`/g,"'");
  const safeUrl   = (f.source_url||'').replace(/`/g,"'");
  const safeTags  = (f.tags||'').replace(/`/g,"'");
  const safeDesc  = (f.description||'').replace(/`/g,"'").replace(/</g,'&lt;');
  const safeOrig  = (f.original_name||f.name||'').replace(/`/g,"'");
  const saved = f.recommended_materials ? f.recommended_materials.split(',') : [];
  const matHtml = LIBRARY_MATERIALS.map(function(mat) {
    const sel = saved.includes(mat);
    return '<span onclick="toggleMaterial(this)" data-mat="' + mat + '" data-selected="' + (sel?'1':'0') + '" ' +
      'style="padding:5px 14px;border-radius:20px;border:1px solid ' + (sel?'var(--accent)':'var(--border2)') + ';cursor:pointer;' +
      'font-size:12px;background:' + (sel?'var(--accent)':'var(--bg3)') + ';color:' + (sel?'#fff':'var(--text2)') + ';' +
      'white-space:nowrap;user-select:none;transition:all 0.15s">' + mat + '</span>';
  }).join('');

  openModal(
    '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">Nom *</label>' +
        '<input id="fe-name" value="' + safeName.replace(/"/g,'&quot;') + '"></div>' +
      '<div class="form-group"><label class="form-label">Thème</label>' +
        '<select id="fe-theme"><option value="">— Sans thème —</option>' +
        allT.map(function(t){ return '<option value="' + t.id + '"' + (f.theme_id==t.id?' selected':'') + '>' + '\u2514 '.repeat(t.level) + t.name + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">URL source</label>' +
        '<input id="fe-url" value="' + safeUrl.replace(/"/g,'&quot;') + '" type="url"></div>' +
      '<div class="form-group">' +
        '<label class="form-label">Quantité à imprimer</label>' +
        '<input id="fe-quantity" type="number" min="1" max="99" value="' + (f.quantity||1) + '" style="width:80px">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Couleur recommandée</label>' +
        '<input id="fe-color-ref" value="' + (f.color_ref||'').replace(/"/g,'&quot;') + '" placeholder="ex: Blanc, Rouge, Noir...">' +
      '</div>' +
      '<div class="form-group full"><label class="form-label">Tags</label>' +
        '<input id="fe-tags" value="' + safeTags.replace(/"/g,'&quot;') + '"></div>' +
      '<div class="form-group full"><label class="form-label">Description</label>' +
        '<textarea id="fe-desc">' + safeDesc + '</textarea></div>' +
      '<div class="form-group full">' +
        '<label class="form-label">Matières recommandées</label>' +
        '<div id="fe-materials-picker" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">' + matHtml + '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-top:4px">Cliquer pour sélectionner les matières compatibles</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-bottom:12px;font-size:12px;color:var(--text3)">' + safeOrig + ' · ' + formatFileSize(f.file_size) + '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveFileEdit(' + id + ')">Enregistrer</button>' +
    '</div>',
    'Modifier · ' + safeName
  );
}

async function saveFileEdit(id) {
  const matSpans = document.querySelectorAll('#fe-materials-picker [data-mat]');
  const selMats  = Array.from(matSpans).filter(function(s){ return s.dataset.selected==='1'; }).map(function(s){ return s.dataset.mat; });
  const body = {
    name:                   document.getElementById('fe-name').value,
    theme_id:               document.getElementById('fe-theme').value || null,
    source_url:             document.getElementById('fe-url').value || null,
    tags:                   document.getElementById('fe-tags').value || null,
    description:            document.getElementById('fe-desc').value || null,
    recommended_materials:  selMats.length ? selMats.join(',') : null,
    quantity:               parseInt(document.getElementById('fe-quantity')?.value) || 1,
    color_ref:              document.getElementById('fe-color-ref')?.value || null,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    const updatedFile = await API.put('/library/files/'+id, body);
    closeModal(); toast('Fichier mis à jour', 'success');
    await loadLibraryContent();
    if (updatedFile && updatedFile.object_id) openObjectDetail(updatedFile.object_id);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Associer à une impression ─────────────────────────────
async function openLinkToPrint(fileId) {
  const prints = await API.get('/prints?limit=200');
  openModal(`
    <div class="form-group"><label class="form-label">Impression *</label>
      <select id="ltp-print">
        <option value="">— Sélectionner —</option>
        ${prints.map(p=>`<option value="${p.id}">${p.name}${p.printer_name?' · '+p.printer_name:''} · ${p.status}</option>`).join('')}
      </select></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="linkFileToPrint(${fileId})">Associer</button>
    </div>
  `, 'Associer à une impression');
}

async function linkFileToPrint(fileId) {
  const printId = document.getElementById('ltp-print').value;
  if (!printId) return toast('Sélectionnez une impression', 'error');
  try {
    await API.post('/library/files/'+fileId+'/link', { print_id: printId });
    closeModal(); toast('Fichier associé', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

// ── Thèmes ────────────────────────────────────────────────
function openThemeForm(id=null, currentName='', currentParent=null) {
  const roots = libraryThemes.map(t=>`<option value="${t.id}" ${currentParent==t.id?'selected':''}>${t.name}</option>`).join('');
  openModal(`
    <div class="form-grid">
      <div class="form-group full"><label class="form-label">Nom *</label>
        <input id="tf-name" value="${currentName}" placeholder="ex: Mécanique, Robotique…"></div>
      <div class="form-group full"><label class="form-label">Thème parent (optionnel)</label>
        <select id="tf-parent">
          <option value="">— Thème racine —</option>
          ${roots}
        </select></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveTheme(${id||'null'})">${id?'Enregistrer':'Créer'}</button>
    </div>
  `, id ? 'Modifier le thème' : 'Nouveau thème');
}

async function saveTheme(id) {
  const body = { name:document.getElementById('tf-name').value, parent_id:document.getElementById('tf-parent').value||null };
  if (!body.name) return toast('Le nom est requis','error');
  try {
    if (id) await API.put('/library/themes/'+id, body);
    else    await API.post('/library/themes', body);
    closeModal(); toast(id?'Thème mis à jour':'Thème créé','success'); renderLibrary();
  } catch (e) { toast(e.message,'error'); }
}

async function deleteTheme(id) {
  confirmDelete('Supprimer ce thème ? Les fichiers et objets seront conservés sans thème.', async () => {
    try {
      await API.del('/library/themes/'+id);
      if (activeThemeId==id) activeThemeId=null;
      renderLibrary();
    } catch (e) { toast(e.message,'error'); }
  });
}

async function deleteFile(id) {
  confirmDelete('Supprimer ce fichier du disque ?', async () => {
    try { await API.del('/library/files/'+id); toast('Fichier supprimé'); loadLibraryContent(); }
    catch (e) { toast(e.message,'error'); }
  });
}

function setActiveTheme(id) { activeThemeId=id; loadLibraryContent(); }

function formatFileSize(bytes) {
  if (!bytes) return '0 o';
  if (bytes < 1024) return bytes+' o';
  if (bytes < 1048576) return (bytes/1024).toFixed(0)+' Ko';
  return (bytes/1048576).toFixed(1)+' Mo';
}

// ── Prévisualisation STL 3D ───────────────────────────────
function openSTLPreview(fileId, fileName, objectId) {
  openModal(
    '<div id="stl-viewer-wrap" style="position:relative;width:100%;height:420px;background:var(--bg3);border-radius:var(--radius)">' +
      '<div id="stl-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:13px">Chargement du modèle…</div>' +
      '<canvas id="stl-canvas" style="width:100%;height:100%;display:none;border-radius:var(--radius)"></canvas>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">Clic + glisser pour tourner · Molette pour zoomer</div>' +
    '<div class="modal-footer"><button class="btn" onclick="closeModal();' + (objectId ? 'openObjectDetail(' + objectId + ')' : '') + '">Fermer</button></div>',
    '3D — ' + fileName
  );

  // Charger le STL via fetch et le rendre avec Three.js
  setTimeout(async function() {
    if (typeof THREE === 'undefined') {
      document.getElementById('stl-loading').textContent = 'Three.js non chargé — rechargez la page';
      return;
    }
    try {
      const resp = await fetch('/api/library/files/' + fileId + '/download');
      const buf  = await resp.arrayBuffer();

      const canvas = document.getElementById('stl-canvas');
      if (!canvas) return;
      const wrap = document.getElementById('stl-viewer-wrap');
      const w = wrap.clientWidth, h = wrap.clientHeight;

      // Scene
      const scene    = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1917);
      const camera   = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Lumières
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(1, 2, 3);
      scene.add(dirLight);
      const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.3);
      dirLight2.position.set(-2, -1, -1);
      scene.add(dirLight2);

      // Parser le STL (binaire)
      const geo = parseBinarySTL(buf);
      geo.computeBoundingBox();
      const box    = geo.boundingBox;
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size   = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      geo.translate(-center.x, -center.y, -center.z);

      const mat  = new THREE.MeshPhongMaterial({ color: 0x3b82f6, specular: 0x222222, shininess: 40 });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      camera.position.set(0, maxDim * 0.5, maxDim * 2);
      camera.lookAt(0, 0, 0);

      // Contrôles orbite simples
      let isDragging = false, lastX = 0, lastY = 0, rotX = 0, rotY = 0;
      canvas.addEventListener('mousedown', function(e){ isDragging=true; lastX=e.clientX; lastY=e.clientY; });
      canvas.addEventListener('mouseup',   function(){ isDragging=false; });
      canvas.addEventListener('mousemove', function(e){
        if (!isDragging) return;
        rotY += (e.clientX - lastX) * 0.01;
        rotX += (e.clientY - lastY) * 0.01;
        lastX=e.clientX; lastY=e.clientY;
        mesh.rotation.set(rotX, rotY, 0);
      });
      canvas.addEventListener('wheel', function(e){
        camera.position.z += e.deltaY * maxDim * 0.002;
        camera.position.z = Math.max(maxDim * 0.5, Math.min(maxDim * 5, camera.position.z));
      });

      // Afficher
      document.getElementById('stl-loading').style.display = 'none';
      canvas.style.display = 'block';

      // Boucle de rendu
      let animId;
      function animate() {
        if (!document.getElementById('stl-canvas')) { cancelAnimationFrame(animId); renderer.dispose(); return; }
        animId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      animate();

    } catch(e) {
      const el = document.getElementById('stl-loading');
      if (el) el.textContent = 'Erreur chargement : ' + e.message;
    }
  }, 100);
}

function parseBinarySTL(buffer) {
  const data  = new DataView(buffer);
  const faces = data.getUint32(80, true);
  const geo   = new THREE.BufferGeometry();
  const verts = new Float32Array(faces * 9);
  const norms = new Float32Array(faces * 9);
  let offset  = 84;
  for (let i = 0; i < faces; i++) {
    const nx = data.getFloat32(offset, true), ny = data.getFloat32(offset+4, true), nz = data.getFloat32(offset+8, true);
    offset += 12;
    for (let v = 0; v < 3; v++) {
      verts[i*9+v*3]   = data.getFloat32(offset, true);
      verts[i*9+v*3+1] = data.getFloat32(offset+4, true);
      verts[i*9+v*3+2] = data.getFloat32(offset+8, true);
      norms[i*9+v*3]   = nx; norms[i*9+v*3+1] = ny; norms[i*9+v*3+2] = nz;
      offset += 12;
    }
    offset += 2; // attribute byte count
  }
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.setAttribute('normal',   new THREE.BufferAttribute(norms, 3));
  return geo;
}

// ── Stats utilisation d'un objet ─────────────────────────
async function openObjectStats(id, name) {
  let stats;
  try {
    stats = await API.get('/library/objects/' + id + '/stats');
  } catch(_) {
    stats = { print_count: 0, success_count: 0, fail_count: 0, total_filament_g: 0, last_print: null };
  }
  const successRate = stats.print_count > 0 ? Math.round((stats.success_count / stats.print_count) * 100) : 0;
  openModal(
    '<div class="grid-2" style="margin-bottom:16px">' +
      '<div class="metric-card"><div class="metric-label">Impressions</div><div class="metric-value">' + (stats.print_count||0) + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">Taux de réussite</div><div class="metric-value" style="color:' + (successRate>=80?'var(--success)':successRate>=50?'var(--warning)':'var(--danger)') + '">' + successRate + '<span style="font-size:14px">%</span></div></div>' +
      '<div class="metric-card"><div class="metric-label">Filament consommé</div><div class="metric-value">' + Math.round(stats.total_filament_g||0) + '<span style="font-size:14px;color:var(--text2)">g</span></div></div>' +
      '<div class="metric-card"><div class="metric-label">Dernière impression</div><div class="metric-value" style="font-size:14px">' + (stats.last_print ? fmtDate(stats.last_print) : '—') + '</div></div>' +
    '</div>' +
    '<div class="modal-footer"><button class="btn" onclick="closeModal()">Fermer</button></div>',
    'Statistiques — ' + name
  );
}

// ── Export PDF fiche objet ────────────────────────────────
async function exportObjectPDF(id) {
  if (typeof window.jspdf === "undefined") return toast("jsPDF non chargé", "error");
  const { jsPDF } = window.jspdf;

  let obj;
  try { obj = await API.get("/library/objects/" + id); }
  catch(e) { toast("Erreur : " + e.message, "error"); return; }

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleDateString("fr-FR");
  let y = 15;

  // En-tête
  doc.setFillColor(30, 30, 28);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("PrintFlow 3D — Fiche objet", 14, 14);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(date, 196, 14, { align: "right" });
  y = 32;

  // Titre objet
  doc.setTextColor(30, 30, 28);
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(obj.name || "Sans nom", 14, y); y += 8;

  if (obj.theme_name) {
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 115);
    doc.text("Thème : " + obj.theme_name, 14, y); y += 6;
  }
  if (obj.description) {
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 55);
    const lines = doc.splitTextToSize(obj.description, 180);
    doc.text(lines, 14, y); y += lines.length * 5 + 4;
  }

  // Photo si disponible
  if (obj.photo_path) {
    try {
      const resp = await fetch("/api/library/objects/" + id + "/photo");
      const blob = await resp.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise(function(res) { reader.onload = function(e){ res(e.target.result); }; reader.readAsDataURL(blob); });
      const imgH = 60, imgW = 80;
      doc.addImage(dataUrl, "JPEG", 14, y, imgW, imgH, "", "FAST");
      y += imgH + 6;
    } catch(_) {}
  }

  // Fichiers
  if (obj.files && obj.files.length) {
    y += 2;
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 28);
    doc.text("Fichiers (" + obj.files.length + ")", 14, y); y += 6;
    obj.files.forEach(function(f) {
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 55);
      const label = (f.part_name || f.name) + "   " + (f.original_name || "") + "   " + formatFileSize(f.file_size);
      doc.text(label, 18, y);
      if (f.recommended_materials) {
        doc.setTextColor(59, 130, 246);
        doc.text("Matières : " + f.recommended_materials, 18, y + 4);
        y += 4;
      }
      y += 6;
    });
  }

  // Tags
  if (obj.tags) {
    y += 2;
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 115);
    doc.text("Tags : " + obj.tags, 14, y); y += 6;
  }

  // Source
  if (obj.source_url) {
    doc.setFontSize(9); doc.setTextColor(59, 130, 246);
    doc.text("Source : " + obj.source_url, 14, y); y += 6;
  }

  // Pied de page
  doc.setFontSize(7); doc.setTextColor(160, 160, 155);
  doc.text("PrintFlow v1.7.0 — Exporté le " + date, 14, 290);

  doc.save("printflow_objet_" + (obj.name||id).replace(/[^a-z0-9]/gi,"_") + ".pdf");
  toast("PDF exporté", "success");
}

// ── Source URL — détection de plateforme ────────────────────────────────────
function detectPlatform(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('thingiverse.com'))  return { name: 'Thingiverse',  color: '#248BFB', icon: '🔵' };
  if (u.includes('printables.com'))   return { name: 'Printables',   color: '#FA6831', icon: '🟠' };
  if (u.includes('makerworld.com'))   return { name: 'MakerWorld',   color: '#1DB954', icon: '🟢' };
  if (u.includes('cults3d.com'))      return { name: 'Cults3D',      color: '#A855F7', icon: '🟣' };
  if (u.includes('myminifactory.com'))return { name: 'MyMiniFactory', color: '#E91E63', icon: '🩷' };
  if (u.includes('thangs.com'))       return { name: 'Thangs',       color: '#FF6B35', icon: '🟠' };
  if (u.includes('youmagine.com'))    return { name: 'YouMagine',    color: '#00BCD4', icon: '🔵' };
  if (u.includes('nexprint.com') || u.includes('nexprint.elegoo.com')) return { name: 'Nexprint', color: '#FF4D00', icon: '🔶' };
  return { name: 'Source', color: 'var(--accent)', icon: '🔗' };
}

function renderSourceBadge(url) {
  if (!url) return '';
  const p = detectPlatform(url);
  return '<a href="' + url + '" target="_blank" rel="noopener" ' +
    'style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;' +
    'font-size:12px;font-weight:500;text-decoration:none;color:#fff;background:' + p.color + ';' +
    'transition:opacity 0.15s" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">' +
    p.icon + ' ' + p.name +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7"/></svg>' +
  '</a>';
}

// ── QR Code ──────────────────────────────────────────────────────────────────
function openQRCode(objectId, objectName) {
  const url = window.location.origin + '/#library/' + objectId;

  openModal(
    '<div style="text-align:center;padding:8px 0">' +
      '<div id="qr-container" style="display:inline-block;padding:16px;background:#fff;' +
        'border-radius:var(--radius);box-shadow:0 2px 8px rgba(0,0,0,0.12);margin-bottom:16px"></div>' +
      '<div style="font-size:12px;color:var(--text3);margin-bottom:16px;word-break:break-all">' + url + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn" onclick="downloadQRCode(\'' + objectName.replace(/'/g,"\\'") + '\')" >↓ PNG</button>' +
        '<button class="btn" onclick="printQRCode()">🖨 Imprimer</button>' +
        '<button class="btn btn-sm" onclick="copyToClipboard(\'' + url + '\')" style="font-size:11px">📋 Copier l\'URL</button>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer"><button class="btn" onclick="closeModal()">Fermer</button></div>',
    'QR Code — ' + objectName
  );

  // Générer le QR code après ouverture du modal
  setTimeout(function() {
    const container = document.getElementById('qr-container');
    if (!container) return;
    if (typeof QRCode === 'undefined') {
      container.innerHTML = '<div style="color:var(--danger);font-size:13px;padding:20px">Librairie QRCode non chargée.<br>Vérifiez la connexion.</div>';
      return;
    }
    new QRCode(container, {
      text:           url,
      width:          200,
      height:         200,
      colorDark:      '#000000',
      colorLight:     '#ffffff',
      correctLevel:   QRCode.CorrectLevel.M,
    });
  }, 100);
}

function downloadQRCode(objectName) {
  const container = document.getElementById('qr-container');
  if (!container) return;
  const canvas = container.querySelector('canvas');
  const img    = container.querySelector('img');

  if (canvas) {
    const a = document.createElement('a');
    a.download = 'qrcode_' + objectName.replace(/[^a-z0-9]/gi, '_') + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  } else if (img) {
    const a = document.createElement('a');
    a.download = 'qrcode_' + objectName.replace(/[^a-z0-9]/gi, '_') + '.png';
    a.href = img.src;
    a.click();
  }
}

function printQRCode() {
  const container = document.getElementById('qr-container');
  if (!container) return;
  const canvas = container.querySelector('canvas');
  const src    = canvas ? canvas.toDataURL('image/png') : (container.querySelector('img')?.src || '');
  if (!src) return;
  const win = window.open('', '_blank');
  win.document.write(
    '<html><body style="text-align:center;font-family:sans-serif;padding:20px">' +
    '<img src="' + src + '" style="width:200px;height:200px"><br>' +
    '<div style="margin-top:12px;font-size:14px">' + document.title + '</div>' +
    '<script>window.onload=function(){window.print();window.close()}<\/script>' +
    '</body></html>'
  );
  win.document.close();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(function() {
    toast('URL copiée ✓', 'success');
  }).catch(function() {
    toast('Impossible de copier', 'error');
  });
}

// ── Gestion des versions ─────────────────────────────────────────────────────
function toggleVersionHistory(fileId) {
  const el = document.getElementById('vh-' + fileId);
  if (!el) return;
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  // Charger l'historique
  API.get('/library/files/' + fileId + '/versions').then(function(versions) {
    const older = versions.filter(function(v) { return !v.is_latest; });
    if (!older.length) { el.innerHTML = '<span style="font-size:11px;color:var(--text3)">Aucune version précédente</span>'; }
    else {
      el.innerHTML = older.map(function(v) {
        return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text3);' +
          'padding:3px 0;border-bottom:0.5px solid var(--border)">' +
          (v.version ? '<span style="font-size:10px;padding:1px 5px;border-radius:10px;background:var(--bg3);color:var(--text2)">' + v.version + '</span>' : '') +
          '<span>' + fmtDate(v.created_at) + '</span>' +
          '<span style="flex:1;font-style:italic">' + (v.changelog || '—') + '</span>' +
          '<span>' + formatFileSize(v.file_size) + '</span>' +
          '<a href="/api/library/files/' + v.id + '/download" class="btn btn-sm" style="font-size:10px;text-decoration:none;padding:2px 6px">↓</a>' +
        '</div>';
      }).join('');
    }
    el.style.display = 'block';
  }).catch(function() {
    el.innerHTML = '<span style="font-size:11px;color:var(--danger)">Erreur de chargement</span>';
    el.style.display = 'block';
  });
}

function openNewVersionForm(fileId, fileName, objectId) {
  openModal(
    '<div style="background:var(--bg3);border-radius:var(--radius);padding:10px 12px;margin-bottom:14px;font-size:13px">' +
      '<div style="font-weight:500;margin-bottom:2px">' + fileName + '</div>' +
      '<div style="font-size:11px;color:var(--text3)">Le fichier actuel sera conservé comme version précédente</div>' +
    '</div>' +
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label class="form-label">Numéro de version *</label>' +
        '<input id="nv-version" placeholder="ex: v2.0, v1.1, rev4">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Fichier *</label>' +
        '<input id="nv-file" type="file" accept=".stl,.3mf,.obj,.gcode,.step,.stp,.other">' +
      '</div>' +
      '<div class="form-group full">' +
        '<label class="form-label">Changelog — qu\'est-ce qui a changé ?</label>' +
        '<textarea id="nv-changelog" style="min-height:70px" placeholder="ex: Renfort des attaches, tolérances +0.2mm, correction warping…"></textarea>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="uploadNewVersion(' + fileId + ',' + objectId + ')">Publier la nouvelle version</button>' +
    '</div>',
    'Nouvelle version — ' + fileName
  );
}

async function uploadNewVersion(parentFileId, objectId) {
  const version   = document.getElementById('nv-version')?.value?.trim();
  const changelog = document.getElementById('nv-changelog')?.value?.trim();
  const fileInput = document.getElementById('nv-file');

  if (!version)              return toast('Le numéro de version est requis', 'error');
  if (!fileInput?.files?.length) return toast('Sélectionnez un fichier', 'error');

  const file = fileInput.files[0];
  if (file.size > 300 * 1024 * 1024) return toast('Fichier trop volumineux (max 300 Mo)', 'error');

  // Récupérer les infos de l'ancien fichier pour les hériter
  let parentInfo = {};
  try { parentInfo = await API.get('/library/files/' + parentFileId); } catch(_) {}

  const fd = new FormData();
  fd.append('file',           file);
  fd.append('name',           parentInfo.name || file.name.replace(/\.[^.]+$/, ''));
  fd.append('object_id',      String(objectId));
  fd.append('part_name',      parentInfo.part_name || '');
  fd.append('description',    parentInfo.description || '');
  fd.append('tags',           parentInfo.tags || '');
  fd.append('recommended_materials', parentInfo.recommended_materials || '');
  fd.append('version',        version);
  fd.append('changelog',      changelog || '');
  fd.append('parent_file_id', String(parentFileId));

  try {
    toast('Upload en cours…');
    const resp = await fetch('/api/library/files', { method: 'POST', body: fd });
    const result = await resp.json();
    if (!resp.ok) throw new Error(result.error || 'Erreur upload');
    toast('Version ' + version + ' publiée ✓', 'success');
    closeModal();
    // Rouvrir la fiche objet
    if (objectId) openObjectDetail(objectId);
  } catch(e) { toast(e.message, 'error'); }
}
