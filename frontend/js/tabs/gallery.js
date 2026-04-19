// gallery.js — Galerie photos des impressions

let _galleryPrints   = [];
let _galleryFiltered = [];
let _galleryIndex    = 0;
let _gFilters = { rating: '', material: '', printer_id: '', sort: 'date_desc' };

async function renderGallery() {
  document.getElementById('page-title').textContent = 'Galerie';
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  const all = await API.get('/prints?limit=500');
  _galleryPrints = all.filter(function(p) { return p.photo_path; });

  if (!_galleryPrints.length) {
    document.getElementById('content').innerHTML =
      '<div class="empty-state">' +
        '<p>Aucune photo d\'impression enregistrée.</p>' +
        '<p style="font-size:12px;color:var(--text3);margin-top:8px">' +
          'Ajoutez des photos depuis la fiche détail d\'une impression.' +
        '</p>' +
      '</div>';
    return;
  }

  const materials = [...new Set(_galleryPrints.map(function(p) { return p.material; }).filter(Boolean))].sort();
  const printers  = [];
  const seenPr    = new Set();
  _galleryPrints.forEach(function(p) {
    if (p.printer_id && p.printer_name && !seenPr.has(p.printer_id)) {
      printers.push({ id: p.printer_id, name: p.printer_name });
      seenPr.add(p.printer_id);
    }
  });

  // Filtres dans le contenu (pas dans la topbar)
  const filtersHtml =
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">' +
      '<select id="gf-rating" onchange="_gFilters.rating=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">⭐ Toutes les notes</option>' +
        [5,4,3,2,1].map(function(r) {
          return '<option value="' + r + '">' + '★'.repeat(r) + ' et +</option>';
        }).join('') +
      '</select>' +
      '<select id="gf-material" onchange="_gFilters.material=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">🧵 Toutes les matières</option>' +
        materials.map(function(m) {
          return '<option value="' + m + '">' + m + '</option>';
        }).join('') +
      '</select>' +
      '<select id="gf-printer" onchange="_gFilters.printer_id=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">🖨 Toutes les imprimantes</option>' +
        printers.map(function(p) {
          return '<option value="' + p.id + '">' + p.name + '</option>';
        }).join('') +
      '</select>' +
      '<select id="gf-sort" onchange="_gFilters.sort=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="date_desc">Date ↓</option>' +
        '<option value="date_asc">Date ↑</option>' +
        '<option value="rating_desc">Note ↓</option>' +
        '<option value="name_asc">Nom A-Z</option>' +
      '</select>' +
      '<button class="btn btn-sm" onclick="resetGalleryFilters()" title="Réinitialiser les filtres" ' +
        'style="flex-shrink:0">↺ Réinitialiser</button>' +
      '<span id="gallery-count" style="font-size:12px;color:var(--text3)"></span>' +
    '</div>' +
    '<div id="gallery-grid"></div>';

  document.getElementById('content').innerHTML = filtersHtml;
  applyGalleryFilters();
}

function resetGalleryFilters() {
  _gFilters = { rating: '', material: '', printer_id: '', sort: 'date_desc' };
  var s = document.getElementById('gf-rating');   if (s) s.value = '';
  var s2 = document.getElementById('gf-material'); if (s2) s2.value = '';
  var s3 = document.getElementById('gf-printer');  if (s3) s3.value = '';
  var s4 = document.getElementById('gf-sort');     if (s4) s4.value = 'date_desc';
  applyGalleryFilters();
}

function applyGalleryFilters() {
  let list = _galleryPrints.slice();

  if (_gFilters.rating)     list = list.filter(function(p) { return (p.rating||0) >= parseInt(_gFilters.rating); });
  if (_gFilters.material)   list = list.filter(function(p) { return p.material === _gFilters.material; });
  if (_gFilters.printer_id) list = list.filter(function(p) { return String(p.printer_id) === String(_gFilters.printer_id); });

  list.sort(function(a, b) {
    if (_gFilters.sort === 'date_desc')   return new Date(b.created_at) - new Date(a.created_at);
    if (_gFilters.sort === 'date_asc')    return new Date(a.created_at) - new Date(b.created_at);
    if (_gFilters.sort === 'rating_desc') return (b.rating||0) - (a.rating||0);
    if (_gFilters.sort === 'name_asc')    return (a.name||'').localeCompare(b.name||'');
    return 0;
  });

  _galleryFiltered = list;
  renderGalleryGrid();
}

function renderGalleryGrid() {
  const count = document.getElementById('gallery-count');
  const grid  = document.getElementById('gallery-grid');
  if (!grid) return;

  const total = _galleryFiltered.length;
  if (count) count.textContent = total + ' photo' + (total > 1 ? 's' : '');

  if (!total) {
    grid.innerHTML = '<div class="empty-state"><p>Aucune photo ne correspond aux filtres.</p></div>';
    return;
  }

  let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">';

  _galleryFiltered.forEach(function(p, i) {
    const stars = p.rating
      ? '<span style="color:#f59e0b;font-size:12px">' + '★'.repeat(p.rating) + '☆'.repeat(5-p.rating) + '</span>'
      : '<span style="color:var(--text3);font-size:11px">Non noté</span>';
    const colorDot = p.color_hex
      ? '<span style="width:7px;height:7px;border-radius:50%;background:' + p.color_hex + ';display:inline-block;margin-right:4px"></span>'
      : '';

    html += '<div onclick="openGalleryLightbox(' + i + ')" ' +
      'style="background:var(--bg2);border-radius:var(--radius);overflow:hidden;' +
      'border:0.5px solid var(--border2);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" ' +
      'onmouseenter="this.style.transform=\'scale(1.02)\';this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.15)\'" ' +
      'onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
      '<div style="aspect-ratio:1;overflow:hidden;background:var(--bg3)">' +
        '<img src="/api/prints/' + p.id + '/photo" alt="' + p.name + '" ' +
          'style="width:100%;height:100%;object-fit:cover;display:block" ' +
          'onerror="this.parentElement.innerHTML=\'<div style=&quot;display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:24px&quot;>📷</div>\'">' +
      '</div>' +
      '<div style="padding:10px">' +
        '<div style="font-size:13px;font-weight:500;margin-bottom:4px;' +
          'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
        '<div style="margin-bottom:4px">' + stars + '</div>' +
        '<div style="font-size:11px;color:var(--text3);display:flex;align-items:center;flex-wrap:wrap;gap:4px">' +
          colorDot +
          (p.material ? '<span>' + p.material + '</span>' : '') +
          (p.printer_name ? '<span>· ' + p.printer_name + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  grid.innerHTML = html;
}

// ── Lightbox ──────────────────────────────────────────────────────────────

function openGalleryLightbox(index) {
  _galleryIndex = index;
  renderLightbox();
}

function renderLightbox() {
  const p = _galleryFiltered[_galleryIndex];
  if (!p) return;

  const existing = document.getElementById('gallery-lightbox');
  if (existing) existing.remove();

  const stars = p.rating ? '★'.repeat(p.rating) + '☆'.repeat(5-p.rating) : 'Non noté';

  const lb = document.createElement('div');
  lb.id = 'gallery-lightbox';
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:400;' +
    'display:flex;flex-direction:column;align-items:center;justify-content:center';

  lb.innerHTML =
    '<button onclick="closeGalleryLightbox()" ' +
      'style="position:absolute;top:16px;right:20px;border:none;background:rgba(255,255,255,0.15);' +
      'color:#fff;font-size:20px;width:40px;height:40px;border-radius:50%;cursor:pointer;' +
      'display:flex;align-items:center;justify-content:center">✕</button>' +
    '<div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);' +
      'color:rgba(255,255,255,0.5);font-size:12px">' +
      (_galleryIndex+1) + ' / ' + _galleryFiltered.length +
    '</div>' +
    (_galleryIndex > 0 ? '<button onclick="galleryNav(-1)" ' +
      'style="position:absolute;left:16px;top:50%;transform:translateY(-50%);' +
      'border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:24px;' +
      'width:48px;height:48px;border-radius:50%;cursor:pointer">‹</button>' : '') +
    '<img src="/api/prints/' + p.id + '/photo" alt="' + p.name + '" ' +
      'style="max-width:calc(100vw - 120px);max-height:calc(100vh - 180px);' +
      'object-fit:contain;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">' +
    (_galleryIndex < _galleryFiltered.length-1 ? '<button onclick="galleryNav(1)" ' +
      'style="position:absolute;right:16px;top:50%;transform:translateY(-50%);' +
      'border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:24px;' +
      'width:48px;height:48px;border-radius:50%;cursor:pointer">›</button>' : '') +
    '<div style="position:absolute;bottom:0;left:0;right:0;padding:16px 24px;' +
      'background:linear-gradient(transparent,rgba(0,0,0,0.8));' +
      'display:flex;align-items:flex-end;justify-content:space-between">' +
      '<div>' +
        '<div style="color:#fff;font-size:16px;font-weight:600;margin-bottom:4px">' + p.name + '</div>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
          '<span style="color:#f59e0b;font-size:14px">' + stars + '</span>' +
          (p.material ? '<span style="color:rgba(255,255,255,0.6);font-size:12px">' + p.material + '</span>' : '') +
          (p.printer_name ? '<span style="color:rgba(255,255,255,0.6);font-size:12px">🖨 ' + p.printer_name + '</span>' : '') +
          (p.actual_duration ? '<span style="color:rgba(255,255,255,0.6);font-size:12px">⏱ ' + fmtDuration(p.actual_duration) + '</span>' : '') +
          '<span style="color:rgba(255,255,255,0.5);font-size:12px">' + fmtDate(p.created_at) + '</span>' +
        '</div>' +
      '</div>' +
      '<button onclick="closeGalleryLightbox();openPrintDetail(' + p.id + ')" ' +
        'style="border:0.5px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);' +
        'color:#fff;font-size:12px;padding:8px 14px;border-radius:var(--radius);cursor:pointer;white-space:nowrap">' +
        'Voir la fiche →' +
      '</button>' +
    '</div>';

  document.body.appendChild(lb);
  lb.addEventListener('click', function(e) { if (e.target === lb) closeGalleryLightbox(); });
}

function galleryNav(dir) {
  const newIdx = _galleryIndex + dir;
  if (newIdx < 0 || newIdx >= _galleryFiltered.length) return;
  _galleryIndex = newIdx;
  renderLightbox();
}

function closeGalleryLightbox() {
  const lb = document.getElementById('gallery-lightbox');
  if (lb) lb.remove();
}

document.addEventListener('keydown', function(e) {
  const lb = document.getElementById('gallery-lightbox');
  if (!lb) return;
  if (e.key === 'ArrowLeft')  galleryNav(-1);
  if (e.key === 'ArrowRight') galleryNav(1);
  if (e.key === 'Escape')     closeGalleryLightbox();
});
