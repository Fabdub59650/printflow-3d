// search.js — Recherche globale PrintFlow

let _searchTimer    = null;
let _searchActive   = false;
let _searchSelected = -1;
let _searchResults  = [];

// ── Raccourci clavier Cmd/Ctrl+K ─────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.getElementById('global-search-input');
    if (input) { input.focus(); input.select(); }
  }
  // '/' — ouvrir la recherche (si pas dans un champ de saisie)
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    e.preventDefault();
    const input = document.getElementById('global-search-input');
    if (input) { input.focus(); input.select(); }
  }
  if (e.key === 'Escape') {
    closeSearchDropdown();
    document.getElementById('global-search-input')?.blur();
  }
});

// ── Debounce sur la saisie ────────────────────────────────────────────────
function onSearchInput(val) {
  const clearBtn = document.getElementById('search-clear-btn');
  const hint     = document.getElementById('search-shortcut-hint');
  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
  if (hint)     hint.style.display     = val ? 'none'  : '';
  _searchSelected = -1;

  if (_searchTimer) clearTimeout(_searchTimer);
  if (!val || val.trim().length < 2) {
    closeSearchDropdown();
    return;
  }
  _searchTimer = setTimeout(function() { runSearch(val.trim()); }, 220);
}

function onSearchFocus() {
  _searchActive = true;
  const val = document.getElementById('global-search-input')?.value || '';
  if (val.trim().length >= 2) runSearch(val.trim());
}

function onSearchBlur() {
  // Délai pour permettre le clic sur un résultat
  setTimeout(function() {
    _searchActive = false;
    closeSearchDropdown();
  }, 200);
}

function onSearchKeydown(e) {
  const items = document.querySelectorAll('.search-result-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _searchSelected = Math.min(_searchSelected + 1, items.length - 1);
    highlightSearchItem(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _searchSelected = Math.max(_searchSelected - 1, 0);
    highlightSearchItem(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (_searchSelected >= 0 && items[_searchSelected]) {
      items[_searchSelected].click();
    }
  }
}

function highlightSearchItem(items) {
  items.forEach(function(el, i) {
    el.style.background = i === _searchSelected ? 'var(--accent-bg)' : '';
  });
  if (items[_searchSelected]) {
    items[_searchSelected].scrollIntoView({ block: 'nearest' });
  }
}

function clearSearch() {
  const input = document.getElementById('global-search-input');
  if (input) { input.value = ''; input.focus(); }
  document.getElementById('search-clear-btn').style.display = 'none';
  document.getElementById('search-shortcut-hint').style.display = '';
  closeSearchDropdown();
}

function closeSearchDropdown() {
  const dd = document.getElementById('global-search-dropdown');
  if (dd) dd.style.display = 'none';
  _searchSelected = -1;
}

// ── Appel API ─────────────────────────────────────────────────────────────
async function runSearch(q) {
  try {
    const data = await API.get('/search?q=' + encodeURIComponent(q));
    renderSearchDropdown(data.results, q);
  } catch(_) { closeSearchDropdown(); }
}

// ── Rendu du dropdown ─────────────────────────────────────────────────────
const STATUS_LABELS_SEARCH = {
  done: 'Terminé', failed: 'Échec', printing: 'En cours',
  queued: 'En attente', planned: 'Planifié', cancelled: 'Annulé',
  active: 'Actif', completed: 'Terminé', paused: 'En pause',
  draft: 'Brouillon', sent: 'Envoyé', accepted: 'Accepté', refused: 'Refusé',
};

function highlight(text, q) {
  if (!text || !q) return text || '';
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
  return String(text).replace(re, '<mark style="background:var(--accent);color:#fff;border-radius:2px;padding:0 2px">$1</mark>');
}

function renderSearchDropdown(results, q) {
  const dd = document.getElementById('global-search-dropdown');
  if (!dd) return;

  if (!results.length) {
    dd.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">Aucun résultat pour « ' + q + ' »</div>';
    dd.style.display = 'block';
    return;
  }

  let html = '';
  results.forEach(function(group) {
    html += '<div style="padding:6px 12px 4px;font-size:10px;font-weight:600;' +
      'color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;' +
      'border-top:0.5px solid var(--border);margin-top:2px">' +
      group.icon + ' ' + group.label + '</div>';

    group.items.forEach(function(item) {
      const colorDot = item.color
        ? '<span style="width:8px;height:8px;border-radius:50%;background:' + item.color +
          ';display:inline-block;flex-shrink:0;margin-right:6px"></span>'
        : '';
      const statusLabel = item.status ? STATUS_LABELS_SEARCH[item.status] || item.status : '';
      const statusCol   = { done:'#10b981', failed:'#ef4444', printing:'#3b82f6',
        accepted:'#10b981', refused:'#ef4444', sent:'#3b82f6' }[item.status] || 'var(--text3)';

      html += '<div class="search-result-item" ' +
        'onclick="searchNavigate(\'' + group.category + '\',' + item.id + ')" ' +
        'style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;' +
        'transition:background 0.1s" ' +
        'onmouseenter="this.style.background=\'var(--bg3)\'" ' +
        'onmouseleave="this.style.background=\'\'">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;font-size:13px;font-weight:500;color:var(--text)">' +
            colorDot + highlight(item.title, q) +
          '</div>' +
          (item.sub ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            highlight(item.sub, q) + '</div>' : '') +
        '</div>' +
        (statusLabel ? '<span style="font-size:10px;color:' + statusCol + ';font-weight:500;' +
          'white-space:nowrap">' + statusLabel + '</span>' : '') +
      '</div>';
    });
  });

  dd.innerHTML = html;
  dd.style.display = 'block';
  _searchResults = results;
}

// ── Navigation vers le résultat ───────────────────────────────────────────
async function searchNavigate(category, id) {
  closeSearchDropdown();
  clearSearch();

  const tabMap = {
    prints:    'prints',
    filaments: 'filaments',
    projects:  'projects',
    library:   'library',
    quotes:    'quotes',
  };

  const tab = tabMap[category];
  if (tab) switchTab(tab);

  // Attendre que le rendu soit terminé et les données chargées
  // On poll jusqu'à ce que la fonction de détail soit disponible et les données chargées
  const maxWait = 3000;
  const start   = Date.now();

  async function tryOpen() {
    if (Date.now() - start > maxWait) return;
    try {
      let ready = false;
      if (category === 'prints'    && typeof allPrints    !== 'undefined' && allPrints.length)    ready = true;
      if (category === 'filaments' && typeof allFilaments !== 'undefined' && allFilaments.length) ready = true;
      if (category === 'projects'  && typeof allProjects  !== 'undefined' && allProjects.length)  ready = true;
      if (category === 'library'   && typeof libraryObjects !== 'undefined' && libraryObjects.length) ready = true;
      if (category === 'quotes'    && typeof allQuotes    !== 'undefined' && allQuotes.length)    ready = true;

      if (ready) {
        if (category === 'prints')    openPrintDetail(id);
        if (category === 'filaments') openFilamentForm(id);
        if (category === 'projects')  openProjectDetail(id);
        if (category === 'library')   openObjectDetail(id);
        if (category === 'quotes')    openQuoteDetail(id);
      } else {
        setTimeout(tryOpen, 100);
      }
    } catch(_) {
      setTimeout(tryOpen, 100);
    }
  }

  setTimeout(tryOpen, 150);
}
