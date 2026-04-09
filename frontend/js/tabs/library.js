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
     <button class="btn btn-primary" onclick="openUploadForm()">↑ Importer fichier</button>`;
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
        ${allThemes.map(t => themeItem(t.id, t.name, t.level, t.file_count+t.object_count)).join('')}
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
    <div style="width:100%;height:160px;overflow:hidden;position:relative;background:var(--bg3)">
      <img src="${photoUrl}" alt="${o.name}"
           style="width:100%;height:100%;object-fit:cover"
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
    '</div>' +
    '<div style="display:flex;gap:5px;flex-shrink:0">' +
      '<button class="btn btn-sm btn-primary" onclick="openObjectDetail(' + o.id + ')">Ouvrir</button>' +
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
  const obj = await API.get('/library/objects/'+id);
  const totalSize = obj.files.reduce((s,f)=>s+(f.file_size||0),0);

  const photoUrl = obj.photo_path ? '/api/library/objects/' + obj.id + '/photo' : null;
  openModal(`
    <div style="margin-bottom:16px">
      ${photoUrl ? `
      <div style="margin-bottom:12px;border-radius:var(--radius-lg);overflow:hidden;
                  max-height:220px;background:var(--bg3)">
        <img src="${photoUrl}" alt="${obj.name}"
             style="width:100%;max-height:220px;object-fit:cover;display:block"
             onerror="this.parentElement.style.display='none'">
      </div>` : ''}
      <div style="font-size:16px;font-weight:500;margin-bottom:4px">${obj.name}</div>
      ${obj.theme_name ? `<span style="font-size:12px;color:var(--text3)">${obj.theme_name}</span>` : ''}
      ${obj.description ? `<p style="font-size:13px;color:var(--text2);margin-top:8px">${obj.description}</p>` : ''}
      ${obj.tags ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
        ${obj.tags.split(',').map(t=>`<span style="font-size:10px;padding:2px 7px;background:var(--bg3);border-radius:20px;color:var(--text2)">#${t.trim()}</span>`).join('')}
      </div>` : ''}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span class="form-label">${obj.files.length} fichier${obj.files.length!=1?'s':''} · ${formatFileSize(totalSize)}</span>
      <button class="btn btn-sm btn-primary" onclick="openUploadForm(${id})">+ Ajouter un fichier</button>
    </div>

    ${obj.files.length === 0
      ? `<p style="color:var(--text3);font-size:13px;padding:12px 0">Aucun fichier. Cliquez "+ Ajouter un fichier".</p>`
      : `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          ${obj.files.map(f => {
            const ext = (f.file_type||'').toUpperCase();
            const extColor = {STL:'#185FA5','3MF':'#1D9E75',OBJ:'#BA7517',GCODE:'#888780',STEP:'#534AB7'}[ext]||'#888780';
            return `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                        background:var(--bg3);border-radius:var(--radius)">
              <span style="font-size:10px;font-weight:700;color:${extColor};
                           background:${extColor}18;padding:3px 6px;border-radius:4px;
                           white-space:nowrap">${ext}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500">${f.part_name||f.name}</div>
                ${f.recommended_materials ? '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">' +
                  f.recommended_materials.split(',').map(function(m){ return '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:var(--accent-bg);color:var(--accent)">' + m + '</span>'; }).join('') +
                  '</div>' : ''}
                <div style="font-size:11px;color:var(--text3)">${f.original_name} · ${formatFileSize(f.file_size)}</div>
              </div>
              <a href="/api/library/files/${f.id}/download"
                 class="btn btn-sm" style="text-decoration:none">↓</a>
              ${['stl','3mf','obj'].includes((f.file_type||'').toLowerCase()) ? '<button class="btn btn-sm" onclick="openSTLPreview(' + f.id + ',\'' + (f.part_name||f.name).replace(/'/g,"\\'") + '\')" title="Prévisualiser 3D">👁 3D</button>' : ''}
              <button class="btn btn-sm" onclick="openFileEditForm(${f.id})" title="Modifier matières et infos">⚙</button>
              <button class="btn btn-sm" onclick="openPartNameEdit(${id},${f.id},'${(f.part_name||f.name).replace(/'/g,"\\'")}')">✏</button>
              <button class="btn btn-sm btn-danger" onclick="removeFileFromObject(${id},${f.id})">✕</button>
            </div>`;
          }).join('')}
         </div>`}

    ${obj.source_url ? `<a href="${obj.source_url}" target="_blank" style="font-size:12px;color:var(--accent)">↗ Source</a>` : ''}

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Fermer</button>
      <button class="btn" onclick="closeModal();openObjectForm(${id})">Modifier</button>
      <button class="btn btn-danger btn-sm" onclick="confirmDeleteObjectFull(${id})">Supprimer tout</button>
    </div>
  `, `Objet : ${obj.name}`);
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
      loadLibraryContent();
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
      <div class="form-group full">
        <label class="form-label">Tags</label>
        <input id="lib-tags" placeholder="tag1, tag2…">
      </div>
      <div class="form-group full">
        <label class="form-label">Description</label>
        <textarea id="lib-desc" style="min-height:60px"></textarea>
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
    if (result.object_id) openObjectDetail(result.object_id);
    else loadLibraryContent();
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
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    await API.put('/library/files/'+id, body);
    closeModal(); toast('Fichier mis à jour', 'success'); loadLibraryContent();
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
function openSTLPreview(fileId, fileName) {
  openModal(
    '<div id="stl-viewer-wrap" style="position:relative;width:100%;height:420px;background:var(--bg3);border-radius:var(--radius)">' +
      '<div id="stl-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:13px">Chargement du modèle…</div>' +
      '<canvas id="stl-canvas" style="width:100%;height:100%;display:none;border-radius:var(--radius)"></canvas>' +
    '</div>' +
    '<div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:center">Clic + glisser pour tourner · Molette pour zoomer</div>' +
    '<div class="modal-footer"><button class="btn" onclick="closeModal()">Fermer</button></div>',
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
