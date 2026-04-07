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
};

let currentTab = 'dashboard';

function switchTab(tab) {
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
    '@media (prefers-color-scheme:dark) { :root { --accent:' + t.accent + '; --accent-bg:' + t.accentDark + '; --info:' + t.accent + '; --info-bg:' + t.accentDarkBg + ' } }';
}

// Valeurs par défaut — évite tout affichage parasite avant le chargement des settings
window._spoolmanEnabled   = false;
window._showPrices        = false;
window._showLocations     = false;
window._stockAlertEnabled = false;

// Charger les settings puis démarrer l'interface
(async () => {
  try {
    const s = await fetch('/api/settings').then(r => r.json());
    if (s.theme) applyTheme(s.theme);
    // Appliquer le nom de l'application
    if (s.app_name) {
      const logoEl = document.querySelector('.logo-name');
      if (logoEl) logoEl.textContent = s.app_name;
      document.title = s.app_name;
    }
    window._spoolmanEnabled   = s.spoolman_enabled    === 'true';
    window._showPrices        = s.show_prices         !== 'false';
    window._showLocations     = s.show_locations      !== 'false';
    window._stockAlertEnabled = s.stock_alert_enabled === 'true';
  } catch(_) {}

  // Auth optionnelle — ne bloque jamais le démarrage
  try { checkAuth(); } catch(_) {}

  // Démarrer sur le dashboard APRÈS que les settings sont chargés
  switchTab('dashboard');
  checkSpoolmanStatus();
  setInterval(checkSpoolmanStatus, 30000);
})();
