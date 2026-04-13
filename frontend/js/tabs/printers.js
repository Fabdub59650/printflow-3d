let allPrinters = [];

async function renderPrinters() {
  document.getElementById('page-title').textContent = 'Imprimantes';
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary" onclick="openPrinterForm()">+ Ajouter</button>`;
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  allPrinters = await API.get('/printers');
  renderPrinterCards();
}

function renderPrinterCards() {
  const container = document.getElementById('content');
  if (!allPrinters.length) {
    container.innerHTML = `<div class="empty-state"><p>Aucune imprimante enregistrée.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="printer-grid">${allPrinters.map(printerCard).join('')}</div>`;
}

function printerCard(p) {
  const successRate = p.total_prints > 0 ? Math.round((p.total_success / p.total_prints) * 100) : 0;
  return `
  <div class="printer-card ${p.status === 'printing' ? 'printing' : ''}">
    <div class="printer-card-header">
      <div>
        <div class="printer-name">${p.name}</div>
        <div class="printer-model">${p.model || ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        ${statusBadge(p.status)}
        ${p.interface_url ? `<span style="font-size:10px;color:var(--text3)">${interfaceTypeLabel(p.interface_type)}</span>` : ''}
      </div>
    </div>

    ${p.status === 'printing' ? `
    <div class="job-bar">
      <div class="job-name">Impression en cours</div>
      <div class="progress-wrap" style="margin-top:6px"><div class="progress-fill" style="width:${p.progress||0}%"></div></div>
      <div class="job-pct" style="margin-top:4px">${p.progress||0}%</div>
    </div>` : ''}

    <div class="printer-stats-mini">
      <div class="pstat"><div class="pstat-label">Impressions</div><div class="pstat-val">${p.total_prints}</div></div>
      <div class="pstat"><div class="pstat-label">Réussite</div><div class="pstat-val">${successRate}%</div></div>
      <div class="pstat"><div class="pstat-label">Heures total</div><div class="pstat-val">${Math.round(p.total_hours)}h</div></div>
      <div class="pstat"><div class="pstat-label">Filament</div><div class="pstat-val">${(p.total_grams/1000).toFixed(1)}kg</div></div>
    </div>

    ${window._showLocations && p.location ? `<div style="font-size:11px;color:var(--text3);margin-bottom:10px">📍 ${p.location}</div>` : ''}

    <div class="printer-actions">
      ${p.interface_url ? `<button class="btn btn-primary btn-sm" onclick="openPrinterIframe(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        Ouvrir interface
      </button>` : ''}
      <button class="btn btn-sm" onclick="openPrinterDetail(${p.id})">Détails</button>
      <button class="btn btn-sm" onclick="openPrinterForm(${p.id})">Modifier</button>
      <button class="btn btn-sm btn-danger" onclick="deletePrinter(${p.id})">Suppr.</button>
    </div>
  </div>`;
}

async function openPrinterDetail(id, activeTab) {
  activeTab = activeTab || 'infos';

  const [p, prints, maint, consumables] = await Promise.all([
    API.get('/printers/' + id),
    API.get('/printers/' + id + '/prints'),
    API.get('/printers/' + id + '/maintenance'),
    API.get('/consumables?printer_id=' + id).catch(() => []),
  ]);
  const successRate = p.total_prints > 0 ? Math.round((p.total_success / p.total_prints) * 100) : 0;

  // ── Barre d'onglets ───────────────────────────────────────
  const tabs = [
    { id:'infos',        label:'📋 Infos'        },
    { id:'fiabilite',    label:'📈 Fiabilité'     },
    { id:'consommables', label:'🔩 Consommables'  },
    { id:'historique',   label:'🖨 Historique'    },
  ];
  const tabBar = '<div style="display:flex;gap:0;border-bottom:2px solid var(--border2);margin-bottom:16px;flex-wrap:wrap">' +
    tabs.map(function(t) {
      const active = activeTab === t.id;
      return '<button onclick="openPrinterDetail(' + id + ',\'' + t.id + '\')" ' +
        'style="padding:7px 14px;font-size:12px;font-weight:' + (active?'600':'400') + ';border:none;cursor:pointer;' +
        'background:transparent;color:' + (active?'var(--accent)':'var(--text2)') + ';' +
        'border-bottom:' + (active?'2px solid var(--accent)':'2px solid transparent') + ';' +
        'margin-bottom:-2px;white-space:nowrap">' + t.label + '</button>';
    }).join('') +
  '</div>';

  // ── Contenu selon onglet ──────────────────────────────────
  let tabContent = '';

  if (activeTab === 'infos') {
    tabContent =
      '<div class="grid-2" style="margin-bottom:16px">' +
        '<div>' +
          '<div class="form-label" style="margin-bottom:8px">Informations</div>' +
          '<div class="stat-row"><span class="stat-label">Modèle</span><span class="stat-val">' + (p.model||'—') + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Volume</span><span class="stat-val">' + p.volume_x + '×' + p.volume_y + '×' + p.volume_z + ' mm</span></div>' +
          '<div class="stat-row"><span class="stat-label">Buse</span><span class="stat-val">Ø' + p.nozzle_size + 'mm · max ' + p.temp_nozzle_max + '°C</span></div>' +
          '<div class="stat-row"><span class="stat-label">Plateau max</span><span class="stat-val">' + p.temp_bed_max + '°C</span></div>' +
          '<div class="stat-row"><span class="stat-label">Puissance</span><span class="stat-val">' + (p.power_consumption ? p.power_consumption + ' W' : '—') + '</span></div>' +
        '<div class="stat-row"><span class="stat-label">AMS / Multi-filaments</span><span class="stat-val">' + (p.has_ams ? '<span style="color:#10b981;font-weight:500">✓ Oui</span>' : '<span style="color:var(--text3)">Non</span>') + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Interface</span><span class="stat-val">' + interfaceTypeLabel(p.interface_type) + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">IP</span><span class="stat-val">' + (p.ip_address||'—') + '</span></div>' +
          (window._showLocations ? '<div class="stat-row"><span class="stat-label">Emplacement</span><span class="stat-val">' + (p.location||'—') + '</span></div>' : '') +
        '</div>' +
        '<div>' +
          '<div class="form-label" style="margin-bottom:8px">Statistiques</div>' +
          '<div class="stat-row"><span class="stat-label">Total impressions</span><span class="stat-val">' + p.total_prints + '</span></div>' +
          '<div class="stat-row"><span class="stat-label">Taux de réussite</span><span class="stat-val">' + successRate + '%</span></div>' +
          '<div class="stat-row"><span class="stat-label">Heures totales</span><span class="stat-val">' + Math.round(p.total_hours) + 'h</span></div>' +
          '<div class="stat-row"><span class="stat-label">Filament total</span><span class="stat-val">' + (p.total_grams/1000).toFixed(2) + 'kg</span></div>' +
        '</div>' +
      '</div>' +
      (p.interface_url ? '<div style="margin-bottom:16px">' +
        '<button class="btn btn-primary" onclick="closeModal();openPrinterIframe(' + JSON.stringify(p).replace(/"/g,'&quot;') + ')">' +
          'Ouvrir l\'interface ' + interfaceTypeLabel(p.interface_type) +
        '</button></div>' : '') +
      (p.notes ? '<div style="font-size:13px;color:var(--text2);background:var(--bg3);padding:10px;border-radius:var(--radius)">' + p.notes + '</div>' : '');
  }

  if (activeTab === 'fiabilite') {
    tabContent =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
        '<div style="font-size:13px;color:var(--text2)">Taux de réussite par période</div>' +
        '<div style="display:flex;gap:6px">' +
          '<select id="rel-months" onchange="reloadReliability(' + id + ')" style="font-size:12px">' +
            '<option value="3">3 mois</option>' +
            '<option value="6">6 mois</option>' +
            '<option value="12" selected>12 mois</option>' +
            '<option value="24">24 mois</option>' +
            '<option value="120">Tout</option>' +
          '</select>' +
          '<select id="rel-gran" onchange="reloadReliability(' + id + ')" style="font-size:12px">' +
            '<option value="week">Par semaine</option>' +
            '<option value="month" selected>Par mois</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div style="position:relative;height:220px;margin-bottom:16px">' +
        '<canvas id="reliability-chart"></canvas>' +
      '</div>' +
      '<div id="reliability-stats" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px"></div>' +
      '<div id="reliability-maintenance" style="margin-top:8px"></div>';
  }

  if (activeTab === 'consommables') {
    tabContent =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
        '<div class="form-label" style="margin:0">Consommables</div>' +
        '<button class="btn btn-sm btn-primary" onclick="openAddConsumable(' + id + ')">+ Ajouter</button>' +
      '</div>' +
      (consumables.length === 0
        ? '<p style="color:var(--text3);font-size:13px">Aucun consommable configuré.</p>'
        : '<div style="display:flex;flex-direction:column;gap:10px">' +
          consumables.map(function(c) {
            const col  = c.status === 'critical' ? '#ef4444' : c.status === 'warning' ? '#f59e0b' : '#10b981';
            const icon = c.status === 'critical' ? '🔴' : c.status === 'warning' ? '🟠' : '🟢';
            return '<div style="background:var(--bg3);border-radius:var(--radius);padding:10px 12px">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
                '<span>' + icon + '</span>' +
                '<span style="flex:1;font-size:13px;font-weight:500">' + c.name + '</span>' +
                '<span style="font-size:11px;color:var(--text3)">' + c.hours_used + 'h / ' + c.interval_hours + 'h</span>' +
                '<button class="btn btn-sm" style="background:#10b981;color:#fff;border:none" onclick="resetConsumableInDetail(' + c.id + ',' + id + ')">✓</button>' +
                '<button class="btn btn-sm" onclick="editConsumable(' + c.id + ',' + id + ')">✏</button>' +
                '<button class="btn btn-sm btn-danger" onclick="deleteConsumable(' + c.id + ',' + id + ')">✕</button>' +
              '</div>' +
              '<div style="height:6px;background:var(--border2);border-radius:3px">' +
                '<div style="width:' + c.pct + '%;height:100%;background:' + col + ';border-radius:3px"></div>' +
              '</div>' +
              (c.reset_at ? '<div style="font-size:11px;color:var(--text3);margin-top:4px">Dernier remplacement : ' + fmtDate(c.reset_at) + '</div>' : '') +
            '</div>';
          }).join('') +
          '</div>');
  }

  if (activeTab === 'historique') {
    tabContent =
      '<table><thead><tr><th>Impression</th><th>Filament</th><th>Durée</th><th>Consommé</th><th>Statut</th></tr></thead><tbody>' +
      prints.slice(0, 20).map(function(pr) {
        return '<tr>' +
          '<td style="font-size:12px">' + pr.name + '</td>' +
          '<td>' + (pr.filament_name ? '<span class="filament-dot" style="background:' + pr.color_hex + '"></span> ' + pr.filament_name : '—') + '</td>' +
          '<td>' + fmtDuration(pr.actual_duration) + '</td>' +
          '<td>' + (pr.filament_used ? pr.filament_used + 'g' : '—') + '</td>' +
          '<td>' + statusBadge(pr.status) + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<div style="margin-top:16px">' +
        '<div class="form-label" style="margin-bottom:8px">Maintenance</div>' +
        (maint.length === 0 ? '<p style="color:var(--text3);font-size:13px">Aucune maintenance enregistrée.</p>' :
          maint.slice(0, 5).map(function(m) {
            return '<div class="stat-row">' +
              '<span class="stat-label">' + fmtDate(m.performed_at) + ' — ' + m.type + '</span>' +
              '<span style="font-size:12px;color:var(--text3)">' + (m.description||'') + '</span>' +
            '</div>';
          }).join('')) +
      '</div>';
  }

  openModal(
    tabBar + tabContent +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Fermer</button>' +
      '<button class="btn btn-primary" onclick="closeModal();openPrinterForm(' + p.id + ')">Modifier</button>' +
    '</div>',
    p.name,
    { tabbed: true }
  );

  // Charger le graphique si onglet fiabilité
  if (activeTab === 'fiabilite') {
    loadReliabilityChart(id, 12, 'month');
  }
}

async function loadReliabilityChart(printerId, months, granularity) {
  const data = await API.get('/printers/' + printerId + '/reliability?months=' + months + '&granularity=' + granularity)
    .catch(() => null);
  if (!data) return;

  const { periods, global, maintenance } = data;

  // Stats globales
  const statsEl = document.getElementById('reliability-stats');
  if (statsEl) {
    statsEl.innerHTML =
      '<div class="metric-card" style="flex:1;min-width:90px;padding:8px 12px">' +
        '<div class="metric-label">Impressions</div>' +
        '<div class="metric-value" style="font-size:18px">' + (global.total||0) + '</div>' +
      '</div>' +
      '<div class="metric-card" style="flex:1;min-width:90px;padding:8px 12px">' +
        '<div class="metric-label">Réussies</div>' +
        '<div class="metric-value" style="font-size:18px;color:#10b981">' + (global.success||0) + '</div>' +
      '</div>' +
      '<div class="metric-card" style="flex:1;min-width:90px;padding:8px 12px">' +
        '<div class="metric-label">Taux moyen</div>' +
        '<div class="metric-value" style="font-size:18px;color:var(--accent)">' + (global.avg_rate||0) + '%</div>' +
      '</div>';
  }

  // Corrélation maintenance
  const maintEl = document.getElementById('reliability-maintenance');
  if (maintEl && maintenance.length > 0) {
    maintEl.innerHTML =
      '<div style="font-size:11px;font-weight:500;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em">Maintenances sur la période</div>' +
      maintenance.map(function(m) {
        return '<div style="display:flex;gap:8px;font-size:12px;padding:4px 0;border-bottom:0.5px solid var(--border)">' +
          '<span style="color:var(--text3);white-space:nowrap">' + fmtDate(m.performed_at) + '</span>' +
          '<span style="color:var(--text2)">' + m.type.replace(/_/g,' ') + '</span>' +
          (m.description ? '<span style="color:var(--text3)">— ' + m.description + '</span>' : '') +
        '</div>';
      }).join('');
  }

  // Graphique Chart.js
  const canvas = document.getElementById('reliability-chart');
  if (!canvas || !periods.length) return;

  const avgRate = parseFloat(global.avg_rate) || 0;
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridCol = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? '#9ca3af' : '#6b7280';

  // Détruire graphique précédent si existant
  if (window._reliabilityChart) { window._reliabilityChart.destroy(); window._reliabilityChart = null; }

  window._reliabilityChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: periods.map(function(r) { return r.period; }),
      datasets: [
        {
          label: 'Taux de réussite (%)',
          data: periods.map(function(r) { return r.rate; }),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Moyenne (' + avgRate + '%)',
          data: periods.map(function() { return avgRate; }),
          borderColor: '#ef4444',
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: textCol, font: { size: 11 }, boxWidth: 20 } },
        tooltip: {
          callbacks: {
            afterBody: function(items) {
              const idx = items[0]?.dataIndex;
              if (idx === undefined) return '';
              const r = periods[idx];
              return ['Impressions : ' + r.total, 'Réussies : ' + r.success, 'Heures : ' + r.hours + 'h'];
            }
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: textCol, callback: function(v) { return v + '%'; } },
          grid: { color: gridCol },
        },
        x: {
          ticks: { color: textCol, font: { size: 10 } },
          grid: { color: gridCol },
        }
      }
    }
  });
}

function reloadReliability(printerId) {
  const months = document.getElementById('rel-months')?.value || 12;
  const gran   = document.getElementById('rel-gran')?.value   || 'month';
  if (window._reliabilityChart) { window._reliabilityChart.destroy(); window._reliabilityChart = null; }
  loadReliabilityChart(printerId, months, gran);
}


function openPrinterForm(id = null) {
  const p = id ? allPrinters.find(x => x.id === id) : {};
  const title = id ? 'Modifier ' + p.name : 'Nouvelle imprimante';
  openModal(`
    <!-- ── Identification ───────────────────────────────── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div>
        <label class="form-label">Nom affiché *</label>
        <input id="pf-name" value="${p.name||''}" placeholder="Nom de l'imprimante">
      </div>
      <div>
        <label class="form-label">Modèle</label>
        <select id="pf-model">
          ${['Bambu Lab X1C','Bambu Lab P1S','Bambu Lab A1 Mini','Prusa MK4','Prusa MK3S+','Prusa MINI+','Creality Ender 3','Creality Ender 3 V3','Creality K1','Elegoo Centauri Carbon 2','Voron 2.4','Voron Trident','Voron 0.2','Autre']
            .map(m => `<option ${(p.model||'')==m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      ${window._showLocations ? `
      <div class="form-group">
        <label class="form-label">Emplacement</label>
        <input id="pf-loc" value="${p.location||''}">
      </div>` : ''}
      <div>
        <label class="form-label">Statut</label>
        <select id="pf-status">
          ${['idle','printing','paused','error','offline','maintenance'].map(s =>
            `<option value="${s}" ${(p.status||'idle')==s?'selected':''}>${statusBadge(s).replace(/<[^>]+>/g,'').trim()}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding-top:18px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
          <span style="font-size:13px;color:var(--text2)">Système AMS / multi-filaments</span>
          <div onclick="togglePrinterAms(this)" id="pf-ams-toggle"
               data-enabled="${p.has_ams?'1':'0'}"
               style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background 0.2s;
                      background:${p.has_ams?'var(--accent)':'var(--border2)'};position:relative;flex-shrink:0">
            <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;
                        top:2px;transition:left 0.2s;left:${p.has_ams?'19px':'2px'}"></div>
          </div>
        </label>
      </div>
    </div>

    <!-- ── Connexion ─────────────────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Connexion</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label class="form-label">Adresse IP</label>
          <input id="pf-ip" value="${p.ip_address||''}" placeholder="192.168.1.100">
        </div>
        <div>
          <label class="form-label">Type d'interface</label>
          <select id="pf-itype">
            ${['octoprint','moonraker','bambu','duet','repetier','other'].map(t =>
              `<option value="${t}" ${(p.interface_type||'')==t?'selected':''}>${interfaceTypeLabel(t)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">URL interface web</label>
          <input id="pf-iurl" value="${p.interface_url||''}" placeholder="http://192.168.1.100">
        </div>
        <div>
          <label class="form-label">Clé API (OctoPrint / Moonraker)</label>
          <input id="pf-apikey" value="${p.api_key||''}" placeholder="optionnel">
        </div>
      </div>
    </div>

    <!-- ── Volume d'impression ───────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Volume d'impression (mm)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div>
          <label class="form-label">X</label>
          <input id="pf-vx" type="number" value="${p.volume_x||220}">
        </div>
        <div>
          <label class="form-label">Y</label>
          <input id="pf-vy" type="number" value="${p.volume_y||220}">
        </div>
        <div>
          <label class="form-label">Z</label>
          <input id="pf-vz" type="number" value="${p.volume_z||250}">
        </div>
      </div>
    </div>

    <!-- ── Températures & buse ───────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Températures & buse</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div>
          <label class="form-label">Diamètre buse (mm)</label>
          <select id="pf-noz">
            ${['0.2','0.4','0.6','0.8'].map(v => `<option ${(p.nozzle_size||0.4)==v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Temp. buse max (°C)</label>
          <input id="pf-tnoz" type="number" value="${p.temp_nozzle_max||260}">
        </div>
        <div>
          <label class="form-label">Temp. plateau max (°C)</label>
          <input id="pf-tbed" type="number" value="${p.temp_bed_max||110}">
        </div>
      </div>
    </div>

    <!-- ── Énergie & notes ───────────────────────────────── -->
    <div style="border-top:0.5px solid var(--border2);padding-top:12px">
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">Énergie & notes</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label class="form-label">Consommation électrique (W)</label>
          <input id="pf-power" type="number" min="0" placeholder="ex: 300" value="${p.power_consumption||''}">
          <span style="font-size:11px;color:var(--text3)">Pour le calcul du coût des impressions</span>
        </div>
      </div>
      <label class="form-label">Notes / maintenance</label>
      <textarea id="pf-notes" style="min-height:60px">${p.notes||''}</textarea>
    </div>

    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="savePrinter(${id||'null'})">Enregistrer</button>
    </div>`, title);
}

async function savePrinter(id) {
  const body = {
    name: document.getElementById('pf-name').value,
    model: document.getElementById('pf-model').value,
    ip_address: document.getElementById('pf-ip').value,
    interface_type: document.getElementById('pf-itype').value,
    interface_url: document.getElementById('pf-iurl').value,
    api_key: document.getElementById('pf-apikey').value,
    volume_x: document.getElementById('pf-vx').value,
    volume_y: document.getElementById('pf-vy').value,
    volume_z: document.getElementById('pf-vz').value,
    nozzle_size: document.getElementById('pf-noz').value,
    temp_nozzle_max: document.getElementById('pf-tnoz').value,
    temp_bed_max: document.getElementById('pf-tbed').value,
    location: document.getElementById('pf-loc')?.value || '',
    status: document.getElementById('pf-status').value,
    notes: document.getElementById('pf-notes').value,
    power_consumption: document.getElementById('pf-power')?.value || null,
    has_ams: document.getElementById('pf-ams-toggle')?.dataset.enabled === '1' ? 1 : 0,
  };
  if (!body.name) return toast('Le nom est requis', 'error');
  try {
    if (id) await API.put('/printers/' + id, body);
    else await API.post('/printers', body);
    closeModal();
    toast(id ? 'Imprimante mise à jour' : 'Imprimante ajoutée', 'success');
    renderPrinters();
  } catch (e) { toast(e.message, 'error'); }
}

async function deletePrinter(id) {
  confirmDelete('Supprimer cette imprimante ?', async () => {
    try {
      await API.del('/printers/' + id);
      toast('Imprimante supprimée');
      renderPrinters();
    } catch (e) { toast(e.message, 'error'); }
  });
}

// ── Consommables ───────────────────────────────────────────────────────────
async function openAddConsumable(printerId) {
  let templates = [];
  try { templates = await API.get('/consumables/templates'); } catch(_) {}

  openModal(
    '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">Modèle prédéfini</label>' +
        '<select id="cons-template" onchange="applyConsumableTemplate(this)">' +
          '<option value="">— Choisir un modèle ou saisir manuellement —</option>' +
          templates.map(function(t) {
            return '<option value="' + t.default_hours + '" data-name="' + t.name + '">' +
              t.name + ' (' + t.default_hours + 'h)' + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group full"><label class="form-label">Nom du consommable *</label>' +
        '<input id="cons-name" placeholder="ex: Huile rails X/Y"></div>' +
      '<div class="form-group"><label class="form-label">Intervalle (heures) *</label>' +
        '<input id="cons-hours" type="number" min="1" placeholder="200"></div>' +
      '<div class="form-group full"><label class="form-label">Notes</label>' +
        '<input id="cons-notes" placeholder="Informations complémentaires"></div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveConsumable(null,' + printerId + ')">Ajouter</button>' +
    '</div>',
    'Ajouter un consommable'
  );
}

function applyConsumableTemplate(sel) {
  const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return;
  const nameEl  = document.getElementById('cons-name');
  const hoursEl = document.getElementById('cons-hours');
  if (nameEl  && !nameEl.value)  nameEl.value  = opt.dataset.name;
  if (hoursEl) hoursEl.value = opt.value;
}

async function editConsumable(id, printerId) {
  const cons = await API.get('/consumables?printer_id=' + printerId).catch(() => []);
  const c = cons.find(function(x) { return x.id === id; });
  if (!c) return toast('Consommable introuvable', 'error');

  openModal(
    '<div class="form-grid">' +
      '<div class="form-group full"><label class="form-label">Nom du consommable *</label>' +
        '<input id="cons-name" value="' + c.name + '"></div>' +
      '<div class="form-group"><label class="form-label">Intervalle (heures) *</label>' +
        '<input id="cons-hours" type="number" min="1" value="' + c.interval_hours + '"></div>' +
      '<div class="form-group full"><label class="form-label">Notes</label>' +
        '<input id="cons-notes" value="' + (c.notes||'') + '"></div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveConsumable(' + id + ',' + printerId + ')">Enregistrer</button>' +
    '</div>',
    'Modifier — ' + c.name
  );
}

async function saveConsumable(id, printerId) {
  const name  = document.getElementById('cons-name')?.value?.trim();
  const hours = document.getElementById('cons-hours')?.value;
  const notes = document.getElementById('cons-notes')?.value;
  if (!name) return toast('Le nom est requis', 'error');
  if (!hours || parseInt(hours) < 1) return toast('L\'intervalle doit être > 0', 'error');
  try {
    if (id) {
      await API.put('/consumables/' + id, { name, interval_hours: parseInt(hours), notes });
      toast('Consommable mis à jour ✓', 'success');
    } else {
      await API.post('/consumables', { printer_id: printerId, name, interval_hours: parseInt(hours), notes });
      toast('Consommable ajouté ✓', 'success');
    }
    closeModal();
    openPrinterDetail(printerId);
  } catch(e) { toast(e.message, 'error'); }
}

async function resetConsumableInDetail(id, printerId) {
  try {
    await API.patch('/consumables/' + id + '/reset', {});
    toast('Compteur réinitialisé ✓', 'success');
    openPrinterDetail(printerId, 'consommables');
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteConsumable(id, printerId) {
  confirmDelete('Supprimer ce consommable ?', async function() {
    try {
      await API.del('/consumables/' + id);
      toast('Consommable supprimé', 'success');
      openPrinterDetail(printerId, 'consommables');
    } catch(e) { toast(e.message, 'error'); }
  });
}

function togglePrinterAms(el) {
  const enabled = el.dataset.enabled !== '1';
  el.dataset.enabled = enabled ? '1' : '0';
  el.style.background = enabled ? 'var(--accent)' : 'var(--border2)';
  el.querySelector('div').style.left = enabled ? '19px' : '2px';
}
