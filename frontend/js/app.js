const TAB_RENDERERS = {
  dashboard:   renderDashboard,
  printers:    renderPrinters,
  prints:      renderPrints,
  projects:    renderProjects,
  filaments:   renderFilaments,
  library:     renderLibrary,
  maintenance: renderMaintenance,
  stats:       renderStats,
  settings:    renderSettings,
  history:     renderHistory,
  quotes:      renderQuotes,
  schedule:    renderSchedule,
  gallery:     renderGallery,
};

let currentTab = 'dashboard';

function switchTab(tab) {
  // Stopper le polling Moonraker si on quitte l'onglet Imprimantes
  if (currentTab === 'printers' && tab !== 'printers') {
    if (typeof mrStopAll === 'function') mrStopAll();
  }
  currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  const renderer = TAB_RENDERERS[tab];
  if (renderer) renderer();
}

document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchTab(el.dataset.tab);
  });
});

async function checkSpoolmanStatus() {
  const badge = document.getElementById('spoolman-badge');
  if (!badge) return;
  // Masquer entièrement si Spoolman est désactivé
  if (!window._spoolmanEnabled) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = '';
  try {
    const r = await fetch('/api/spoolman/status');
    const data = await r.json();
    const label = badge.querySelector('.status-label');
    badge.className = 'spoolman-status ' + (data.connected ? 'online' : 'offline');
    label.textContent = data.connected ? 'Spoolman ✓' : 'Spoolman';
  } catch (_) {}
}

// Init
// ── Thèmes de couleur ────────────────────────────────────
const THEMES = {
  blue:   { accent:'#185FA5', accentBg:'#E6F1FB', accentDark:'#0C447C', accentDarkBg:'#042C53' },
  green:  { accent:'#1D7A47', accentBg:'#E3F5EC', accentDark:'#0E4F2D', accentDarkBg:'#0A2E1A' },
  purple: { accent:'#6B3FAC', accentBg:'#F0E9FB', accentDark:'#4A2880', accentDarkBg:'#2A1550' },
  red:    { accent:'#B03030', accentBg:'#FBECEC', accentDark:'#7A1E1E', accentDarkBg:'#4A1010' },
  orange: { accent:'#C05C10', accentBg:'#FAEEE4', accentDark:'#7A3A08', accentDarkBg:'#4A2004' },
  teal:   { accent:'#0D7D7D', accentBg:'#E2F5F5', accentDark:'#085555', accentDarkBg:'#042F2F' },
  slate:  { accent:'#4A5568', accentBg:'#EDF2F7', accentDark:'#2D3748', accentDarkBg:'#1A202C' },
  pink:   { accent:'#B03070', accentBg:'#FBECF4', accentDark:'#7A1E4E', accentDarkBg:'#4A0E2E' },
};

function applyTheme(name) {
  const t = THEMES[name] || THEMES.blue;
  let el = document.getElementById('theme-vars');
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
  el.textContent =
    ':root { --accent:' + t.accent + '; --accent-bg:' + t.accentBg + '; --info:' + t.accent + '; --info-bg:' + t.accentBg + ' }' +
    ':root[data-color-scheme="dark"] { --accent:' + t.accent + '; --accent-bg:' + t.accentDark + '; --info:' + t.accent + '; --info-bg:' + t.accentDarkBg + ' }' +
    '@media (prefers-color-scheme:dark) { :root:not([data-color-scheme="light"]) { --accent:' + t.accent + '; --accent-bg:' + t.accentDark + '; --info:' + t.accent + '; --info-bg:' + t.accentDarkBg + ' } }';
}

// ── Gestion du mode sombre automatique ────────────────────────────────────
var _colorModeInterval = null;

function applyColorMode(mode, darkFrom, darkTo) {
  // mode: 'auto-system' | 'auto-time' | 'dark' | 'light' | null (manuel)
  if (_colorModeInterval) { clearInterval(_colorModeInterval); _colorModeInterval = null; }
  if (window._colorModeQuery) {
    try { window._colorModeQuery.removeEventListener('change', window._colorModeHandler); } catch(_) {}
  }

  if (mode === 'auto-system') {
    // Suivre le thème système
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = function(e) {
      document.documentElement.setAttribute('data-color-scheme', e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    window._colorModeQuery   = mq;
    window._colorModeHandler = handler;
    document.documentElement.setAttribute('data-color-scheme', mq.matches ? 'dark' : 'light');

  } else if (mode === 'auto-time') {
    // Sombre entre darkFrom et darkTo (heures entières)
    const checkTime = function() {
      const h = new Date().getHours();
      const from = parseInt(darkFrom) || 20;
      const to   = parseInt(darkTo)   || 7;
      let isDark;
      if (from > to) {
        isDark = h >= from || h < to;   // ex: 20h-7h (passe minuit)
      } else {
        isDark = h >= from && h < to;   // ex: 1h-6h
      }
      document.documentElement.setAttribute('data-color-scheme', isDark ? 'dark' : 'light');
    };
    checkTime();
    _colorModeInterval = setInterval(checkTime, 60000); // vérifier chaque minute

  } else if (mode === 'dark') {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
  } else if (mode === 'light') {
    document.documentElement.setAttribute('data-color-scheme', 'light');
  } else {
    // Manuel — laisser le CSS @media gérer
    document.documentElement.removeAttribute('data-color-scheme');
  }
}

// Valeurs par défaut — évite tout affichage parasite avant le chargement des settings
window._spoolmanEnabled        = false;
window._showPrices             = false;
window._showLocations          = false;
window._stockAlertEnabled      = false;
window._maintenanceAlertEnabled = false;
window._projectsEnabled        = true;  // activé par défaut

// Charger les settings puis démarrer l'interface
(async () => {
  try {
    const s = await fetch('/api/settings').then(r => r.json());
    if (s.theme) applyTheme(s.theme);
    // Appliquer le mode sombre
    applyColorMode(s.color_mode || null, s.dark_from || '20', s.dark_to || '7');
    // Appliquer le nom de l'application
    if (s.app_name) {
      const logoEl = document.querySelector('.logo-name');
      if (logoEl) logoEl.textContent = s.app_name;
      document.title = s.app_name;
    }
    window._spoolmanEnabled        = s.spoolman_enabled    === 'true';
    window._showPrices             = s.show_prices         !== 'false';
    window._showLocations          = s.show_locations      !== 'false';
    window._stockAlertEnabled      = s.stock_alert_enabled === 'true';
    window._maintenanceAlertEnabled = s.maintenance_alert_enabled === 'true';
    window._projectsEnabled        = s.projects_enabled    !== 'false';
    window._quotesEnabled          = s.quotes_enabled      !== 'false';
    window._galleryEnabled         = s.gallery_enabled     !== 'false';

    // Appliquer la visibilité de l'onglet Devis
    const navQuotes = document.getElementById('nav-quotes');
    if (navQuotes) navQuotes.style.display = window._quotesEnabled ? '' : 'none';

    // Appliquer la visibilité de l'onglet Projets
    const navProjects = document.getElementById('nav-projects');
    if (navProjects) navProjects.style.display = window._projectsEnabled ? '' : 'none';

    // Appliquer la visibilité de l'onglet Galerie
    const navGallery = document.getElementById('nav-gallery');
    if (navGallery) navGallery.style.display = window._galleryEnabled ? '' : 'none';
  } catch(_) {}

  // Auth optionnelle — ne bloque jamais le démarrage
  try { checkAuth(); } catch(_) {}

  // Démarrer sur le dashboard ou sur la cible du hash si présent
  const hash = window.location.hash; // ex: #library/42
  if (hash && hash.startsWith('#library/')) {
    const objectId = parseInt(hash.replace('#library/', ''));
    if (objectId) {
      switchTab('library');
      // Ouvrir la fiche objet après le rendu de l'onglet
      setTimeout(function() {
        if (typeof openObjectDetail === 'function') openObjectDetail(objectId);
      }, 600);
    } else {
      switchTab('dashboard');
    }
  } else {
    switchTab('dashboard');
  }

  checkSpoolmanStatus();
  setInterval(checkSpoolmanStatus, 30000);
})();

// ── Export CSV ────────────────────────────────────────────────────────────
function exportCSV(type) {
  const labels = { prints: 'impressions', filaments: 'filaments', stats: 'stats' };
  toast('Export ' + (labels[type]||type) + ' en cours…');
  const a = document.createElement('a');
  a.href = '/api/export/' + type;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Sidebar mobile/tablette ───────────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const isOpen   = sidebar.classList.contains('sidebar-open');
  if (isOpen) closeSidebar();
  else openSidebar();
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('sidebar-open');
  document.getElementById('sidebar-overlay').classList.add('visible');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('sidebar-open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

// Fermer la sidebar sur navigation (mobile)
const _origSwitchTab = switchTab;
window.switchTab = function(tab) {
  if (window.innerWidth <= 768) closeSidebar();
  _origSwitchTab(tab);
};

// Afficher/masquer le bouton hamburger selon la taille
function updateHamburger() {
  const btn = document.getElementById('hamburger-btn');
  if (btn) btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
}
window.addEventListener('resize', updateHamburger);
updateHamburger();
