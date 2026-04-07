async function renderSettings() {
  document.getElementById('page-title').textContent = 'Paramètres';
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  const [settings, spoolmanStatus] = await Promise.all([
    API.get('/settings'),
    API.get('/spoolman/status').catch(() => ({ connected: false }))
  ]);

  const spoolmanEnabled = settings.spoolman_enabled === 'true';
  const currentTheme    = settings.theme || 'blue';

  document.getElementById('content').innerHTML = `

    <!-- ── Apparence ──────────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Apparence</span></div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Nom de l'application</label>
          <input id="set-app-name" value="${settings.app_name||'PrintFlow'}">
        </div>
        <div class="form-group">
          <label class="form-label">Thème de couleurs</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px" id="theme-picker">
            ${Object.entries({
              blue:'Bleu', green:'Vert', purple:'Violet', red:'Rouge',
              orange:'Orange', teal:'Turquoise', slate:'Ardoise', pink:'Rose'
            }).map(([key, label]) => `
            <div onclick="selectTheme('${key}')" id="theme-btn-${key}"
                 style="display:flex;align-items:center;gap:6px;padding:6px 12px;
                        border-radius:var(--radius);cursor:pointer;font-size:12px;font-weight:500;
                        border:2px solid ${key===currentTheme?'var(--accent)':'transparent'};
                        background:${key===currentTheme?'var(--accent-bg)':'var(--bg3)'}">
              <span style="width:12px;height:12px;border-radius:50%;background:${themeAccent(key)};flex-shrink:0"></span>
              ${label}
            </div>`).join('')}
          </div>
          <input type="hidden" id="set-theme" value="${currentTheme}">
        </div>
      </div>

      <!-- Toggles champs optionnels -->
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
        <div style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">
          Champs optionnels
        </div>
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <div>
            <div style="font-size:13px">Gestion des prix</div>
            <div style="font-size:11px;color:var(--text3)">Affiche le champ Prix dans les fiches filament</div>
          </div>
          <div onclick="toggleSetting('show_prices', this)" id="toggle-show-prices"
               data-enabled="${settings.show_prices!=='false'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.show_prices!=='false'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.show_prices!=='false'?'19px':'2px'}"></div>
          </div>
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <div>
            <div style="font-size:13px">Gestion des emplacements</div>
            <div style="font-size:11px;color:var(--text3)">Affiche le champ Emplacement dans les fiches filament et imprimante</div>
          </div>
          <div onclick="toggleSetting('show_locations', this)" id="toggle-show-locations"
               data-enabled="${settings.show_locations!=='false'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.show_locations!=='false'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.show_locations!=='false'?'19px':'2px'}"></div>
          </div>
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <div>
            <div style="font-size:13px">Alertes stock filament</div>
            <div style="font-size:11px;color:var(--text3)">Affiche un avertissement sur le dashboard quand une bobine est presque vide</div>
          </div>
          <div onclick="toggleSetting('stock_alert_enabled', this)" id="toggle-stock-alert"
               data-enabled="${settings.stock_alert_enabled!=='false'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.stock_alert_enabled!=='false'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.stock_alert_enabled!=='false'?'19px':'2px'}"></div>
          </div>
        </label>
        <div id="stock-alert-threshold-wrap" style="display:${settings.stock_alert_enabled!=='false'?'flex':'none'};align-items:center;gap:10px;padding-left:4px">
          <label style="font-size:13px;color:var(--text2)">Seuil d'alerte</label>
          <input id="set-stock-threshold" type="number" min="5" max="50" step="5"
                 value="${settings.stock_alert_threshold||20}"
                 style="width:70px" onchange="saveSettings()">
          <span style="font-size:13px;color:var(--text3)">% restant</span>
        </div>
      </div>

      <div style="margin-top:14px">
        <button class="btn btn-primary" onclick="saveSettings()">Enregistrer</button>
      </div>
    </div>

    <!-- ── Authentification ───────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Accès et sécurité</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <span style="color:var(--text2)">Activer</span>
          <div onclick="toggleSetting('auth_enabled', this)" id="toggle-auth"
               data-enabled="${settings.auth_enabled==='true'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.auth_enabled==='true'?'var(--accent)':'var(--border2)'};position:relative">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.auth_enabled==='true'?'19px':'2px'}"></div>
          </div>
        </label>
      </div>
      <div id="auth-config" style="display:${settings.auth_enabled==='true'?'block':'none'}">
        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">Mot de passe d'accès</label>
            <div style="position:relative">
              <input id="set-auth-password" type="password" value="${settings.auth_password||''}"
                     placeholder="Définir un mot de passe" style="padding-right:36px;width:100%">
              <button type="button" onclick="togglePwdVisibility('set-auth-password','eye-auth-1')"
                      style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:2px;color:var(--text3)">
                <svg id="eye-auth-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="form-group full">
            <label class="form-label">Confirmer le mot de passe</label>
            <div style="position:relative">
              <input id="set-auth-password-confirm" type="password"
                     placeholder="Retaper le mot de passe" style="padding-right:36px;width:100%">
              <button type="button" onclick="togglePwdVisibility('set-auth-password-confirm','eye-auth-2')"
                      style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:2px;color:var(--text3)">
                <svg id="eye-auth-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <div id="pwd-match-msg" style="font-size:11px;margin-top:4px;display:none"></div>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">
              Une fois activé, ce mot de passe sera demandé à chaque connexion depuis le réseau.
            </div>
          </div>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-primary" onclick="saveAuthSettings()">Enregistrer le mot de passe</button>
        </div>
      </div>
    </div>

    <!-- ── Spoolman ───────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Intégration Spoolman</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <span style="color:var(--text2)">Activer</span>
          <div onclick="toggleSpoolman()" id="spoolman-toggle"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${spoolmanEnabled?'var(--accent)':'var(--border2)'};position:relative">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${spoolmanEnabled?'19px':'2px'}"></div>
          </div>
        </label>
      </div>

      <div id="spoolman-config" style="display:${spoolmanEnabled?'block':'none'}">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
          <span class="badge ${spoolmanStatus.connected?'badge-success':'badge-danger'}">
            ${spoolmanStatus.connected?'● Connecté':'● Déconnecté'}
          </span>
          ${spoolmanStatus.connected?`<span style="font-size:12px;color:var(--text3)">v${spoolmanStatus.version||'?'} · ${spoolmanStatus.url}</span>`:''}
        </div>
        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">URL Spoolman</label>
            <input id="set-spoolman-url" value="${settings.spoolman_url||'http://localhost:7912'}" placeholder="http://localhost:7912">
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" onclick="saveSettings()">Enregistrer</button>
          <button class="btn" onclick="testSpoolman()">Tester la connexion</button>
          <button class="btn btn-success" onclick="syncSpoolmanSettings()">↻ Synchroniser les bobines</button>
        </div>
      </div>

      <div id="spoolman-disabled-msg" style="display:${spoolmanEnabled?'none':'block'};
           font-size:13px;color:var(--text3);padding:8px 0">
        Activez l'intégration Spoolman pour synchroniser vos bobines automatiquement.
      </div>
    </div>

    <!-- ── Bibliothèque ───────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Bibliothèque de fichiers</span></div>
      <div class="form-grid">
        <div class="form-group full">
          <label class="form-label">Chemin de stockage</label>
          <input id="set-library-path" value="${settings.library_path||'/opt/printflow/library'}"
                 placeholder="/opt/printflow/library">
          <div style="font-size:11px;color:var(--text3);margin-top:4px">
            Dossier sur le Raspberry Pi où sont stockés les STL, 3MF, etc.
          </div>
        </div>
      </div>
      <div id="lib-stats-display" style="margin-top:10px;font-size:13px;color:var(--text2)">
        Chargement des statistiques…
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-primary" onclick="saveSettings()">Enregistrer</button>
      </div>
    </div>

    <!-- ── Sauvegarde ──────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Sauvegarde automatique</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <span style="color:var(--text2)">Activer</span>
          <div onclick="toggleBackup()" id="backup-toggle"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.backup_enabled==='true'?'var(--accent)':'var(--border2)'};position:relative">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.backup_enabled==='true'?'19px':'2px'}"></div>
          </div>
        </label>
      </div>

      <div id="backup-config" style="display:${settings.backup_enabled==='true'?'block':'none'}">
        <div class="form-grid">
          <div class="form-group full">
            <label class="form-label">Dossier de sauvegarde</label>
            <input id="set-backup-path" value="${settings.backup_path||'/opt/printflow/backups'}"
                   placeholder="/opt/printflow/backups">
          </div>
          <div class="form-group">
            <label class="form-label">Horaire (expression cron)</label>
            <input id="set-backup-schedule" value="${settings.backup_schedule||'0 2 * * *'}"
                   placeholder="0 2 * * *">
            <div style="font-size:11px;color:var(--text3);margin-top:3px">
              Format : minute heure * * * — ex: <code>0 2 * * *</code> = 2h du matin chaque jour,
              <code>0 3 * * 0</code> = 3h le dimanche
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre de sauvegardes à conserver</label>
            <input id="set-backup-keep" type="number" min="1" max="30"
                   value="${settings.backup_keep||7}">
          </div>
          <div class="form-group full">
            <label class="form-label">Inclure la bibliothèque de fichiers</label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-top:4px">
              <div onclick="toggleBackupLibrary(this)" id="backup-library-toggle"
                   data-enabled="${settings.backup_library_enabled==='true'?'1':'0'}"
                   style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                          background:${settings.backup_library_enabled==='true'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
                <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                            top:2px;transition:left 0.2s;left:${settings.backup_library_enabled==='true'?'19px':'2px'}"></div>
              </div>
              <span style="font-size:13px;color:var(--text2)">
                Sauvegarder aussi les STL, 3MF et photos de la bibliothèque
                <span style="font-size:11px;color:var(--text3);display:block">Archive .tar.gz — peut être volumineuse</span>
              </span>
            </label>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="saveBackupSettings()">Enregistrer</button>
          <button class="btn" onclick="runBackupNow()">↓ Sauvegarder maintenant</button>
        </div>
      </div>

      <div id="backup-status-display" style="margin-top:12px"></div>

      <div id="backup-list-wrap" style="margin-top:14px;display:${settings.backup_enabled==='true'?'block':'none'}">
        <div style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;
                    letter-spacing:0.05em;margin-bottom:8px">Sauvegardes disponibles</div>
        <div id="backup-list"><span style="color:var(--text3);font-size:13px">Chargement…</span></div>
      </div>
    </div>

    <!-- ── Export complet ────────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Export complet</span></div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Télécharge une archive <code>.tar.gz</code> contenant la base de données,
        la bibliothèque de fichiers (STL, 3MF, photos) et la configuration.
        Utile pour migrer vers un nouveau Raspberry Pi ou faire une sauvegarde manuelle complète.
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary" onclick="exportFull()" id="btn-export-full">
          ↓ Télécharger l'export complet
        </button>
        <span id="export-status" style="font-size:12px;color:var(--text3)"></span>
      </div>
    </div>

    <!-- ── Imprimantes ────────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Accès interfaces imprimantes</span></div>
      <table>
        <thead><tr><th>Imprimante</th><th>Type</th><th>URL</th><th>Accès</th></tr></thead>
        <tbody id="printer-access-table">
          <tr><td colspan="4" style="color:var(--text3)">Chargement…</td></tr>
        </tbody>
      </table>
    </div>

    <!-- ── Système ────────────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Informations système</span></div>
      <div class="stat-row"><span class="stat-label">Backend</span><span class="stat-val">Node.js + Express</span></div>
      <div class="stat-row"><span class="stat-label">Base de données</span><span class="stat-val">MariaDB</span></div>
      <div class="stat-row"><span class="stat-label">Version</span><span class="stat-val">${settings._version || '1.6.0'}</span></div>
      <div class="stat-row"><span class="stat-label">Date de build</span><span class="stat-val">05/04/2026 09:47</span></div>
    </div>`;

  // Stats bibliothèque
  API.get('/library/stats').then(stats => {
    const el = document.getElementById('lib-stats-display');
    if (!el) return;
    const fmt = b => b < 1048576 ? (b/1024).toFixed(0)+' Ko' : (b/1048576).toFixed(1)+' Mo';
    el.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap">
      <span>${stats.total_objects||0} objet${stats.total_objects>1?'s':''}</span>
      <span>${stats.total_files} fichier${stats.total_files>1?'s':''}</span>
      <span>${fmt(stats.total_size)} utilisés</span>
      <span style="color:var(--text3);font-size:12px">${stats.library_path}</span>
    </div>`;
  }).catch(() => {});

  // Backup status
  loadBackupStatus();

  // Table imprimantes
  API.get('/printers').then(printers => {
    document.getElementById('printer-access-table').innerHTML = printers.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${interfaceTypeLabel(p.interface_type)}</td>
        <td style="font-size:12px;color:var(--text3)">${p.interface_url||'Non configurée'}</td>
        <td>${p.interface_url
          ? `<button class="btn btn-sm btn-primary" onclick="openPrinterIframe(${JSON.stringify(p).replace(/"/g,'&quot;')})">Ouvrir</button>`
          : '<span style="color:var(--text3);font-size:12px">—</span>'}</td>
      </tr>`).join('');
  });
}

// ── Toggle générique pour settings booléens ─────────────
function toggleSetting(key, el) {
  const enabled = el.dataset.enabled !== '1';
  el.dataset.enabled = enabled ? '1' : '0';
  const dot = el.querySelector('div');
  dot.style.left       = enabled ? '19px' : '2px';
  el.style.background  = enabled ? 'var(--accent)' : 'var(--border2)';
  // Sauvegarder immédiatement
  API.put('/settings', { [key]: String(enabled) }).catch(() => {});
  // Mettre à jour la variable globale
  if (key === 'show_prices')        window._showPrices        = enabled;
  if (key === 'show_locations')     window._showLocations      = enabled;
  if (key === 'stock_alert_enabled') window._stockAlertEnabled = enabled;
  if (key === 'stock_alert_enabled') {
    const wrap = document.getElementById('stock-alert-threshold-wrap');
    if (wrap) wrap.style.display = enabled ? 'flex' : 'none';
  }
  if (key === 'auth_enabled') {
    const cfg = document.getElementById('auth-config');
    if (cfg) cfg.style.display = enabled ? 'block' : 'none';
  }
}

// ── Toggle Spoolman ───────────────────────────────────────
function toggleSpoolman() {
  const toggle  = document.getElementById('spoolman-toggle');
  const config  = document.getElementById('spoolman-config');
  const msg     = document.getElementById('spoolman-disabled-msg');
  const dot     = toggle.querySelector('div');
  const enabled = dot.style.left === '2px'; // actuellement désactivé → on active

  dot.style.left        = enabled ? '19px' : '2px';
  toggle.style.background = enabled ? 'var(--accent)' : 'var(--border2)';
  config.style.display  = enabled ? 'block' : 'none';
  msg.style.display     = enabled ? 'none'  : 'block';

  // Sauvegarder immédiatement avec l'URL si disponible
  window._spoolmanEnabled = enabled;
  const urlEl = document.getElementById('set-spoolman-url');
  const body = { spoolman_enabled: String(enabled) };
  if (urlEl) body.spoolman_url = urlEl.value;
  API.put('/settings', body).then(() => {
    // Rafraîchir le badge Spoolman dans la sidebar
    if (typeof checkSpoolmanStatus === 'function') checkSpoolmanStatus();
  }).catch(() => {});
}

// ── Sélecteur de thème ────────────────────────────────────
function themeAccent(name) {
  const map = {
    blue:'#185FA5', green:'#1D7A47', purple:'#6B3FAC', red:'#B03030',
    orange:'#C05C10', teal:'#0D7D7D', slate:'#4A5568', pink:'#B03070'
  };
  return map[name] || '#185FA5';
}

function selectTheme(name) {
  document.getElementById('set-theme').value = name;
  // Mettre à jour visuellement les boutons
  Object.keys({ blue:1, green:1, purple:1, red:1, orange:1, teal:1, slate:1, pink:1 }).forEach(k => {
    const btn = document.getElementById('theme-btn-' + k);
    if (!btn) return;
    btn.style.borderColor = k === name ? 'var(--accent)' : 'transparent';
    btn.style.background  = k === name ? 'var(--accent-bg)' : 'var(--bg3)';
  });
  // Prévisualiser immédiatement
  applyTheme(name);
}

// ── Sauvegarder tous les paramètres ──────────────────────
async function saveSettings() {
  const togPrices = document.getElementById('toggle-show-prices');
  const togLocs   = document.getElementById('toggle-show-locations');
  const body = {
    app_name:       document.getElementById('set-app-name')?.value,
    library_path:   document.getElementById('set-library-path')?.value,
    theme:          document.getElementById('set-theme')?.value || 'blue',
    show_prices:           togPrices ? String(togPrices.dataset.enabled === '1') : 'true',
    show_locations:        togLocs   ? String(togLocs.dataset.enabled   === '1') : 'true',
    stock_alert_enabled:   document.getElementById('toggle-stock-alert')?.dataset.enabled === '1' ? 'true' : 'false',
    stock_alert_threshold: document.getElementById('set-stock-threshold')?.value || '20',
  };
  const urlEl = document.getElementById('set-spoolman-url');
  if (urlEl) body.spoolman_url = urlEl.value;
  try {
    await API.put('/settings', body);
    toast('Paramètres sauvegardés', 'success');
    // Mettre à jour le nom dans la sidebar et le titre de la page
    const newName = body.app_name || 'PrintFlow';
    const logoEl  = document.querySelector('.logo-name');
    if (logoEl) logoEl.textContent = newName;
    document.title = newName;
    checkSpoolmanStatus();
  } catch (e) { toast(e.message, 'error'); }
}

async function testSpoolman() {
  try {
    toast('Test en cours…');
    const r = await API.get('/spoolman/status');
    if (r.connected) toast(`Spoolman connecté · version ${r.version||'?'}`, 'success');
    else toast('Spoolman inaccessible', 'error');
  } catch (e) { toast('Erreur : ' + e.message, 'error'); }
}

// ── Backup ───────────────────────────────────────────────
function toggleBackup() {
  const toggle = document.getElementById('backup-toggle');
  const config = document.getElementById('backup-config');
  const listWrap = document.getElementById('backup-list-wrap');
  const dot    = toggle.querySelector('div');
  const enabled = dot.style.left === '2px';
  dot.style.left        = enabled ? '19px' : '2px';
  toggle.style.background = enabled ? 'var(--accent)' : 'var(--border2)';
  config.style.display  = enabled ? 'block' : 'none';
  listWrap.style.display = enabled ? 'block' : 'none';
  // Sauvegarder immédiatement
  const path     = document.getElementById('set-backup-path')?.value || '/opt/printflow/backups';
  const schedule = document.getElementById('set-backup-schedule')?.value || '0 2 * * *';
  const keep     = document.getElementById('set-backup-keep')?.value || 7;
  API.post('/backup/settings', { enabled, path, schedule, keep }).catch(()=>{});
  if (enabled) loadBackupStatus();
}

async function saveBackupSettings() {
  const libToggle = document.getElementById('backup-library-toggle');
  const body = {
    enabled:        document.getElementById('backup-toggle').querySelector('div').style.left !== '2px',
    path:           document.getElementById('set-backup-path').value,
    schedule:       document.getElementById('set-backup-schedule').value,
    keep:           parseInt(document.getElementById('set-backup-keep').value) || 7,
    libraryEnabled: libToggle ? libToggle.dataset.enabled === '1' : false,
  };
  try {
    await API.post('/backup/settings', body);
    toast('Paramètres de sauvegarde enregistrés', 'success');
    loadBackupStatus();
  } catch(e) { toast(e.message, 'error'); }
}

async function runBackupNow() {
  const el = document.getElementById('backup-status-display');
  if (el) el.innerHTML = '<span style="color:var(--text3);font-size:13px">Sauvegarde en cours…</span>';
  try {
    const r = await API.post('/backup/run', {});
    const fmt = b => b < 1048576 ? (b/1024).toFixed(0)+' Ko' : (b/1048576).toFixed(1)+' Mo';
    toast('Sauvegarde terminée — ' + r.backup.filename + ' (' + fmt(r.backup.size) + ')', 'success');
    loadBackupStatus();
  } catch(e) { toast('Erreur sauvegarde : ' + e.message, 'error'); }
}

async function loadBackupStatus() {
  try {
    const status = await API.get('/backup/status');
    const el     = document.getElementById('backup-status-display');
    const listEl = document.getElementById('backup-list');

    if (el && status.lastBackup) {
      const fmt = b => b < 1048576 ? (b/1024).toFixed(0)+' Ko' : (b/1048576).toFixed(1)+' Mo';
      el.innerHTML = `<div style="display:flex;gap:16px;font-size:13px;flex-wrap:wrap">
        <span style="color:var(--success)">✓ Dernière : ${fmtDateTime(status.lastBackup.date)}</span>
        <span style="color:var(--text3)">${fmt(status.lastBackup.size)}</span>
        ${status.nextBackup ? '<span style="color:var(--text3)">Prochaine : ' + fmtDateTime(status.nextBackup) + '</span>' : ''}
      </div>`;
    } else if (el) {
      el.innerHTML = status.nextBackup
        ? '<span style="font-size:12px;color:var(--text3)">Prochaine sauvegarde : ' + fmtDateTime(status.nextBackup) + '</span>'
        : '';
    }

    if (listEl) {
      if (!status.backups || status.backups.length === 0) {
        listEl.innerHTML = '<span style="color:var(--text3);font-size:13px">Aucune sauvegarde disponible.</span>';
      } else {
        const fmt = b => b < 1048576 ? (b/1024).toFixed(0)+' Ko' : (b/1048576).toFixed(1)+' Mo';
        listEl.innerHTML = `<table>
          <thead><tr><th>Fichier</th><th>Date</th><th>Taille</th><th></th></tr></thead>
          <tbody>
            ${status.backups.map(b => `<tr>
              <td style="font-size:12px;font-family:monospace">
                ${b.filename}
                <span style="font-size:10px;padding:1px 5px;border-radius:10px;margin-left:4px;
                  background:${b.type==='library'?'var(--success-bg)':'var(--info-bg)'};
                  color:${b.type==='library'?'var(--success)':'var(--info)'}">
                  ${b.type==='library'?'Bibliothèque':'Base de données'}
                </span>
              </td>
              <td style="font-size:12px">${fmtDateTime(b.date)}</td>
              <td style="font-size:12px">${fmt(b.size)}</td>
              <td>
                <a href="/api/backup/download/${b.filename}" class="btn btn-sm"
                   style="text-decoration:none">↓</a>
                <button class="btn btn-sm btn-danger" onclick="deleteBackup('${b.filename}')">✕</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>`;
      }
    }
  } catch(_) {}
}

function toggleBackupLibrary(el) {
  const enabled = el.dataset.enabled !== '1';
  el.dataset.enabled = enabled ? '1' : '0';
  const dot = el.querySelector('div');
  dot.style.left       = enabled ? '19px' : '2px';
  el.style.background  = enabled ? 'var(--accent)' : 'var(--border2)';
}

async function deleteBackup(filename) {
  confirmDelete('Supprimer cette sauvegarde ?', async () => {
    try { await API.del('/backup/' + filename); toast('Sauvegarde supprimée'); loadBackupStatus(); }
    catch(e) { toast(e.message, 'error'); }
  });
}

async function exportFull() {
  const btn    = document.getElementById('btn-export-full');
  const status = document.getElementById('export-status');
  if (btn) btn.disabled = true;
  if (status) status.textContent = "Préparation de l'export…";

  try {
    // Déclencher le téléchargement directement via un lien
    const a = document.createElement('a');
    // Ajouter le token auth si nécessaire
    const token = localStorage.getItem('pf_auth_token') || '';
    a.href = '/api/backup/export-full' + (token ? '?token=' + encodeURIComponent(token) : '');
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (status) status.textContent = 'Export lancé — le téléchargement démarrera dans quelques secondes.';
    setTimeout(() => { if (status) status.textContent = ''; }, 8000);
  } catch(e) {
    toast('Erreur export : ' + e.message, 'error');
    if (status) status.textContent = '';
  } finally {
    if (btn) btn.disabled = false;
  }
}

function togglePwdVisibility(inputId, eyeId) {
  const input = document.getElementById(inputId);
  const eye   = document.getElementById(eyeId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  // Basculer l'icône œil / œil barré
  if (eye) {
    eye.innerHTML = isHidden
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
        '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
        '<line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

async function saveAuthSettings() {
  const pwd     = document.getElementById('set-auth-password')?.value;
  const confirm = document.getElementById('set-auth-password-confirm')?.value;
  const enabled = document.getElementById('toggle-auth')?.dataset.enabled === '1';
  const msgEl   = document.getElementById('pwd-match-msg');

  // Vérification confirmation uniquement si le champ est rempli
  if (confirm && pwd !== confirm) {
    if (msgEl) { msgEl.style.display = 'block'; msgEl.style.color = 'var(--danger)'; msgEl.textContent = '⚠ Les mots de passe ne correspondent pas.'; }
    return;
  }
  if (msgEl) msgEl.style.display = 'none';

  if (enabled && !pwd) return toast('Définissez un mot de passe', 'error');
  try {
    await API.put('/settings', { auth_enabled: String(enabled), auth_password: pwd || '' });
    // Réinitialiser le champ de confirmation
    const confirmEl = document.getElementById('set-auth-password-confirm');
    if (confirmEl) confirmEl.value = '';
    toast('Paramètres de sécurité sauvegardés', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function syncSpoolmanSettings() {
  try {
    toast('Synchronisation…');
    const r = await API.post('/spoolman/sync', {});
    toast(`${r.imported} importées, ${r.updated} mises à jour`, 'success');
  } catch (e) { toast('Erreur Spoolman : ' + e.message, 'error'); }
}
