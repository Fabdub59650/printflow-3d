async function renderDashboard() {
  document.getElementById('page-title').textContent = 'Tableau de bord';
  document.getElementById('topbar-actions').innerHTML = '';
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:40px 0 0 4px">Chargement…</div>';

  const [stats, prints, printers, projects, alerts, consumption, maintAlerts] = await Promise.all([
    API.get('/stats'),
    API.get('/prints?limit=8'),
    API.get('/printers'),
    API.get('/projects'),
    (window._stockAlertEnabled === true) ? API.get('/stats/alerts').catch(()=>[]) : Promise.resolve([]),
    API.get('/stats/consumption?days=30').catch(()=>null),
    (window._maintenanceAlertEnabled === true) ? API.get('/stats/maintenance-alerts').catch(()=>[]) : Promise.resolve([]),
  ]);

  const s = stats.totals;
  const activeP = printers.filter(p => p.status === 'printing');
  const lowStock = stats.lowStock;
  const activeProjects = projects.filter(p => p.status === 'in_progress');
  const draftProjects  = projects.filter(p => p.status === 'draft');

  // Widget alertes stock (défensif)
  let alertHtml = '';
  try {
    if (Array.isArray(alerts) && alerts.length > 0) {
      alertHtml = '<div class="card" style="border-left:3px solid var(--warning);margin-bottom:16px">' +
        '<div class="card-header"><span class="card-title" style="color:var(--warning)">⚠ Bobines bientôt vides (' + alerts.length + ')</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        alerts.map(function(f) {
          var pct = f.pct_remaining || 0;
          var col = pct <= 10 ? 'var(--danger)' : 'var(--warning)';
          return '<div style="display:flex;align-items:center;gap:10px">' +
            '<span class="filament-dot" style="background:' + (f.color_hex||'#ccc') + ';flex-shrink:0"></span>' +
            '<span style="flex:1;font-size:13px">' + f.name + '</span>' +
            '<span style="font-size:12px;color:var(--text3)">' + f.material + '</span>' +
            '<div style="width:80px"><div class="progress-wrap" style="height:5px">' +
            '<div class="progress-fill" style="width:' + pct + '%;background:' + col + '"></div></div></div>' +
            '<span style="font-size:12px;font-weight:500;color:' + col + ';min-width:38px;text-align:right">' + pct + '%</span>' +
            '</div>';
        }).join('') +
        '</div></div>';
    }
  } catch(_) {}

  // Widget alertes maintenance
  let maintAlertHtml = '';
  try {
    if (Array.isArray(maintAlerts) && maintAlerts.length > 0) {
      maintAlertHtml = '<div class="card" style="border-left:3px solid var(--danger);margin-bottom:16px">' +
        '<div class="card-header">' +
          '<span class="card-title" style="color:var(--danger)">🔧 Maintenance à prévoir (' + maintAlerts.length + ')</span>' +
          '<a href="#" class="btn btn-sm" onclick="switchTab(\'maintenance\',document.querySelector(\'[data-tab=maintenance]\'))">Voir tout</a>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        maintAlerts.map(function(m) {
          const overdue = m.days_until < 0;
          const col = overdue ? '#ef4444' : m.days_until <= 7 ? '#f59e0b' : '#3b82f6';
          const label = overdue
            ? 'En retard de ' + Math.abs(m.days_until) + 'j'
            : m.days_until === 0 ? 'Aujourd\'hui'
            : 'Dans ' + m.days_until + 'j';
          return '<div style="display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:16px">🖨</span>' +
            '<span style="flex:1;font-size:13px">' + (m.printer_name||'—') + ' — ' + m.type.replace(/_/g,' ') + '</span>' +
            '<span style="font-size:11px;color:#888">' + fmtDate(m.next_due) + '</span>' +
            '<span style="font-size:12px;font-weight:500;color:' + col + ';min-width:100px;text-align:right">' + label + '</span>' +
            '<button class="btn btn-sm" onclick="markMaintenanceDone(' + m.id + ')" ' +
              'style="background:#10b981;color:#fff;border:none;white-space:nowrap" title="Marquer comme effectuée">✓ Fait</button>' +
          '</div>';
        }).join('') +
        '</div></div>';
    }
  } catch(_) {}

  content.innerHTML = alertHtml + maintAlertHtml + `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Imprimantes actives</div>
        <div class="metric-value">${activeP.length}<span style="font-size:14px;color:var(--text2)"> / ${s.printer_count}</span></div>
        <div class="metric-sub">en impression</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Projets en cours</div>
        <div class="metric-value">${activeProjects.length}</div>
        <div class="metric-sub">${draftProjects.length} en brouillon</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total impressions</div>
        <div class="metric-value">${s.total_prints || 0}</div>
        <div class="metric-sub">réussite : ${s.total_prints ? Math.round((s.success/s.total_prints)*100) : 0}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Stock faible</div>
        <div class="metric-value" style="color:${lowStock.length > 0 ? 'var(--warning)' : 'var(--text)'}">${lowStock.length}</div>
        <div class="metric-sub">bobine${lowStock.length > 1 ? 's' : ''} sous 20%</div>
      </div>
    </div>

    ${activeProjects.length > 0 ? `
    <div class="card" style="margin-bottom:16px;border-left:3px solid var(--accent);border-radius:0 var(--radius-lg) var(--radius-lg) 0">
      <div class="card-header">
        <span class="card-title">Projets en cours</span>
        <a href="#" class="btn btn-sm" onclick="switchTab('projects',document.querySelector('[data-tab=projects]'))">Voir tout</a>
      </div>
      ${activeProjects.map(p => {
        const total = parseInt(p.total_prints)||0;
        const done  = parseInt(p.done_prints)||0;
        const pct   = total > 0 ? Math.round((done/total)*100) : 0;
        const active= parseInt(p.active_prints)||0;
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--border)">
          <code style="font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:var(--radius);
                       color:var(--text2);white-space:nowrap">${p.code}</code>
          <span style="flex:1;font-size:13px;font-weight:500">${p.name}</span>
          ${active > 0 ? '<span class="badge badge-info" style="font-size:10px">impression en cours</span>' : ''}
          <div style="width:100px">
            <div style="font-size:11px;color:var(--text3);text-align:right;margin-bottom:3px">${pct}%</div>
            <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%;background:var(--accent)"></div></div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Imprimantes</span>
          <a href="#" class="btn btn-sm" onclick="switchTab('printers',document.querySelector('[data-tab=printers]'))">Voir tout</a>
        </div>
        ${printers.slice(0,4).map(p => `
          <div class="stat-row">
            <span class="stat-label">${statusBadge(p.status)} <span style="margin-left:4px">${p.name}</span></span>
            <span class="stat-val" style="font-size:12px;color:var(--text3)">${p.model||''}</span>
          </div>`).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Stock faible</span>
          <a href="#" class="btn btn-sm" onclick="switchTab('filaments',document.querySelector('[data-tab=filaments]'))">Voir tout</a>
        </div>
        ${lowStock.length === 0
          ? '<p style="color:var(--text3);font-size:13px">Tous les stocks sont corrects.</p>'
          : lowStock.slice(0,5).map(f => {
              const p = pct(f.weight_remaining, f.weight_total);
              return `<div class="stat-row">
                <span class="stat-label">
                  <span class="filament-dot" style="background:${f.color_hex}"></span>
                  ${f.name}
                </span>
                <span class="stat-val" style="color:${p<10?'var(--danger)':'var(--warning)'}">
                  ${Math.round(f.weight_remaining)}g (${p}%)
                </span>
              </div>`;
            }).join('')}
      </div>
    </div>

    ${prints.length > 0 ? `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Impressions récentes</span>
        <a href="#" class="btn btn-sm" onclick="switchTab('prints',document.querySelector('[data-tab=prints]'))">Voir tout</a>
      </div>
      <table>
        <thead><tr><th>Projet</th><th>Imprimante</th><th>Filament</th><th>Consommé</th><th>Statut</th></tr></thead>
        <tbody>
          ${prints.map(function(p) {
            const rowBg = p.status==='fail' ? 'background:rgba(239,68,68,0.04)' : '';
            return '<tr style="' + rowBg + '">' +
              '<td style="font-weight:500">' + p.name + '</td>' +
              '<td style="color:var(--text3);font-size:12px">' + (p.printer_name||'—') + '</td>' +
              '<td>' + (p.filament_name ? '<span class="filament-dot" style="background:' + p.color_hex + '"></span> ' + p.filament_name : '—') + '</td>' +
              '<td style="font-size:12px">' + (p.filament_used ? p.filament_used+'g' : '—') + '</td>' +
              '<td>' + statusBadge(p.status) + '</td>' +
            '</tr>';
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}`;

  // Widget consommation 30j
  if (consumption && consumption.byMaterial && consumption.byMaterial.length) {
    const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
    const totalConso = consumption.byMaterial.reduce(function(s,r){ return s+parseFloat(r.total_g||0); },0);
    const consoHtml = '<div class="card"><div class="card-header">' +
      '<span class="card-title">Consommation — 30 derniers jours</span>' +
      '<button class="btn btn-sm" onclick="switchTab(\'stats\',document.querySelector(\'[data-tab=stats]\')); setTimeout(function(){ switchStatsView(\'consumption\',null); },300)">Détail</button>' +
      '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center">' +
      '<div style="position:relative;height:160px"><canvas id="dash-conso-chart"></canvas></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
      consumption.byMaterial.slice(0,5).map(function(r,i){
        const pct = totalConso>0 ? Math.round((r.total_g/totalConso)*100) : 0;
        return '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + COLORS[i%COLORS.length] + ';flex-shrink:0;display:inline-block"></span>' +
          '<span style="flex:1;font-size:12px">' + r.material + '</span>' +
          '<span style="font-size:12px;font-weight:500">' + Math.round(r.total_g) + 'g</span>' +
          '<span style="font-size:11px;color:var(--text3);min-width:32px;text-align:right">' + pct + '%</span></div>';
      }).join('') +
      '<div style="border-top:0.5px solid var(--border);padding-top:6px;margin-top:2px;font-size:12px;color:var(--text3)">' +
      'Total : <strong style="color:var(--text)">' + Math.round(totalConso) + 'g</strong></div>' +
      '</div></div></div>';
    content.innerHTML += consoHtml;

    try {
      if (typeof Chart !== 'undefined') {
        const ctx = document.getElementById('dash-conso-chart');
        if (ctx) {
          new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: consumption.byMaterial.map(function(r){ return r.material; }),
              datasets: [{ data: consumption.byMaterial.map(function(r){ return Math.round(r.total_g); }),
                backgroundColor: COLORS.slice(0, consumption.byMaterial.length), borderWidth: 2 }]
            },
            options: { responsive:true, maintainAspectRatio:false,
              plugins: { legend: { display:false } } }
          });
        }
      }
    } catch(_) {}
  }
}

async function markMaintenanceDone(id) {
  try {
    await API.patch('/maintenance/' + id + '/done', {});
    toast('Maintenance marquée comme effectuée ✓', 'success');
    renderDashboard();
  } catch(e) { toast('Erreur : ' + e.message, 'error'); }
}
