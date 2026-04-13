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

  if (!window._settingsTab) window._settingsTab = 'interface';
  const tab = window._settingsTab;

  const tabDefs = [
    { id:'interface',    label:'🎨️ Interface'    },
    { id:'donnees',      label:'💾 Données'      },
    { id:'integrations', label:'🔌 Intégrations'  },
    { id:'imprimantes',  label:'🖨️ Imprimantes'  },
    { id:'systeme',      label:'⚙️ Système'    },
  ];

  const tabBar = '<div style="display:flex;gap:0;border-bottom:2px solid var(--border2);margin-bottom:20px;flex-wrap:wrap">' +
    tabDefs.map(function(t) {
      const active = tab === t.id;
      return '<button onclick="switchSettingsTab(\'' + t.id + '\',this)" ' +
        'style="padding:8px 16px;font-size:13px;font-weight:' + (active?'600':'400') + ';' +
        'border:none;cursor:pointer;background:transparent;' +
        'color:' + (active?'var(--accent)':'var(--text2)') + ';' +
        'border-bottom:' + (active?'2px solid var(--accent)':'2px solid transparent') + ';' +
        'margin-bottom:-2px;transition:all 0.15s;white-space:nowrap">' + t.label + '</button>';
    }).join('') +
  '</div>' +
  '<div id="settings-tab-content"></div>';

  document.getElementById('content').innerHTML = tabBar;

  // Générer le contenu de l'onglet actif
  const el = document.getElementById('settings-tab-content');
  if (!el) return;

  switch(tab) {
    case 'interface':
      el.innerHTML = `
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
        <div class="form-group">
          <label class="form-label">Mode sombre</label>
          <select id="set-color-mode" onchange="previewColorMode(this.value)">
            <option value=""      ${!settings.color_mode||settings.color_mode===''?'selected':''}>Automatique (selon l'OS)</option>
            <option value="light" ${settings.color_mode==='light'?'selected':''}>Toujours clair</option>
            <option value="dark"  ${settings.color_mode==='dark'?'selected':''}>Toujours sombre</option>
            <option value="auto-system" ${settings.color_mode==='auto-system'?'selected':''}>Suivre le thème système</option>
            <option value="auto-time"   ${settings.color_mode==='auto-time'?'selected':''}>Selon l'heure</option>
          </select>
          <div id="color-mode-time-wrap" style="display:${settings.color_mode==='auto-time'?'flex':'none'};gap:12px;margin-top:8px;align-items:center;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--text2)">Sombre de</span>
            <select id="set-dark-from" style="width:80px">
              ${Array.from({length:24},(_,i)=>'<option value="'+i+'"'+(String(settings.dark_from||'20')==String(i)?' selected':'')+'>'+String(i).padStart(2,'0')+'h</option>').join('')}
            </select>
            <span style="font-size:13px;color:var(--text2)">à</span>
            <select id="set-dark-to" style="width:80px">
              ${Array.from({length:24},(_,i)=>'<option value="'+i+'"'+(String(settings.dark_to||'7')==String(i)?' selected':'')+'>'+String(i).padStart(2,'0')+'h</option>').join('')}
            </select>
          </div>
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
            <div style="font-size:13px">Gestion des projets</div>
            <div style="font-size:11px;color:var(--text3)">Affiche l'onglet Projets, les champs Projet/Pièce dans les impressions et les widgets du dashboard</div>
          </div>
          <div onclick="toggleSetting('projects_enabled', this)" id="toggle-projects-enabled"
               data-enabled="${settings.projects_enabled!=='false'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.projects_enabled!=='false'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.projects_enabled!=='false'?'19px':'2px'}"></div>
          </div>
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <div>
            <div style="font-size:13px">Gestion des devis</div>
            <div style="font-size:11px;color:var(--text3)">Affiche l'onglet Devis pour créer et suivre les devis clients</div>
          </div>
          <div onclick="toggleSetting('quotes_enabled', this)" id="toggle-quotes-enabled"
               data-enabled="${settings.quotes_enabled!=='false'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.quotes_enabled!=='false'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.quotes_enabled!=='false'?'19px':'2px'}"></div>
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

      <div style="margin-top:14px;padding-top:14px;border-top:0.5px solid var(--border)">
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <div>
            <div style="font-size:13px">Alertes maintenance</div>
            <div style="font-size:11px;color:var(--text3)">Affiche un avertissement sur le dashboard quand une échéance de maintenance approche</div>
          </div>
          <div onclick="toggleSetting('maintenance_alert_enabled', this)" id="toggle-maintenance-alert"
               data-enabled="${settings.maintenance_alert_enabled!=='false'?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${settings.maintenance_alert_enabled!=='false'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${settings.maintenance_alert_enabled!=='false'?'19px':'2px'}"></div>
          </div>
        </label>
        <div id="maintenance-alert-days-wrap" style="display:${settings.maintenance_alert_enabled!=='false'?'flex':'none'};align-items:center;gap:10px;padding-left:4px;margin-top:10px">
          <label style="font-size:13px;color:var(--text2)">Délai d'alerte</label>
          <input id="set-maintenance-days" type="number" min="7" max="90" step="7"
                 value="${settings.maintenance_alert_days||30}"
                 style="width:70px" onchange="saveSettings()">
          <span style="font-size:13px;color:var(--text3)">jours avant l'échéance</span>
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

    <!-- ── PWA et Notifications ─────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Application mobile (PWA)</span></div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
        PrintFlow peut être installé comme application sur votre mobile ou tablette pour un accès rapide sans navigateur.
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary" onclick="installPWA()" id="pwa-install-btn-settings">
          ↓ Installer l'application
        </button>
        <span style="font-size:12px;color:var(--text3)">
          Sur iOS : Safari → Partager → Sur l'écran d'accueil
        </span>
      </div>

    </div>`;
      // Synchroniser le thème actif
      document.querySelectorAll('.theme-btn').forEach(function(b) {
        b.style.outline = b.dataset.theme === currentTheme ? '3px solid var(--accent)' : 'none';
      });
      break;

    case 'donnees':
      el.innerHTML = `
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

    <!-- ── Photos impressions ─────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Photos des impressions</span></div>
      <div class="form-grid">
        <div class="form-group full">
          <label class="form-label">Chemin de stockage</label>
          <input id="set-prints-photo-path" value="${settings.prints_photo_path||'/opt/printflow/prints'}"
                 placeholder="/opt/printflow/prints">
          <div style="font-size:11px;color:var(--text3);margin-top:4px">
            Dossier sur le Raspberry Pi où sont stockées les photos des impressions.
          </div>
        </div>
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

    <!-- ── Restauration ──────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Restauration</span></div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Restaurez la base de données depuis un fichier de sauvegarde <code>.sql</code>
        ou un export complet <code>.tar.gz</code>.
        <strong style="color:var(--danger)"> Attention : la restauration écrase les données actuelles.</strong>
      </p>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input type="file" id="restore-file-input" accept=".sql,.tar.gz"
               onchange="previewRestoreFile(this)"
               style="font-size:12px;flex:1;min-width:200px">
        <button class="btn btn-primary" id="btn-restore" onclick="doRestore()" disabled>
          ↺ Restaurer
        </button>
      </div>
      <div id="restore-preview" style="margin-top:10px;font-size:12px;color:var(--text3)"></div>
      <div id="restore-status" style="margin-top:8px;font-size:13px"></div>
    </div>

    <!-- ── Vider des données ──────────────────────── -->
    <div id="purge-section-placeholder"></div>`;

      loadBackupStatus();
      API.get('/library/stats').then(function(stats) {
        const el2 = document.getElementById('lib-stats-display');
        if (!el2) return;
        const fmt = function(b) { return b < 1048576 ? (b/1024).toFixed(0)+' Ko' : (b/1048576).toFixed(1)+' Mo'; };
        el2.innerHTML = '<div style="display:flex;gap:16px;font-size:13px;flex-wrap:wrap">' +
          '<span><strong>' + stats.file_count + '</strong> fichiers</span>' +
          '<span>' + fmt(stats.total_size) + ' utilisés</span>' +
          '<span style="font-size:12px;color:var(--text3)">' + stats.library_path + '</span>' +
          '</div>';
      }).catch(function() {});
      renderPurgeSection();
      break;

    case 'integrations':
      el.innerHTML = `
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

    <!-- ── Tapo P100 ─────────────────────────────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">🔌 Tapo P100 — Prises connectées</span>
        <div onclick="toggleTapoEnabled(this)" id="toggle-tapo-enabled"
             data-enabled="${settings.tapo_enabled==='true'?'1':'0'}"
             style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                    background:${settings.tapo_enabled==='true'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
          <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                      top:2px;transition:left 0.2s;left:${settings.tapo_enabled==='true'?'19px':'2px'}"></div>
        </div>
      </div>
      <div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius);padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--warning)">
        ⚠ <strong>Compatibilité firmware 1.4.0+</strong> — Le protocole KLAP local est restreint aux apps officielles Tapo.
        Le contrôle via cloud fonctionne uniquement si les prises sont en ligne sur les serveurs TP-Link.
        Cette limitation sera levée lors d'une mise à jour de la librairie tp-link-tapo-connect.
      </div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Identifiants du compte Tapo — utilisés pour l'authentification cloud.
        Le mot de passe est chiffré AES-256 en base de données.
      </p>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">Email du compte Tapo</label>
          <input id="set-tapo-email" type="email" value="${settings.tapo_email||''}" placeholder="votre@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe Tapo</label>
          <input id="set-tapo-password" type="password" placeholder="${settings.tapo_password ? '••••••••' : 'mot de passe Tapo'}">
          <div style="font-size:11px;color:var(--text3);margin-top:3px">Laisser vide pour ne pas modifier.</div>
        </div>
      </div>
      <div style="margin-top:10px">
        <button class="btn btn-primary" onclick="saveTapoCredentials()">Enregistrer les identifiants</button>
        <div id="tapo-creds-result" style="margin-top:8px;font-size:13px"></div>
      </div>
    </div>

    <!-- ── TigerTag Scale ───────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">TigerTag Scale</span></div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Balance connectée ESP32 avec lecteur RFID. Quand une bobine est posée et stabilisée,
        la pesée est créée automatiquement dans PrintFlow.
      </p>
      <div style="background:var(--bg3);border-radius:var(--radius);padding:12px 14px;margin-bottom:14px;font-size:12px">
        <div style="font-weight:500;margin-bottom:6px">URL du webhook à configurer sur l'ESP32 :</div>
        <code id="tigertag-webhook-url" style="color:var(--accent);font-size:12px"></code>
        <div style="margin-top:6px;color:var(--text3)">Dans le firmware ESP32 — remplacer l'URL du cloud TigerTag par cette adresse.</div>
      </div>
      <div id="tigertag-recent" style="margin-top:8px"></div>
    </div>

    <!-- ── API & Intégrations ───────────────────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">API &amp; Intégrations</span>
      </div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        PrintFlow expose une API REST complète. Utilisez-la pour intégrer avec
        Home Assistant, Jeedom, ou tout outil tiers.
      </p>
      <div style="background:var(--bg3);border-radius:var(--radius);padding:12px 14px;margin-bottom:14px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">URL de base</div>
        <code style="font-size:13px;color:var(--accent)" id="api-base-url"></code>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="/api-docs" target="_blank" class="btn btn-primary" style="text-decoration:none">
          📖 Documentation interactive (Swagger)
        </a>
        <a href="/openapi.yaml" target="_blank" class="btn btn-sm" style="text-decoration:none">
          ↓ openapi.yaml
        </a>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:0.5px solid var(--border)">
        <div style="font-size:12px;font-weight:500;margin-bottom:8px">Exemple Home Assistant</div>
        <pre style="font-size:11px;background:var(--bg3);padding:10px;border-radius:var(--radius);overflow-x:auto;color:var(--text2)">sensor:
  - platform: rest
    name: "Filaments stock faible"
    resource: <span id="ha-example-url"></span>/api/stats/alerts
    value_template: "{{ value_json | length }}"
    unit_of_measurement: bobines
    scan_interval: 3600</pre>
      </div>
    </div>

    <!-- ── Rapport hebdomadaire ──────────────────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📧 Rapport hebdomadaire</span>
        <div onclick="toggleSetting('report_enabled', this)" id="toggle-report-enabled"
             data-enabled="${settings.report_enabled==='true'?'1':'0'}"
             style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                    background:${settings.report_enabled==='true'?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
          <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                      top:2px;transition:left 0.2s;left:${settings.report_enabled==='true'?'19px':'2px'}"></div>
        </div>
      </div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Recevez chaque semaine un résumé de l'activité, de la consommation et des alertes par email.
      </p>
      <div id="report-config" style="display:${settings.report_enabled==='true'?'block':'none'}">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Email destinataire *</label>
            <input id="set-report-email" type="email" value="${settings.report_email||''}" placeholder="vous@exemple.com">
          </div>
          <div class="form-group">
            <label class="form-label">Jour d'envoi</label>
            <select id="set-report-day">
              ${[['1','Lundi'],['2','Mardi'],['3','Mercredi'],['4','Jeudi'],['5','Vendredi'],['6','Samedi'],['7','Dimanche']]
                .map(([v,l]) => '<option value="' + v + '"' + (settings.report_day===v?' selected':'') + '>' + l + '</option>').join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Heure d'envoi</label>
            <select id="set-report-hour">
              ${Array.from({length:24},(_,i)=>'<option value="'+i+'"'+(settings.report_hour==i?' selected':'')+'>'+String(i).padStart(2,'0')+'h00</option>').join('')}
            </select>
          </div>
        </div>
        <div style="border-top:0.5px solid var(--border2);padding-top:14px;margin-top:6px">
          <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:10px">Configuration SMTP</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Serveur SMTP *</label>
              <input id="set-smtp-host" value="${settings.smtp_host||''}" placeholder="smtp.gmail.com">
            </div>
            <div class="form-group">
              <label class="form-label">Port</label>
              <input id="set-smtp-port" type="number" value="${settings.smtp_port||'587'}" placeholder="587">
            </div>
            <div class="form-group">
              <label class="form-label">Utilisateur SMTP *</label>
              <input id="set-smtp-user" value="${settings.smtp_user||''}" placeholder="vous@gmail.com">
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe SMTP</label>
              <input id="set-smtp-password" type="password" value="" placeholder="${settings.smtp_password ? '••••••••' : 'mot de passe'}">
              <div style="font-size:11px;color:var(--text3);margin-top:3px">Chiffré AES-256 en base. Laisser vide pour ne pas modifier.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Email expéditeur</label>
              <input id="set-smtp-from" value="${settings.smtp_from||''}" placeholder="printflow@exemple.com">
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:8px;padding-top:20px">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="set-smtp-secure" ${settings.smtp_secure==='true'?'checked':''}>
                SSL/TLS (port 465)
              </label>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button class="btn btn-sm" onclick="testSmtpConnection()">🔌 Tester la connexion</button>
            <button class="btn btn-sm btn-primary" onclick="sendTestReport()">📧 Envoyer un rapport test</button>
          </div>
          <div id="smtp-test-result" style="margin-top:8px;font-size:13px"></div>
        </div>
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-primary" onclick="saveSettings()">Enregistrer</button>
      </div>
    </div>`;
      if (typeof checkSpoolmanStatus === 'function') checkSpoolmanStatus();
      var ttUrlEl = document.getElementById('tigertag-webhook-url');
      if (ttUrlEl) ttUrlEl.textContent = window.location.origin + '/api/tigertag/webhook';
      loadTigerTagRecent();
      var apiBaseEl = document.getElementById('api-base-url');
      var haUrlEl   = document.getElementById('ha-example-url');
      if (apiBaseEl) apiBaseEl.textContent = window.location.origin + '/api';
      if (haUrlEl)   haUrlEl.textContent   = window.location.origin;
      break;

    case 'imprimantes':
      el.innerHTML = `
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

    <!-- ── Consommables — modèles prédéfinis ────── -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Consommables — modèles prédéfinis</span>
        <button class="btn btn-sm btn-primary" onclick="openAddConsumableTemplate()">+ Nouveau modèle</button>
      </div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Ces modèles apparaissent comme suggestions lors de l'ajout d'un consommable sur une imprimante.
        Modifiez les intervalles selon votre matériel.
      </p>
      <div id="consumable-templates-list">
        <div style="color:var(--text3);font-size:13px">Chargement…</div>
      </div>
    </div>`;
      API.get('/printers').then(function(printers) {
        const el2 = document.getElementById('printer-access-table');
        if (!el2) return;
        el2.innerHTML = printers.map(function(p) {
          return '<tr>' +
            '<td>' + p.name + '</td>' +
            '<td>' + interfaceTypeLabel(p.interface_type) + '</td>' +
            '<td style="font-size:12px;color:var(--text3)">' + (p.interface_url||'Non configurée') + '</td>' +
            '<td>' + (p.interface_url
              ? '<button class="btn btn-sm btn-primary" onclick="openPrinterIframe(' + JSON.stringify(p).replace(/"/g, '&quot;') + ')">Ouvrir</button>'
              : '<span style="color:var(--text3);font-size:12px">—</span>') + '</td>' +
          '</tr>';
        }).join('');
      });
      loadConsumableTemplates();
      break;

    case 'systeme':
      el.innerHTML = `
    <!-- ── Système ────────────────────────────────── -->
    <div class="card">
      <div class="card-header"><span class="card-title">Informations système</span></div>
      <div class="stat-row"><span class="stat-label">Application</span><span class="stat-val">${settings.app_name||'PrintFlow-3D'}</span></div>
      <div class="stat-row"><span class="stat-label">Version</span><span class="stat-val">${settings._version || '1.9.0'}</span></div>
      <div class="stat-row"><span class="stat-label">Date de build</span><span class="stat-val">${settings._build_date || '—'}</span></div>
      <div class="stat-row"><span class="stat-label">Backend</span><span class="stat-val">Node.js + Express</span></div>
      <div class="stat-row"><span class="stat-label">Base de données</span><span class="stat-val">MariaDB</span></div>
      <div class="stat-row" id="os-version-row"><span class="stat-label">Système d'exploitation</span><span class="stat-val" id="os-version-val">Chargement…</span></div>
    </div>`;
      // Charger la version OS
      API.get('/settings/os-info').then(function(info) {
        var el2 = document.getElementById('os-version-val');
        if (el2) el2.textContent = info.os || '—';
      }).catch(function() {
        var el2 = document.getElementById('os-version-val');
        if (el2) el2.textContent = '—';
      });
      break;
      break;
  }
}

function switchSettingsTab(tab, btn) {
  window._settingsTab = tab;
  document.querySelectorAll('[onclick^="switchSettingsTab"]').forEach(function(b) {
    const active = b === btn;
    b.style.fontWeight   = active ? '600' : '400';
    b.style.color        = active ? 'var(--accent)' : 'var(--text2)';
    b.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
  });
  renderSettings();
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
  if (key === 'maintenance_alert_enabled') {
    window._maintenanceAlertEnabled = enabled;
    const wrap = document.getElementById('maintenance-alert-days-wrap');
    if (wrap) wrap.style.display = enabled ? 'flex' : 'none';
  }
  if (key === 'auth_enabled') {
    const cfg = document.getElementById('auth-config');
    if (cfg) cfg.style.display = enabled ? 'block' : 'none';
  }
  if (key === 'projects_enabled') {
    window._projectsEnabled = enabled;
    const navProjects = document.getElementById('nav-projects');
    if (navProjects) navProjects.style.display = enabled ? '' : 'none';
    // Si on désactive et qu'on est sur l'onglet projets → revenir au dashboard
    if (!enabled && currentTab === 'projects') {
      switchTab('dashboard');
    }
  
  }
  if (key === 'report_enabled') {
    var cfgEl = document.getElementById('report-config');
    if (cfgEl) cfgEl.style.display = enabled ? 'block' : 'none';
  }
  if (key === 'quotes_enabled') {
    var navQ = document.getElementById('nav-quotes');
    if (navQ) navQ.style.display = enabled ? '' : 'none';
    if (!enabled && currentTab === 'quotes') switchTab('dashboard');
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
    // TigerTag webhook URL
    const ttUrlEl = document.getElementById('tigertag-webhook-url');
    if (ttUrlEl) ttUrlEl.textContent = window.location.origin + '/api/tigertag/webhook';
    // Dernières pesées TigerTag
    loadTigerTagRecent();
    // Remplir l'URL de base de l'API
    const apiBase = window.location.origin;
    const apiBaseEl = document.getElementById('api-base-url');
    const haUrlEl   = document.getElementById('ha-example-url');
    if (apiBaseEl) apiBaseEl.textContent = apiBase + '/api';
    if (haUrlEl)   haUrlEl.textContent   = apiBase;
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
  const togPrices    = document.getElementById('toggle-show-prices');
  const togLocs      = document.getElementById('toggle-show-locations');
  const togProjects  = document.getElementById('toggle-projects-enabled');
  const togQuotes    = document.getElementById('toggle-quotes-enabled');
  const body = {
    app_name:       document.getElementById('set-app-name')?.value,
    library_path:        document.getElementById('set-library-path')?.value,
    prints_photo_path:   document.getElementById('set-prints-photo-path')?.value,
    theme:          document.getElementById('set-theme')?.value || 'blue',
    color_mode:     document.getElementById('set-color-mode')?.value || '',
    dark_from:      document.getElementById('set-dark-from')?.value || '20',
    dark_to:        document.getElementById('set-dark-to')?.value || '7',
    show_prices:           togPrices   ? String(togPrices.dataset.enabled   === '1') : 'true',
    show_locations:        togLocs     ? String(togLocs.dataset.enabled     === '1') : 'true',
    projects_enabled:      togProjects ? String(togProjects.dataset.enabled === '1') : 'true',
    quotes_enabled:        togQuotes   ? String(togQuotes.dataset.enabled   === '1') : 'true',
    stock_alert_enabled:        document.getElementById('toggle-stock-alert')?.dataset.enabled === '1' ? 'true' : 'false',
    stock_alert_threshold:      document.getElementById('set-stock-threshold')?.value || '20',
    maintenance_alert_enabled:  document.getElementById('toggle-maintenance-alert')?.dataset.enabled === '1' ? 'true' : 'false',
    maintenance_alert_days:     document.getElementById('set-maintenance-days')?.value || '30',
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
    // Appliquer la visibilité des onglets
    const navQuotes = document.getElementById('nav-quotes');
    if (navQuotes) navQuotes.style.display = body.quotes_enabled === 'true' ? '' : 'none';
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
                <button class="btn btn-sm" onclick="restoreBackup('${b.filename}')" title="Restaurer cette sauvegarde">↺</button>
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

// ── Restauration ─────────────────────────────────────────
function previewRestoreFile(input) {
  const file    = input.files[0];
  const preview = document.getElementById('restore-preview');
  const btn     = document.getElementById('btn-restore');
  const status  = document.getElementById('restore-status');
  if (status) status.textContent = '';
  if (!file) { if (btn) btn.disabled = true; return; }
  const size = file.size < 1048576 ? (file.size/1024).toFixed(0)+' Ko' : (file.size/1048576).toFixed(1)+' Mo';
  const type = file.name.endsWith('.tar.gz') ? 'Export complet (BDD + bibliothèque)' : 'Sauvegarde SQL';
  if (preview) preview.innerHTML =
    '<span style="color:var(--accent)">📄 ' + file.name + '</span>' +
    ' · ' + size + ' · ' + type;
  if (btn) btn.disabled = false;
}

async function doRestore() {
  const input  = document.getElementById('restore-file-input');
  const status = document.getElementById('restore-status');
  const btn    = document.getElementById('btn-restore');
  if (!input || !input.files.length) return;

  const file = input.files[0];
  const isFull = file.name.endsWith('.tar.gz');

  const msg = isFull
    ? 'Restaurer cet export complet ? La base de données ET la bibliothèque seront remplacées.'
    : 'Restaurer cette sauvegarde SQL ? La base de données sera remplacée par celle-ci.';

  if (!confirm('⚠ ' + msg + '\n\nCette action est irréversible. Continuer ?')) return;

  btn.disabled = true;
  if (status) { status.style.color = 'var(--text3)'; status.textContent = 'Restauration en cours…'; }

  const fd = new FormData();
  fd.append('backup', file);

  try {
    const resp = await fetch('/api/backup/restore', { method: 'POST', body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erreur serveur');
    if (status) {
      status.style.color = 'var(--success)';
      status.textContent = '✓ ' + (data.message || 'Restauration réussie') +
        ' — La page va se recharger…';
    }
    setTimeout(function() { window.location.reload(); }, 2500);
  } catch(e) {
    if (status) { status.style.color = 'var(--danger)'; status.textContent = '❌ ' + e.message; }
    btn.disabled = false;
  }
}

async function restoreBackup(filename) {
  if (!confirm('Restaurer la sauvegarde "' + filename + '" ?\n\nLa base de données actuelle sera remplacée.')) return;
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--bg2);border:1px solid var(--border);' +
    'padding:12px 16px;border-radius:var(--radius);font-size:13px;z-index:9999;color:var(--text3)';
  status.textContent = 'Restauration en cours…';
  document.body.appendChild(status);
  try {
    // Télécharger le fichier puis le renvoyer en restore
    const dlResp = await fetch('/api/backup/download/' + filename);
    const blob   = await dlResp.blob();
    const fd = new FormData();
    fd.append('backup', blob, filename);
    const resp = await fetch('/api/backup/restore', { method: 'POST', body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erreur');
    status.style.color = 'var(--success)';
    status.textContent = '✓ ' + (data.message || 'Restauré') + ' — Rechargement…';
    setTimeout(function() { window.location.reload(); }, 2000);
  } catch(e) {
    status.style.color = 'var(--danger)';
    status.textContent = '❌ ' + e.message;
    setTimeout(function() { document.body.removeChild(status); }, 4000);
  }
}

// ── TigerTag Scale ───────────────────────────────────────
async function loadTigerTagRecent() {
  const el = document.getElementById('tigertag-recent');
  if (!el) return;
  try {
    const data = await API.get('/tigertag/status');
    if (!data.recent || !data.recent.length) {
      el.innerHTML = '<p style="font-size:12px;color:var(--text3)">Aucune pesée TigerTag Scale enregistrée.</p>';
      return;
    }
    el.innerHTML =
      '<div style="font-size:12px;font-weight:500;margin-bottom:8px;color:var(--text2)">Dernières pesées reçues</div>' +
      '<table><thead><tr><th>Date</th><th>Filament</th><th>Brut</th><th>Net</th></tr></thead><tbody>' +
      data.recent.map(function(w) {
        return '<tr>' +
          '<td style="font-size:11px;color:var(--text3);white-space:nowrap">' + fmtDateTime(w.created_at) + '</td>' +
          '<td style="font-size:12px">' +
            '<span style="display:inline-flex;align-items:center;gap:5px">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + (w.color_hex||'#888') + ';display:inline-block"></span>' +
            w.filament_name + '</span>' +
          '</td>' +
          '<td style="font-size:12px">' + parseFloat(w.gross_weight).toFixed(0) + 'g</td>' +
          '<td style="font-size:12px;font-weight:500;color:var(--accent)">' + parseFloat(w.net_weight).toFixed(0) + 'g</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  } catch(_) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text3)">TigerTag Scale non connecté.</p>';
  }
}

// ── Consommables — modèles prédéfinis ──────────────────────────────────────
async function loadConsumableTemplates() {
  const el = document.getElementById('consumable-templates-list');
  if (!el) return;
  try {
    const templates = await API.get('/consumables/templates');
    if (!templates.length) {
      el.innerHTML = '<p style="color:var(--text3);font-size:13px">Aucun modèle disponible.</p>';
      return;
    }
    el.innerHTML =
      '<table>' +
        '<thead><tr><th>Nom</th><th>Intervalle</th><th>Description</th><th></th></tr></thead>' +
        '<tbody>' +
        templates.map(function(t) {
          return '<tr>' +
            '<td style="font-weight:500;font-size:13px">' + t.name + '</td>' +
            '<td style="font-size:13px">' + t.default_hours + 'h</td>' +
            '<td style="font-size:12px;color:var(--text3)">' + (t.description||'—') + '</td>' +
            '<td><div class="td-actions">' +
              '<button class="btn btn-sm" onclick="editConsumableTemplate(' + t.id + ')">✏</button>' +
              '<button class="btn btn-sm btn-danger" onclick="deleteConsumableTemplate(' + t.id + ')">✕</button>' +
            '</div></td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table>';
  } catch(e) {
    el.innerHTML = '<p style="color:var(--danger);font-size:13px">Erreur : ' + e.message + '</p>';
  }
}

function openAddConsumableTemplate() {
  openModal(
    '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">Nom du consommable *</label>' +
        '<input id="ct-name" placeholder="ex: Huile rails X/Y"></div>' +
      '<div class="form-group"><label class="form-label">Intervalle par défaut (heures) *</label>' +
        '<input id="ct-hours" type="number" min="1" placeholder="200"></div>' +
      '<div class="form-group full"><label class="form-label">Description</label>' +
        '<input id="ct-desc" placeholder="ex: Lubrification des rails de guidage"></div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveConsumableTemplate(null)">Ajouter</button>' +
    '</div>',
    'Nouveau modèle de consommable'
  );
}

async function editConsumableTemplate(id) {
  const templates = await API.get('/consumables/templates').catch(() => []);
  const t = templates.find(function(x) { return x.id === id; });
  if (!t) return toast('Modèle introuvable', 'error');
  openModal(
    '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">Nom *</label>' +
        '<input id="ct-name" value="' + t.name + '"></div>' +
      '<div class="form-group"><label class="form-label">Intervalle (heures) *</label>' +
        '<input id="ct-hours" type="number" min="1" value="' + t.default_hours + '"></div>' +
      '<div class="form-group full"><label class="form-label">Description</label>' +
        '<input id="ct-desc" value="' + (t.description||'') + '"></div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveConsumableTemplate(' + id + ')">Enregistrer</button>' +
    '</div>',
    'Modifier — ' + t.name
  );
}

async function saveConsumableTemplate(id) {
  const name  = document.getElementById('ct-name')?.value?.trim();
  const hours = parseInt(document.getElementById('ct-hours')?.value);
  const desc  = document.getElementById('ct-desc')?.value?.trim();
  if (!name)       return toast('Le nom est requis', 'error');
  if (!hours || hours < 1) return toast('L\'intervalle doit être > 0', 'error');
  try {
    if (id) {
      await API.put('/consumables/templates/' + id, { name, default_hours: hours, description: desc });
      toast('Modèle mis à jour ✓', 'success');
    } else {
      await API.post('/consumables/templates', { name, default_hours: hours, description: desc });
      toast('Modèle ajouté ✓', 'success');
    }
    closeModal();
    loadConsumableTemplates();
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteConsumableTemplate(id) {
  confirmDelete('Supprimer ce modèle de consommable ?', async function() {
    try {
      await API.del('/consumables/templates/' + id);
      toast('Modèle supprimé', 'success');
      loadConsumableTemplates();
    } catch(e) { toast(e.message, 'error'); }
  });
}

// ── SMTP — test connexion et envoi rapport test ────────────────────────────
async function testSmtpConnection() {
  var resultEl = document.getElementById('smtp-test-result');
  if (resultEl) resultEl.innerHTML = '<span style="color:var(--text3)">Test en cours…</span>';
  try {
    await saveSmtpConfig();
    var r = await API.post('/report/test-smtp', {});
    if (resultEl) resultEl.innerHTML = '<span style="color:#10b981">✓ ' + r.message + '</span>';
  } catch(e) {
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--danger)">✗ ' + e.message + '</span>';
  }
}

async function sendTestReport() {
  var resultEl = document.getElementById('smtp-test-result');
  if (resultEl) resultEl.innerHTML = '<span style="color:var(--text3)">Envoi en cours…</span>';
  try {
    await saveSmtpConfig();
    var r = await API.post('/report/send-test', {});
    if (resultEl) resultEl.innerHTML = '<span style="color:#10b981">✓ ' + r.message + '</span>';
    toast('Rapport de test envoyé ✓', 'success');
  } catch(e) {
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--danger)">✗ ' + e.message + '</span>';
  }
}

async function saveSmtpConfig() {
  var togReport = document.getElementById('toggle-report-enabled');
  var body = {
    enabled:       togReport ? togReport.dataset.enabled === '1' : false,
    email:         document.getElementById('set-report-email')?.value || '',
    day:           document.getElementById('set-report-day')?.value || '1',
    hour:          document.getElementById('set-report-hour')?.value || '8',
    smtp_host:     document.getElementById('set-smtp-host')?.value || '',
    smtp_port:     document.getElementById('set-smtp-port')?.value || '587',
    smtp_secure:   document.getElementById('set-smtp-secure')?.checked || false,
    smtp_user:     document.getElementById('set-smtp-user')?.value || '',
    smtp_password: document.getElementById('set-smtp-password')?.value || '',
    smtp_from:     document.getElementById('set-smtp-from')?.value || '',
  };
  await API.put('/report/config', body);
}

// ── Rendu de la section purge (JS pur, pas de template literal) ──────────
function renderPurgeSection() {
  var placeholder = document.getElementById('purge-section-placeholder');
  if (!placeholder) return;

  var card = document.createElement('div');
  card.className = 'card';
  card.style.border = '1px solid rgba(239,68,68,0.2)';

  var items = [
    { id:'purge-prints',      label:'\uD83D\uDDA8 Impressions',         danger:false, cnt:'cnt-prints'      },
    { id:'purge-weighings',   label:'\u2696 Pes\u00E9es',               danger:false, cnt:'cnt-weighings'   },
    { id:'purge-maintenance', label:'\uD83D\uDD27 Maintenances',        danger:false, cnt:'cnt-maintenance'  },
    { id:'purge-consumables', label:'\uD83D\uDD29 Consommables',        danger:false, cnt:'cnt-consumables'  },
    { id:'purge-projects',    label:'\uD83D\uDCCB Projets',             danger:false, cnt:'cnt-projects'     },
    { id:'purge-history',     label:'\uD83D\uDCDC Historique',          danger:false, cnt:'cnt-history'      },
    { id:'purge-quotes',      label:'\uD83D\uDCC4 Devis',               danger:false, cnt:'cnt-quotes'       },
    { id:'purge-filaments',   label:'\uD83E\uDDF5 Filaments',           danger:true,  cnt:'cnt-filaments'    },
    { id:'purge-printers',    label:'\uD83D\uDDA8 Imprimantes',         danger:true,  cnt:'cnt-printers'     },
    { id:'purge-library',     label:'\uD83D\uDCDA Biblioth\u00E8que',   danger:true,  cnt:'cnt-library', full:true },
  ];

  var html =
    '<div class="card-header">' +
      '<span class="card-title" style="color:var(--danger)">\uD83D\uDDD1 Vider des donn\u00E9es</span>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--text2);margin-bottom:14px">' +
      'Supprime d\u00E9finitivement les donn\u00E9es s\u00E9lectionn\u00E9es. Les param\u00E8tres et mod\u00E8les de consommables ne sont jamais affect\u00E9s. ' +
      '<strong style="color:var(--danger)">Action irr\u00E9versible.</strong>' +
    '</p>' +
    '<div id="purge-stats-display" style="margin-bottom:14px">' +
      '<button class="btn btn-sm" onclick="loadPurgeStats()">Afficher les compteurs</button>' +
    '</div>' +
    '<div id="purge-form" style="display:none">' +
      '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">' +
      items.map(function(item) {
        return '<label class="purge-check" style="display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer;padding:10px 12px;background:var(--bg3);border-radius:var(--radius);">' +
          '<input type="checkbox" id="' + item.id + '" onchange="updatePurgeBtn()" style="flex-shrink:0;width:16px;height:16px">' +
          '<span style="flex:1">' + item.label + '</span>' +
          '<span id="' + item.cnt + '" style="font-size:11px;color:var(--text3)"></span>' +
        '</label>';
      }).join('') +
      '</div>' +
      '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:var(--radius);padding:12px;margin-bottom:12px;box-sizing:border-box;width:100%">' +
        '<label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:13px;width:100%">' +
          '<input type="checkbox" id="purge-confirm" onchange="updatePurgeBtn()" style="margin-top:2px;flex-shrink:0;width:16px;height:16px">' +
          '<span style="color:var(--danger);flex:1;min-width:0;word-break:break-word">Je comprends que cette action est <strong>d\u00E9finitive et irr\u00E9versible</strong>. Les donn\u00E9es supprim\u00E9es ne pourront pas \u00EAtre r\u00E9cup\u00E9r\u00E9es.</span>' +
        '</label>' +
      '</div>' +
      '<button class="btn btn-danger" id="btn-purge" onclick="executePurge()" disabled style="opacity:0.5">' +
        '\uD83D\uDDD1 Vider les donn\u00E9es s\u00E9lectionn\u00E9es' +
      '</button>' +
      '<div id="purge-status" style="margin-top:10px;font-size:13px"></div>' +
    '</div>';

  card.innerHTML = html;
  placeholder.replaceWith(card);
}

// ── Purge des données ──────────────────────────────────────────────────────
async function loadPurgeStats() {
  const el = document.getElementById('purge-stats-display');
  const form = document.getElementById('purge-form');
  if (el) el.innerHTML = '<span style="color:var(--text3);font-size:13px">Chargement…</span>';
  try {
    const stats = await API.get('/settings/purge-stats');
    if (el) el.innerHTML = '';
    if (form) form.style.display = 'block';

    // Afficher les compteurs
    const map = {
      'cnt-prints':       (stats.prints||0) + ' impression' + (stats.prints!=1?'s':'') +
                          ', ' + (stats.print_filaments||0) + ' entrée(s) filament',
      'cnt-weighings':    (stats.filament_weighings||0) + ' pesée' + (stats.filament_weighings!=1?'s':''),
      'cnt-maintenance':  (stats.maintenance||0) + ' entrée' + (stats.maintenance!=1?'s':''),
      'cnt-consumables':  (stats.consumables||0) + ' consommable' + (stats.consumables!=1?'s':''),
      'cnt-projects':     (stats.projects||0) + ' projet' + (stats.projects!=1?'s':''),
      'cnt-history':      (stats.history_log||0) + ' entrée' + ((stats.history_log||0)!=1?'s':''),
      'cnt-quotes':       (stats.quotes||0) + ' devis',
      'cnt-filaments':    (stats.filaments||0) + ' bobine' + (stats.filaments!=1?'s':''),
      'cnt-printers':     (stats.printers||0) + ' imprimante' + (stats.printers!=1?'s':''),
      'cnt-library':      (stats.library_objects||0) + ' objet' + (stats.library_objects!=1?'s':'') +
                          ', ' + (stats.library_files||0) + ' fichier' + (stats.library_files!=1?'s':''),
    };
    Object.entries(map).forEach(function([id, text]) {
      var el2 = document.getElementById(id);
      if (el2) el2.textContent = '(' + text + ')';
    });
  } catch(e) {
    if (el) el.innerHTML = '<span style="color:var(--danger);font-size:13px">Erreur : ' + e.message + '</span>';
  }
}

function updatePurgeBtn() {
  var btn     = document.getElementById('btn-purge');
  var confirm = document.getElementById('purge-confirm');
  if (!btn || !confirm) return;
  var hasSelection = ['purge-prints','purge-weighings','purge-maintenance','purge-consumables',
    'purge-projects','purge-history','purge-filaments','purge-printers','purge-library']
    .some(function(id) { var el = document.getElementById(id); return el && el.checked; });
  var active = confirm.checked && hasSelection;
  btn.disabled    = !active;
  btn.style.opacity = active ? '1' : '0.5';
}

// Mettre à jour le bouton quand on coche/décoche une table
document.addEventListener('change', function(e) {
  if (e.target && e.target.closest && e.target.closest('.purge-check')) {
    updatePurgeBtn();
  }
});

async function executePurge() {
  var confirm = document.getElementById('purge-confirm');
  if (!confirm || !confirm.checked) return;

  // Collecter les tables sélectionnées
  var tables = [];
  var checkMap = {
    'purge-prints':       ['prints', 'print_filaments'],
    'purge-weighings':    ['filament_weighings'],
    'purge-maintenance':  ['maintenance'],
    'purge-consumables':  ['consumables'],
    'purge-projects':     ['projects'],
    'purge-history':      ['history_log'],
    'purge-quotes':       ['quotes'],
    'purge-filaments':    ['filaments'],
    'purge-printers':     ['printers'],
    'purge-library':      ['library_files', 'library_objects'],
  };
  Object.entries(checkMap).forEach(function([id, tbl]) {
    var el = document.getElementById(id);
    if (el && el.checked) tables = tables.concat(tbl);
  });

  if (!tables.length) return toast('Sélectionnez au moins une table', 'error');

  var statusEl = document.getElementById('purge-status');
  var btn      = document.getElementById('btn-purge');
  if (btn) { btn.disabled = true; btn.textContent = 'Suppression en cours…'; }
  if (statusEl) statusEl.innerHTML = '<span style="color:var(--text3)">Suppression en cours…</span>';

  try {
    var result = await API.post('/settings/purge', { tables, confirm: true });
    var total = Object.values(result.deleted).reduce(function(s, n) { return s + n; }, 0);
    var details = Object.entries(result.deleted)
      .filter(function(e) { return e[1] > 0; })
      .map(function(e) { return e[1] + ' ' + e[0]; })
      .join(', ');
    if (statusEl) statusEl.innerHTML =
      '<span style="color:#10b981">✓ ' + total + ' enregistrement' + (total!=1?'s':'') + ' supprimé' + (total!=1?'s':'') +
      (details ? ' (' + details + ')' : '') + '</span>';
    toast('Données vidées ✓', 'success');
    // Réinitialiser le formulaire
    if (confirm) confirm.checked = false;
    document.querySelectorAll('.purge-check input[type=checkbox]').forEach(function(el) { el.checked = false; });
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = '🗑 Vider les données sélectionnées'; }
    // Recharger les compteurs
    setTimeout(loadPurgeStats, 500);
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--danger)">Erreur : ' + e.message + '</span>';
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '🗑 Vider les données sélectionnées'; }
  }
}

// ── Mode sombre ────────────────────────────────────────────────────────────
function previewColorMode(mode) {
  // Afficher/masquer les sélecteurs d'heure
  var wrap = document.getElementById('color-mode-time-wrap');
  if (wrap) wrap.style.display = mode === 'auto-time' ? 'flex' : 'none';
  // Prévisualiser immédiatement
  if (typeof applyColorMode === 'function') {
    var from = document.getElementById('set-dark-from')?.value || '20';
    var to   = document.getElementById('set-dark-to')?.value   || '7';
    applyColorMode(mode || null, from, to);
  }
}

// ── Tapo P100 credentials ──────────────────────────────────────────────────
async function saveTapoCredentials() {
  var email    = document.getElementById('set-tapo-email')?.value?.trim();
  var password = document.getElementById('set-tapo-password')?.value;
  var resultEl = document.getElementById('tapo-creds-result');
  if (!email) {
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--danger)">Email requis</span>';
    return;
  }
  try {
    await fetch('/api/tapo/tapo-credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: password || '' })
    }).then(function(r) { return r.json(); });
    if (resultEl) resultEl.innerHTML = '<span style="color:#10b981">✓ Identifiants sauvegardés</span>';
    toast('Identifiants Tapo sauvegardés ✓', 'success');
    if (document.getElementById('set-tapo-password'))
      document.getElementById('set-tapo-password').value = '';
  } catch(e) {
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--danger)">Erreur : ' + e.message + '</span>';
  }
}

// ── Toggle Tapo enabled ────────────────────────────────────────────────────
async function toggleTapoEnabled(el) {
  var enabled = el.dataset.enabled !== '1';
  el.dataset.enabled = enabled ? '1' : '0';
  el.style.background = enabled ? 'var(--accent)' : 'var(--border2)';
  el.querySelector('div').style.left = enabled ? '19px' : '2px';
  try {
    await fetch('/api/tapo/tapo-credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    toast('Tapo ' + (enabled ? 'activé' : 'désactivé'), 'success');
  } catch(e) {
    toast('Erreur : ' + e.message, 'error');
  }
}
