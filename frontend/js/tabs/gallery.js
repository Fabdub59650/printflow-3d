// gallery.js — Galerie photos des impressions v2.6.0

let _galleryPrints   = [];
let _galleryFiltered = [];
let _galleryIndex    = 0;
let _gFilters = { rating: '', material: '', printer_id: '', period: '', status: '', sort: 'date_desc' };

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

  // Construire les listes uniques pour les filtres
  const materials = [...new Set(_galleryPrints.map(function(p) { return p.material; }).filter(Boolean))].sort();
  const printers  = [];
  const seenPr    = new Set();
  _galleryPrints.forEach(function(p) {
    if (p.printer_id && p.printer_name && !seenPr.has(p.printer_id)) {
      printers.push({ id: p.printer_id, name: p.printer_name });
      seenPr.add(p.printer_id);
    }
  });

  const filtersHtml =
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">' +

      // Filtre note
      '<select id="gf-rating" onchange="_gFilters.rating=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">Toutes les notes</option>' +
        [5,4,3,2,1].map(function(r) {
          return '<option value="' + r + '">' + '★'.repeat(r) + ' et +</option>';
        }).join('') +
      '</select>' +

      // Filtre matière
      '<select id="gf-material" onchange="_gFilters.material=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">Toutes les matières</option>' +
        materials.map(function(m) { return '<option value="' + m + '">' + m + '</option>'; }).join('') +
      '</select>' +

      // Filtre imprimante
      '<select id="gf-printer" onchange="_gFilters.printer_id=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">Toutes les imprimantes</option>' +
        printers.map(function(p) { return '<option value="' + p.id + '">' + p.name + '</option>'; }).join('') +
      '</select>' +

      // Filtre période
      '<select id="gf-period" onchange="_gFilters.period=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">Toutes les périodes</option>' +
        '<option value="7">7 derniers jours</option>' +
        '<option value="30">30 derniers jours</option>' +
        '<option value="90">3 derniers mois</option>' +
        '<option value="365">Cette année</option>' +
      '</select>' +

      // Tri
      '<select id="gf-sort" onchange="_gFilters.sort=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="date_desc">Date ↓</option>' +
        '<option value="date_asc">Date ↑</option>' +
        '<option value="rating_desc">Meilleure note</option>' +
        '<option value="cost_desc">Coût réel ↓</option>' +
        '<option value="cost_asc">Coût réel ↑</option>' +
        '<option value="duration_desc">Durée ↓</option>' +
        '<option value="duration_asc">Durée ↑</option>' +
      '</select>' +

      // Filtre statut
      '<select id="gf-status" onchange="_gFilters.status=this.value;applyGalleryFilters()" style="font-size:12px">' +
        '<option value="">Tous les statuts</option>' +
        '<option value="done">✅ Réussies</option>' +
        '<option value="failed">❌ Échouées</option>' +
        '<option value="cancelled">⚪ Annulées</option>' +
      '</select>' +

      '<button class="btn btn-sm" onclick="resetGalleryFilters()" style="flex-shrink:0">Réinitialiser</button>' +
      '<span id="gallery-count" style="font-size:12px;color:var(--text3);margin-left:4px"></span>' +
    '</div>' +
    '<div id="gallery-grid"></div>';

  document.getElementById('content').innerHTML = filtersHtml;
  applyGalleryFilters();
}

function resetGalleryFilters() {
  _gFilters = { rating: '', material: '', printer_id: '', period: '', status: '', sort: 'date_desc' };
  ['gf-rating','gf-material','gf-printer','gf-period','gf-status'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var s = document.getElementById('gf-sort'); if (s) s.value = 'date_desc';
  applyGalleryFilters();
}

function applyGalleryFilters() {
  let list = _galleryPrints.slice();

  if (_gFilters.rating)     list = list.filter(function(p) { return (p.rating||0) >= parseInt(_gFilters.rating); });
  if (_gFilters.material)   list = list.filter(function(p) { return p.material === _gFilters.material; });
  if (_gFilters.printer_id) list = list.filter(function(p) { return String(p.printer_id) === String(_gFilters.printer_id); });
  if (_gFilters.status)     list = list.filter(function(p) { return p.status === _gFilters.status; });
  if (_gFilters.period) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(_gFilters.period));
    list = list.filter(function(p) { return new Date(p.created_at) >= cutoff; });
  }

  list.sort(function(a, b) {
    if (_gFilters.sort === 'date_desc')     return new Date(b.created_at) - new Date(a.created_at);
    if (_gFilters.sort === 'date_asc')      return new Date(a.created_at) - new Date(b.created_at);
    if (_gFilters.sort === 'rating_desc')   return (b.rating||0) - (a.rating||0);
    if (_gFilters.sort === 'cost_desc')     return (parseFloat(b.real_cost)||0) - (parseFloat(a.real_cost)||0);
    if (_gFilters.sort === 'cost_asc')      return (parseFloat(a.real_cost)||0) - (parseFloat(b.real_cost)||0);
    if (_gFilters.sort === 'duration_desc') return (parseInt(b.actual_duration)||0) - (parseInt(a.actual_duration)||0);
    if (_gFilters.sort === 'duration_asc')  return (parseInt(a.actual_duration)||0) - (parseInt(b.actual_duration)||0);
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
      ? '<span style="width:7px;height:7px;border-radius:50%;background:' + p.color_hex + ';display:inline-block;margin-right:3px;flex-shrink:0"></span>'
      : '';

    html +=
      '<div onclick="openGalleryLightbox(' + i + ')" ' +
        'style="background:var(--bg2);border-radius:var(--radius);overflow:hidden;' +
        'border:0.5px solid var(--border2);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" ' +
        'onmouseenter="this.style.transform=\'scale(1.02)\';this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.15)\'" ' +
        'onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
        // Photo
        '<div style="aspect-ratio:1;overflow:hidden;background:var(--bg3);position:relative">' +
          '<img src="/api/prints/' + p.id + '/photo" alt="' + p.name + '" ' +
            'style="width:100%;height:100%;object-fit:cover;display:block" ' +
            'onerror="this.parentElement.innerHTML=\'<div style=&quot;display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:24px&quot;>photo</div>\'">' +
          // Badge note en overlay
          (p.rating ? '<div style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.6);' +
            'border-radius:10px;padding:2px 6px;font-size:11px;color:#f59e0b">' +
            '★ ' + p.rating + '</div>' : '') +
        '</div>' +
        // Infos
        '<div style="padding:10px">' +
          '<div style="font-size:13px;font-weight:500;margin-bottom:4px;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + p.name + '">' + p.name + '</div>' +
          '<div style="font-size:11px;color:var(--text3);display:flex;align-items:center;flex-wrap:wrap;gap:3px">' +
            colorDot +
            (p.material    ? '<span>' + p.material + '</span>' : '') +
            (p.printer_name ? '<span>· ' + p.printer_name + '</span>' : '') +
          '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:3px;display:flex;justify-content:space-between">' +
            '<span>' + fmtDate(p.created_at) + '</span>' +
            '<span style="display:flex;gap:6px">' +
              (p.actual_duration ? '<span>' + (Math.floor(p.actual_duration/60)>0?Math.floor(p.actual_duration/60)+'h':'') + (p.actual_duration%60>0?p.actual_duration%60+'min':'') + '</span>' : '') +
              (p.real_cost ? '<span style="color:#10b981;font-weight:500">' + parseFloat(p.real_cost).toFixed(2) + '€</span>' : '') +
            '</span>' +
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
  const hasNext = _galleryIndex < _galleryFiltered.length - 1;
  const hasPrev = _galleryIndex > 0;

  const lb = document.createElement('div');
  lb.id = 'gallery-lightbox';
  lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:400;' +
    'display:flex;align-items:stretch';

  lb.innerHTML =
    // Zone photo
    '<div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;min-width:0">' +

      // Bouton fermer
      '<button onclick="closeGalleryLightbox()" ' +
        'style="position:absolute;top:16px;right:16px;border:none;background:rgba(255,255,255,0.15);' +
        'color:#fff;font-size:18px;width:38px;height:38px;border-radius:50%;cursor:pointer;z-index:1">✕</button>' +

      // Compteur
      '<div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);' +
        'color:rgba(255,255,255,0.5);font-size:12px;z-index:1">' +
        (_galleryIndex+1) + ' / ' + _galleryFiltered.length +
      '</div>' +

      // Nav précédent
      (hasPrev ? '<button onclick="galleryNav(-1)" ' +
        'style="position:absolute;left:12px;top:50%;transform:translateY(-50%);' +
        'border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:28px;' +
        'width:48px;height:48px;border-radius:50%;cursor:pointer;z-index:1;' +
        'display:flex;align-items:center;justify-content:center">‹</button>' : '') +

      // Photo
      '<img src="/api/prints/' + p.id + '/photo" alt="' + p.name + '" ' +
        'style="max-width:100%;max-height:100vh;object-fit:contain;' +
        'padding:60px ' + (hasPrev ? '72px' : '24px') + ' 60px ' + (hasNext ? '72px' : '24px') + '">' +

      // Nav suivant
      (hasNext ? '<button onclick="galleryNav(1)" ' +
        'style="position:absolute;right:12px;top:50%;transform:translateY(-50%);' +
        'border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:28px;' +
        'width:48px;height:48px;border-radius:50%;cursor:pointer;z-index:1;' +
        'display:flex;align-items:center;justify-content:center">›</button>' : '') +

    '</div>' +

    // Panneau infos droite
    '<div style="width:280px;flex-shrink:0;background:rgba(255,255,255,0.05);' +
      'border-left:1px solid rgba(255,255,255,0.1);padding:24px;' +
      'display:flex;flex-direction:column;gap:16px;overflow-y:auto">' +

      // Titre
      '<div>' +
        '<div style="color:#fff;font-size:17px;font-weight:600;margin-bottom:6px;line-height:1.3">' + p.name + '</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:12px">' + fmtDate(p.created_at) + '</div>' +
      '</div>' +

      // Note
      '<div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;' +
          'letter-spacing:0.05em;margin-bottom:6px">Note</div>' +
        '<div style="color:#f59e0b;font-size:18px">' + stars + '</div>' +
      '</div>' +

      // Détails impression
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        infoRow('Matière',     (p.color_hex ? '<span style="width:10px;height:10px;border-radius:50%;background:' + p.color_hex + ';display:inline-block;margin-right:5px;vertical-align:middle"></span>' : '') + (p.material || '—')) +
        infoRow('Filament',    p.filament_name || '—') +
        infoRow('Imprimante',  p.printer_name  || '—') +
        infoRow('Durée réelle', p.actual_duration ? fmtDuration(p.actual_duration) : '—') +
        infoRow('Filament conso.', p.filament_used ? p.filament_used + ' g' : '—') +
        (p.notes ? infoRow('Notes', p.notes) : '') +
      '</div>' +

      // Bouton fiche
      '<div style="margin-top:auto">' +
        '<button onclick="closeGalleryLightbox();switchTab(\'prints\');" ' +
          'style="width:100%;border:0.5px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);' +
          'color:#fff;font-size:13px;padding:10px;border-radius:var(--radius);cursor:pointer">' +
          'Voir toutes les impressions' +
        '</button>' +
      '</div>' +

    '</div>';

  document.body.appendChild(lb);
  lb.addEventListener('click', function(e) {
    if (e.target === lb) closeGalleryLightbox();
  });
}

function infoRow(label, value) {
  return '<div>' +
    '<div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;' +
      'letter-spacing:0.05em;margin-bottom:2px">' + label + '</div>' +
    '<div style="font-size:13px;color:rgba(255,255,255,0.85)">' + value + '</div>' +
  '</div>';
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
