async function renderStats() {
  document.getElementById('page-title').textContent = 'Statistiques';
  document.getElementById('topbar-actions').innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">
        <button class="filter-btn active" data-view="global"      onclick="switchStatsView('global',this)">Global</button>
        <button class="filter-btn"        data-view="activity"    onclick="switchStatsView('activity',this)">Activité</button>
        <button class="filter-btn"        data-view="filaments"   onclick="switchStatsView('filaments',this)">Filaments</button>
        <button class="filter-btn"        data-view="prints"      onclick="switchStatsView('prints',this)">Impressions</button>
        <button class="filter-btn"        data-view="consumption" onclick="switchStatsView('consumption',this)">Consommation</button>
        <button class="filter-btn"        data-view="history"     onclick="switchStatsView('history',this)">Historique</button>
        <button class="filter-btn"        data-view="costs"       onclick="switchStatsView('costs',this)">Coûts</button>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="exportCSV('prints')"   title="Exporter les impressions en CSV">⬇ Impressions</button>
        <button class="btn btn-sm" onclick="exportCSV('filaments')" title="Exporter les filaments en CSV">⬇ Filaments</button>
        <button class="btn btn-sm" onclick="exportCSV('stats')"    title="Exporter les stats en CSV">⬇ Stats</button>
      </div>
    </div>`;
  document.getElementById('content').innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  if (!document.getElementById('project-filter-style')) {
    const style = document.createElement('style');
    style.id = 'project-filter-style';
    style.textContent = '.filter-btn{padding:6px 12px;font-size:12px;font-weight:500;border:none;' +
      'background:transparent;cursor:pointer;color:var(--text2);transition:background 0.12s,color 0.12s}' +
      '.filter-btn:hover{background:var(--bg3);color:var(--text)}' +
      '.filter-btn.active{background:var(--text);color:var(--bg2)}';
    document.head.appendChild(style);
  }

  renderStatsGlobal();
}

function switchStatsView(view, btn) {
  document.querySelectorAll('.filter-btn[data-view]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (view === 'global')      renderStatsGlobal();
  if (view === 'activity')    renderStatsActivity();
  if (view === 'filaments')   renderStatsFilaments();
  if (view === 'prints')      renderStatsPrints();
  if (view === 'consumption') renderStatsConsumption();
  if (view === 'history')     renderStatsHistory();
  if (view === 'costs')       renderStatsCosts();
}

async function renderStatsGlobal() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  const stats = await API.get('/stats');
  const s     = stats.totals;
  const successRate = s.total_prints > 0 ? Math.round((s.success/s.total_prints)*100) : 0;

  content.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total impressions</div>
        <div class="metric-value">${s.total_prints||0}</div>
        <div class="metric-sub">Taux de réussite : ${successRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Filament consommé</div>
        <div class="metric-value">${((s.total_grams||0)/1000).toFixed(2)}<span style="font-size:14px"> kg</span></div>
        <div class="metric-sub">${Math.round(s.total_grams||0)} g au total</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Temps d'impression</div>
        <div class="metric-value">${fmtDuration(s.total_minutes)}</div>
        <div class="metric-sub">${Math.round((s.total_minutes||0)/60)} heures</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Imprimantes</div>
        <div class="metric-value">${s.printer_count}</div>
        <div class="metric-sub">${s.filament_count} bobines actives</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Consommation par matière</span></div>
        ${stats.byMaterial.length === 0
          ? '<p style="color:var(--text3);font-size:13px">Aucune donnée</p>'
          : stats.byMaterial.map(m => {
              const total = stats.byMaterial.reduce((s,x)=>s+(parseFloat(x.grams)||0),0);
              const pct   = total > 0 ? Math.round((m.grams/total)*100) : 0;
              return `<div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:500">${m.material}</span>
                  <span style="font-size:12px;color:var(--text2)">${Math.round(m.grams)}g · ${m.count} impressions</span>
                </div>
                <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>
              </div>`;
            }).join('')}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Par imprimante</span></div>
        <table>
          <thead><tr><th>Imprimante</th><th>Impressions</th><th>Réussite</th><th>Filament</th></tr></thead>
          <tbody>
            ${stats.byPrinter.map(p => `<tr>
              <td style="font-weight:500">${p.name}</td>
              <td>${p.total_prints||0}</td>
              <td>${p.total_prints>0?Math.round((p.total_success/p.total_prints)*100):0}%</td>
              <td>${Math.round(p.total_grams||0)}g</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Activité mensuelle</span></div>
      ${stats.byMonth.length === 0
        ? '<p style="color:var(--text3);font-size:13px">Aucune donnée</p>'
        : `<div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding:8px 0">
            ${(() => {
              const max = Math.max(...stats.byMonth.map(m=>m.count));
              return stats.byMonth.map(m => {
                const h = max > 0 ? Math.round((m.count/max)*100) : 0;
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                  <div style="font-size:10px;color:var(--text3)">${m.count}</div>
                  <div style="width:100%;background:var(--accent);border-radius:3px 3px 0 0;height:${h}%;min-height:2px"></div>
                  <div style="font-size:9px;color:var(--text3);writing-mode:vertical-rl;transform:rotate(180deg)">${m.month}</div>
                </div>`;
              }).join('');
            })()}
          </div>`}
    </div>`;
}

async function renderStatsFilaments() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  const data = await API.get('/stats/filaments');
  const { byFilament, topUsed } = data;

  const totalUsed   = byFilament.reduce((s,f)=>s+(parseFloat(f.total_used_g)||0),0);
  const totalPrints = byFilament.reduce((s,f)=>s+(parseInt(f.total_prints)||0),0);
  const activeSpool = byFilament.filter(f=>f.total_prints>0).length;

  content.innerHTML = `
    <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="metric-card">
        <div class="metric-label">Bobines utilisées</div>
        <div class="metric-value">${activeSpool}</div>
        <div class="metric-sub">${byFilament.length} au total</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total consommé</div>
        <div class="metric-value">${(totalUsed/1000).toFixed(2)}<span style="font-size:14px"> kg</span></div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Impressions liées</div>
        <div class="metric-value">${totalPrints}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Moy. par impression</div>
        <div class="metric-value">${totalPrints>0?(totalUsed/totalPrints).toFixed(0):'—'}<span style="font-size:14px">g</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Détail par bobine</span></div>
      <table>
        <thead><tr>
          <th>Filament</th><th>Matière</th><th>Stock restant</th>
          <th>Consommé</th><th>Impressions</th><th>Réussite</th>
          <th>Moy/impression</th><th>Dernière utilisation</th>
        </tr></thead>
        <tbody>
          ${byFilament.map(f => {
            const p_        = f.weight_total>0?Math.round((f.weight_remaining/f.weight_total)*100):0;
            const barColor  = p_<15?'var(--danger)':p_<25?'var(--warning)':'var(--accent)';
            const sucPct    = f.total_prints>0?Math.round((f.success_prints/f.total_prints)*100):null;
            return `<tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="filament-dot" style="background:${f.color_hex}"></span>
                  <div>
                    <div style="font-weight:500">${f.name}</div>
                    ${f.brand?`<div style="font-size:11px;color:var(--text3)">${f.brand}</div>`:''}
                  </div>
                </div>
              </td>
              <td>${f.material}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="progress-wrap" style="width:50px;flex-shrink:0">
                    <div class="progress-fill" style="width:${p_}%;background:${barColor}"></div>
                  </div>
                  <span style="font-size:12px">${Math.round(f.weight_remaining)}g</span>
                </div>
              </td>
              <td style="font-weight:500">${f.total_used_g>0?Math.round(f.total_used_g)+'g':'—'}</td>
              <td>${f.total_prints||0}</td>
              <td style="color:${sucPct!==null&&sucPct<80?'var(--warning)':'var(--text)'}">
                ${sucPct!==null?sucPct+'%':'—'}
              </td>
              <td>${f.avg_used_per_print>0?Math.round(f.avg_used_per_print)+'g':'—'}</td>
              <td style="font-size:12px;color:var(--text3)">
                ${f.last_use?fmtDate(f.last_use):'Jamais'}
                ${f.weighing?`<div style="font-size:10px;color:var(--accent)">⚖ ${fmtDate(f.weighing.last_weighing)}</div>`:''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    ${topUsed.length>0?`
    <div class="card">
      <div class="card-header"><span class="card-title">Top 10 — plus utilisés</span></div>
      ${topUsed.map((f,i)=>{
        const max = topUsed[0].total_g;
        const p_  = max>0?Math.round((f.total_g/max)*100):0;
        return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--border)">
          <span style="font-size:12px;color:var(--text3);min-width:20px;text-align:right">${i+1}</span>
          <span class="filament-dot" style="background:${f.color_hex}"></span>
          <span style="flex:1;font-size:13px;font-weight:500">${f.name}</span>
          <span style="font-size:12px;color:var(--text3)">${f.print_count} impr.</span>
          <div style="width:100px"><div class="progress-wrap" style="height:5px">
            <div class="progress-fill" style="width:${p_}%"></div>
          </div></div>
          <span style="font-size:12px;font-weight:500;min-width:45px;text-align:right">${Math.round(f.total_g)}g</span>
        </div>`;
      }).join('')}
    </div>`:''} `;
}

// ── Consommation par matière ──────────────────────────────
let _consumptionChart = null;
let _consumptionDays  = 30;

async function renderStatsConsumption() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  let data;
  try { data = await API.get('/stats/consumption?days=' + _consumptionDays); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">Erreur : ' + e.message + '</div>'; return; }

  const { byMaterial, byDay, byMonth } = data;
  const totalG  = byMaterial.reduce(function(s, r) { return s + parseFloat(r.total_g||0); }, 0);
  const COLORS   = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  // Sélecteur de période
  const periodBtns = [7,30,90].map(function(d) {
    return '<button onclick="setConsumptionPeriod(' + d + ')" ' +
      'style="padding:4px 12px;font-size:12px;border-radius:var(--radius);border:0.5px solid var(--border2);' +
      'background:' + (_consumptionDays===d ? 'var(--accent)' : 'var(--bg3)') + ';' +
      'color:' + (_consumptionDays===d ? '#fff' : 'var(--text2)') + ';cursor:pointer;margin-right:4px">' +
      d + ' jours</button>';
  }).join('');

  // Résumé mois en cours
  const thisMonthTotal = byMonth.reduce(function(s,r){ return s + parseFloat(r.this_month_g||0); }, 0);

  let html = '<div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">' +
    '<span style="font-size:12px;color:var(--text3)">Période :</span>' + periodBtns + '</div>';

  // Métriques rapides
  html += '<div class="metrics-grid" style="margin-bottom:16px">';
  html += '<div class="metric-card"><div class="metric-label">Total consommé</div>' +
    '<div class="metric-value">' + Math.round(totalG) + '<span style="font-size:14px;color:var(--text2)">g</span></div>' +
    '<div class="metric-sub">sur ' + _consumptionDays + ' jours</div></div>';
  html += '<div class="metric-card"><div class="metric-label">Ce mois-ci</div>' +
    '<div class="metric-value">' + Math.round(thisMonthTotal) + '<span style="font-size:14px;color:var(--text2)">g</span></div>' +
    '<div class="metric-sub">' + byMonth.length + ' matière(s)</div></div>';
  html += '<div class="metric-card"><div class="metric-label">Moyenne / jour</div>' +
    '<div class="metric-value">' + (byDay.length ? Math.round(totalG / _consumptionDays) : 0) +
    '<span style="font-size:14px;color:var(--text2)">g</span></div>' +
    '<div class="metric-sub">' + byDay.length + ' jours actifs</div></div>';
  html += '</div>';

  // Graphique courbe par jour + répartition par matière
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';

  // Chart courbe
  html += '<div class="card"><div class="card-header"><span class="card-title">Consommation par jour</span></div>' +
    '<div style="position:relative;height:220px"><canvas id="chart-consumption-day"></canvas></div></div>';

  // Chart donut par matière
  html += '<div class="card"><div class="card-header"><span class="card-title">Répartition par matière</span></div>' +
    '<div style="position:relative;height:220px"><canvas id="chart-consumption-mat"></canvas></div></div>';

  html += '</div>';

  // Tableau par matière
  if (byMaterial.length) {
    html += '<div class="card"><div class="card-header"><span class="card-title">Détail par matière</span></div>' +
      '<table><thead><tr><th>Matière</th><th>Consommé</th><th>Ce mois</th><th>Impressions</th><th>Part</th></tr></thead><tbody>' +
      byMaterial.map(function(r, i) {
        const pct   = totalG > 0 ? Math.round((r.total_g / totalG) * 100) : 0;
        const mMonth = byMonth.find(function(m){ return m.material === r.material; });
        const col   = COLORS[i % COLORS.length];
        return '<tr>' +
          '<td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + col + ';margin-right:7px"></span>' +
          '<strong>' + r.material + '</strong></td>' +
          '<td>' + Math.round(r.total_g) + 'g</td>' +
          '<td style="color:var(--text2)">' + (mMonth ? Math.round(mMonth.this_month_g) + 'g' : '—') + '</td>' +
          '<td style="color:var(--text3)">' + r.print_count + ' impr.</td>' +
          '<td><div style="display:flex;align-items:center;gap:8px">' +
            '<div class="progress-wrap" style="width:80px;height:5px"><div class="progress-fill" style="width:' + pct + '%;background:' + col + '"></div></div>' +
            '<span style="font-size:12px">' + pct + '%</span></div></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  } else {
    html += '<div class="card" style="text-align:center;padding:32px;color:var(--text3)">Aucune donnée de consommation sur cette période.</div>';
  }

  content.innerHTML = html;

  // Créer les charts après le rendu DOM
  if (byDay.length) {
    try {
      const ctxDay = document.getElementById('chart-consumption-day')?.getContext('2d');
      if (ctxDay && typeof Chart !== 'undefined') {
        if (_consumptionChart) { _consumptionChart.destroy(); _consumptionChart = null; }
        _consumptionChart = new Chart(ctxDay, {
          type: 'line',
          data: {
            labels: byDay.map(function(d){ return d.day; }),
            datasets: [{ label: 'g/jour', data: byDay.map(function(d){ return Math.round(d.total_g); }),
              borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
              borderWidth: 2, pointRadius: 3, fill: true, tension: 0.3 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return v+'g'; } } } } }
        });
      }
    } catch(_) {}
  }

  if (byMaterial.length) {
    try {
      const ctxMat = document.getElementById('chart-consumption-mat')?.getContext('2d');
      if (ctxMat && typeof Chart !== 'undefined') {
        new Chart(ctxMat, {
          type: 'doughnut',
          data: {
            labels: byMaterial.map(function(r){ return r.material; }),
            datasets: [{ data: byMaterial.map(function(r){ return Math.round(r.total_g); }),
              backgroundColor: COLORS.slice(0, byMaterial.length), borderWidth: 2 }]
          },
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
        });
      }
    } catch(_) {}
  }
}

function setConsumptionPeriod(days) {
  _consumptionDays = days;
  renderStatsConsumption();
}

// ── Stats impressions — durée estimée vs réelle + réussite ──
async function renderStatsPrints() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  let data;
  try { data = await API.get('/stats/prints'); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>'; return; }

  const t = data.trend || {};
  const ecartPct = parseInt(t.avg_ecart_pct) || 0;
  const ecartColor = ecartPct > 15 ? '#ef4444' : ecartPct > 5 ? '#f59e0b' : '#10b981';
  const ecartLabel = ecartPct > 0 ? '+' + ecartPct + '% (plus long que prévu)'
                   : ecartPct < 0 ? ecartPct + '% (plus court que prévu)'
                   : 'Parfaitement précis';

  // ── Section durée ─────────────────────────────────────────
  let html = '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header"><span class="card-title">Durée estimée vs réelle</span></div>' +
    '<div class="metrics-grid" style="margin-bottom:16px">' +
      '<div class="metric-card"><div class="metric-label">Durée moy. estimée</div>' +
        '<div class="metric-value" style="font-size:18px">' + fmtDuration(t.avg_estimated||0) + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">Durée moy. réelle</div>' +
        '<div class="metric-value" style="font-size:18px">' + fmtDuration(t.avg_actual||0) + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">Écart moyen</div>' +
        '<div class="metric-value" style="font-size:18px;color:' + ecartColor + '">' + (ecartPct > 0 ? '+' : '') + ecartPct + '%</div>' +
        '<div class="metric-sub">' + ecartLabel + '</div></div>' +
      '<div class="metric-card"><div class="metric-label">Dépassements</div>' +
        '<div class="metric-value" style="font-size:18px;color:#ef4444">' + (t.over_count||0) + '</div>' +
        '<div class="metric-sub">sur ' + (t.total||0) + ' impressions</div></div>' +
    '</div>';

  // Graphique durée estimée vs réelle (30 dernières)
  if (data.durations && data.durations.length > 0) {
    const recent = data.durations.slice(0, 20).reverse();
    html += '<div style="position:relative;height:220px;margin-bottom:8px"><canvas id="duration-chart"></canvas></div>';
    html += '<div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:4px">' +
      '<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px">' +
      '<span style="width:12px;height:3px;background:#3b82f6;display:inline-block;border-radius:2px"></span>Estimée</span>' +
      '<span style="display:inline-flex;align-items:center;gap:4px">' +
      '<span style="width:12px;height:3px;background:#10b981;display:inline-block;border-radius:2px"></span>Réelle</span></div>';

    // Tableau des écarts
    html += '<div style="max-height:200px;overflow-y:auto;margin-top:8px"><table>' +
      '<thead><tr><th>Impression</th><th>Estimée</th><th>Réelle</th><th>Écart</th></tr></thead><tbody>' +
      data.durations.map(function(p) {
        const ep = parseInt(p.ecart_pct)||0;
        const col = ep > 15 ? '#ef4444' : ep > 5 ? '#f59e0b' : ep < -10 ? '#3b82f6' : '#10b981';
        return '<tr>' +
          '<td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + '</td>' +
          '<td style="font-size:12px">' + fmtDuration(p.estimated_duration) + '</td>' +
          '<td style="font-size:12px">' + fmtDuration(p.actual_duration) + '</td>' +
          '<td style="font-size:12px;font-weight:500;color:' + col + '">' + (ep>0?'+':'') + ep + '%</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';
  } else {
    html += '<p style="color:var(--text3);font-size:13px">Pas encore de données (nécessite des impressions avec durée estimée ET réelle renseignées).</p>';
  }
  html += '</div>';

  // ── Section réussite par imprimante ───────────────────────
  html += '<div class="grid-2" style="margin-bottom:16px">' +
    '<div class="card"><div class="card-header"><span class="card-title">Réussite par imprimante</span></div>';

  if (data.byPrinter && data.byPrinter.length) {
    html += '<table><thead><tr><th>Imprimante</th><th>Total</th><th>Réussite</th><th>Taux</th></tr></thead><tbody>' +
      data.byPrinter.map(function(p) {
        const rate = parseInt(p.success_rate)||0;
        const col  = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
        return '<tr>' +
          '<td style="font-size:12px;font-weight:500">' + p.printer_name + '</td>' +
          '<td style="font-size:12px">' + p.total + '</td>' +
          '<td style="font-size:12px">' + p.success + ' / ' + p.failed + ' ✕</td>' +
          '<td>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<div style="flex:1;height:6px;background:var(--border2);border-radius:3px">' +
                '<div style="width:' + rate + '%;height:100%;background:' + col + ';border-radius:3px"></div>' +
              '</div>' +
              '<span style="font-size:12px;font-weight:500;color:' + col + ';min-width:36px">' + rate + '%</span>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  } else {
    html += '<p style="color:var(--text3);font-size:13px">Aucune donnée.</p>';
  }
  html += '</div>';

  // ── Section réussite par filament ────────────────────────
  html += '<div class="card"><div class="card-header"><span class="card-title">Réussite par filament</span></div>';

  if (data.byFilament && data.byFilament.length) {
    html += '<table><thead><tr><th>Filament</th><th>Total</th><th>Taux</th></tr></thead><tbody>' +
      data.byFilament.map(function(f) {
        const rate = parseInt(f.success_rate)||0;
        const col  = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
        return '<tr>' +
          '<td style="font-size:12px">' +
            '<span style="display:flex;align-items:center;gap:6px">' +
              '<span style="width:10px;height:10px;border-radius:50%;background:' + (f.color_hex||'#888') + ';flex-shrink:0;display:inline-block"></span>' +
              '<span style="font-weight:500">' + f.filament_name + '</span>' +
              '<span style="color:var(--text3);font-size:11px">' + f.material + '</span>' +
            '</span>' +
          '</td>' +
          '<td style="font-size:12px">' + f.total + '</td>' +
          '<td>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<div style="flex:1;height:6px;background:var(--border2);border-radius:3px">' +
                '<div style="width:' + rate + '%;height:100%;background:' + col + ';border-radius:3px"></div>' +
              '</div>' +
              '<span style="font-size:12px;font-weight:500;color:' + col + ';min-width:36px">' + rate + '%</span>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  } else {
    html += '<p style="color:var(--text3);font-size:13px">Aucune donnée.</p>';
  }
  html += '</div></div>';

  content.innerHTML = html;

  // Graphique durée estimée vs réelle
  if (data.durations && data.durations.length > 0 && typeof Chart !== 'undefined') {
    try {
      const recent = data.durations.slice(0, 20).reverse();
      const ctx = document.getElementById('duration-chart');
      if (ctx) {
        new Chart(ctx.getContext('2d'), {
          type: 'bar',
          data: {
            labels: recent.map(function(p) {
              return p.name.length > 14 ? p.name.substring(0,14)+'…' : p.name;
            }),
            datasets: [
              {
                label: 'Estimée (min)',
                data: recent.map(function(p){ return p.estimated_duration; }),
                backgroundColor: 'rgba(59,130,246,0.6)',
                borderColor: '#3b82f6',
                borderWidth: 1,
              },
              {
                label: 'Réelle (min)',
                data: recent.map(function(p){ return p.actual_duration; }),
                backgroundColor: 'rgba(16,185,129,0.6)',
                borderColor: '#10b981',
                borderWidth: 1,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { ticks: { callback: function(v) { return fmtDuration(v); } } }
            }
          }
        });
      }
    } catch(_) {}
  }
}

// ── Stats coûts filament + électricité ─────────────────────────────────────
async function renderStatsCosts() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  // Sélecteur de période
  const existingDays = document.getElementById('costs-days-select');
  const days = existingDays ? existingDays.value : '30';

  let data;
  try { data = await API.get('/stats/costs?days=' + days); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>'; return; }

  const t = data.totals || {};
  const fmt = function(v) { return (Math.round(v * 100) / 100).toFixed(2); };

  // Prix kWh configurable
  let html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
    '<select id="costs-days-select" onchange="renderStatsCosts()" style="font-size:12px">' +
      '<option value="7"'  + (days==='7'  ?' selected':'') + '>7 jours</option>' +
      '<option value="30"' + (days==='30' ?' selected':'') + '>30 jours</option>' +
      '<option value="90"' + (days==='90' ?' selected':'') + '>90 jours</option>' +
      '<option value="365"'+ (days==='365'?' selected':'') + '>12 mois</option>' +
    '</select>' +
    '<span style="font-size:12px;color:var(--text3)">Prix kWh : <strong>' + data.kwh_price + ' €</strong></span>' +
    '<button class="btn btn-sm" onclick="openKwhSettings()">⚙ Modifier</button>' +
  '</div>';

  // Métriques globales
  html += '<div class="metrics-grid" style="margin-bottom:16px">' +
    '<div class="metric-card"><div class="metric-label">Coût filament</div>' +
      '<div class="metric-value" style="font-size:20px;color:var(--accent)">' + fmt(t.filament) + ' €</div></div>' +
    '<div class="metric-card"><div class="metric-label">Coût électricité</div>' +
      '<div class="metric-value" style="font-size:20px;color:#f59e0b">' + fmt(t.electricity) + ' €</div></div>' +
    '<div class="metric-card"><div class="metric-label">Coût total</div>' +
      '<div class="metric-value" style="font-size:20px;font-weight:600">' + fmt(t.total) + ' €</div></div>' +
    '<div class="metric-card"><div class="metric-label">Filament utilisé</div>' +
      '<div class="metric-value" style="font-size:20px">' + Math.round(t.filament_g) + ' g</div></div>' +
  '</div>';

  // Coûts par matière
  const matEntries = Object.entries(data.byMaterial || {});
  if (matEntries.length) {
    html += '<div class="grid-2" style="margin-bottom:16px">' +
      '<div class="card"><div class="card-header"><span class="card-title">Coût par matière</span></div>' +
      '<table><thead><tr><th>Matière</th><th>Impressions</th><th>Filament</th><th>Électricité</th><th>Total</th></tr></thead><tbody>' +
      matEntries.sort(function(a,b){ return (b[1].filament+b[1].electricity)-(a[1].filament+a[1].electricity); })
        .map(function(e) {
          const mat = e[0], d = e[1];
          const tot = d.filament + d.electricity;
          return '<tr>' +
            '<td style="font-weight:500">' + mat + '</td>' +
            '<td style="font-size:12px">' + d.count + '</td>' +
            '<td style="font-size:12px;color:var(--accent)">' + fmt(d.filament) + ' €</td>' +
            '<td style="font-size:12px;color:#f59e0b">' + fmt(d.electricity) + ' €</td>' +
            '<td style="font-size:12px;font-weight:500">' + fmt(tot) + ' €</td>' +
          '</tr>';
        }).join('') +
      '</tbody></table></div>';

    // Note si imprimantes sans consommation configurée
    const noPower = (data.prints || []).filter(function(p){ return !p.power_consumption; });
    html += '<div class="card"><div class="card-header"><span class="card-title">Informations</span></div>' +
      '<p style="font-size:13px;color:var(--text2);margin-bottom:10px">Le coût électricité est calculé sur la durée réelle de l\'impression.</p>' +
      (noPower.length > 0
        ? '<div style="background:var(--warning-bg);border-radius:var(--radius);padding:10px;font-size:12px;color:var(--warning)">' +
          '⚠ ' + noPower.length + ' impression(s) sans consommation électrique configurée sur l\'imprimante.' +
          ' Configurez la puissance (W) dans la fiche imprimante pour un calcul précis.</div>'
        : '<div style="font-size:12px;color:var(--success)">✓ Toutes les imprimantes ont une consommation configurée.</div>') +
      '</div></div>';
  }

  // Tableau des impressions avec coûts
  if (data.prints && data.prints.length) {
    html += '<div class="card"><div class="card-header"><span class="card-title">Détail par impression</span></div>' +
      '<div style="overflow-x:auto"><table><thead><tr>' +
        '<th>Impression</th><th>Date</th><th>Filament</th><th>Durée</th><th>Coût fil.</th><th>Coût élec.</th><th>Total</th>' +
      '</tr></thead><tbody>' +
      data.prints.map(function(p) {
        const tot = (parseFloat(p.cost_filament)||0) + (parseFloat(p.cost_electricity)||0);
        const dur = p.actual_duration ? Math.floor(p.actual_duration/60)+'h'+String(p.actual_duration%60).padStart(2,'0') : '—';
        return '<tr>' +
          '<td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + '</td>' +
          '<td style="font-size:11px;color:var(--text3);white-space:nowrap">' + fmtDate(p.created_at) + '</td>' +
          '<td style="font-size:12px;color:var(--text3)">' + (p.filament_name||'—') + '</td>' +
          '<td style="font-size:12px">' + dur + '</td>' +
          '<td style="font-size:12px;color:var(--accent)">' + fmt(parseFloat(p.cost_filament)||0) + ' €</td>' +
          '<td style="font-size:12px;color:#f59e0b">' + fmt(parseFloat(p.cost_electricity)||0) + ' €</td>' +
          '<td style="font-size:12px;font-weight:500">' + fmt(tot) + ' €</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div></div>';
  } else {
    html += '<div class="empty-state"><p>Aucune impression terminée sur cette période avec filament et imprimante renseignés.</p></div>';
  }

  content.innerHTML = html;
}

function openKwhSettings() {
  openModal(
    '<div class="form-group">' +
      '<label class="form-label">Prix du kWh (€)</label>' +
      '<input id="kwh-input" type="number" step="0.01" min="0" placeholder="0.20" style="width:200px">' +
    '</div>' +
    '<p style="font-size:12px;color:var(--text3);margin-top:8px">Ce tarif est utilisé pour calculer le coût électrique de toutes les impressions.</p>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveKwhPrice()">Enregistrer</button>' +
    '</div>',
    'Prix du kWh'
  );
  API.get('/settings').then(function(s) {
    const el = document.getElementById('kwh-input');
    if (el) el.value = s.electricity_price_kwh || '0.20';
  });
}

async function saveKwhPrice() {
  const val = document.getElementById('kwh-input')?.value;
  if (!val || isNaN(parseFloat(val))) return toast('Valeur invalide', 'error');
  try {
    await API.put('/settings', { electricity_price_kwh: val });
    toast('Prix kWh enregistré : ' + val + ' €', 'success');
    closeModal();
    renderStatsCosts();
  } catch(e) { toast(e.message, 'error'); }
}

// ── Historique consommation filament par mois/trimestre ───────────────────

let _historyMode    = 'month';
let _historyChart   = null;

async function renderStatsHistory() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  let data;
  try { data = await API.get('/stats/consumption-history?mode=' + _historyMode); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">Erreur : ' + e.message + '</div>'; return; }

  const { periods, materials } = data;
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  // Calculer les totaux globaux
  let grandTotal = 0;
  let maxPeriod  = { label: '—', total: 0 };
  periods.forEach(function(p) {
    const total = Object.values(p.materials).reduce(function(s, m) { return s + m.total_g; }, 0);
    grandTotal += total;
    if (total > maxPeriod.total) maxPeriod = { label: p.label, total: total };
  });
  const avgPerPeriod = periods.length ? Math.round(grandTotal / periods.length) : 0;

  // Sélecteur mois/trimestre
  const modeBtn = function(mode, label) {
    return '<button onclick="setHistoryMode(\'' + mode + '\')" style="padding:4px 14px;font-size:12px;' +
      'border-radius:var(--radius);border:0.5px solid var(--border2);cursor:pointer;' +
      'background:' + (_historyMode === mode ? 'var(--accent)' : 'var(--bg3)') + ';' +
      'color:' + (_historyMode === mode ? '#fff' : 'var(--text2)') + '">' + label + '</button>';
  };

  let html = '<div style="display:flex;gap:6px;margin-bottom:16px;align-items:center">' +
    '<span style="font-size:12px;color:var(--text3)">Affichage :</span>' +
    modeBtn('month',   'Par mois') +
    modeBtn('quarter', 'Par trimestre') +
    '</div>';

  // Métriques
  html += '<div class="metrics-grid" style="margin-bottom:16px">';
  html += '<div class="metric-card"><div class="metric-label">Total 12 mois</div>' +
    '<div class="metric-value">' + Math.round(grandTotal / 1000) + '<span style="font-size:14px;color:var(--text2)">kg</span></div></div>';
  html += '<div class="metric-card"><div class="metric-label">Moyenne / ' + (_historyMode === 'quarter' ? 'trimestre' : 'mois') + '</div>' +
    '<div class="metric-value">' + avgPerPeriod + '<span style="font-size:14px;color:var(--text2)">g</span></div></div>';
  html += '<div class="metric-card"><div class="metric-label">Pic de consommation</div>' +
    '<div class="metric-value" style="font-size:16px">' + maxPeriod.label + '</div>' +
    '<div class="metric-sub">' + Math.round(maxPeriod.total) + 'g</div></div>';
  html += '<div class="metric-card"><div class="metric-label">Matières distinctes</div>' +
    '<div class="metric-value">' + materials.length + '</div></div>';
  html += '</div>';

  // Graphique principal
  html += '<div class="card" style="margin-bottom:16px">' +
    '<div class="card-header"><span class="card-title">Consommation filament — ' +
    (_historyMode === 'quarter' ? '4 derniers trimestres' : '12 derniers mois') + '</span></div>' +
    '<div style="position:relative;height:280px"><canvas id="chart-history-main"></canvas></div>' +
    '</div>';

  // Tableau récapitulatif
  if (periods.length) {
    html += '<div class="card"><div class="card-header"><span class="card-title">Détail par période</span></div>' +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:var(--bg3)">' +
      '<th style="padding:8px 12px;text-align:left;font-weight:500;color:var(--text3)">Période</th>' +
      materials.map(function(m, i) {
        return '<th style="padding:8px 12px;text-align:right;font-weight:500;color:' + COLORS[i%COLORS.length] + '">' + m + '</th>';
      }).join('') +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:var(--text3)">Total</th>' +
      '</tr></thead><tbody>' +
      periods.map(function(p, pi) {
        const rowTotal = Object.values(p.materials).reduce(function(s, m) { return s + m.total_g; }, 0);
        return '<tr style="border-top:0.5px solid var(--border)">' +
          '<td style="padding:8px 12px;font-weight:500">' + p.label + '</td>' +
          materials.map(function(m) {
            const val = p.materials[m] ? Math.round(p.materials[m].total_g) : 0;
            return '<td style="padding:8px 12px;text-align:right;color:var(--text2)">' + (val ? val + 'g' : '—') + '</td>';
          }).join('') +
          '<td style="padding:8px 12px;text-align:right;font-weight:600">' + Math.round(rowTotal) + 'g</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div></div>';
  } else {
    html += '<div class="card" style="text-align:center;padding:32px;color:var(--text3)">Aucune donnée sur cette période.</div>';
  }

  content.innerHTML = html;

  // Créer le chart après rendu DOM
  setTimeout(function() {
    const ctx = document.getElementById('chart-history-main');
    if (!ctx || typeof Chart === 'undefined' || !periods.length) return;
    if (_historyChart) { _historyChart.destroy(); _historyChart = null; }

    const labels   = periods.map(function(p) { return p.label; });
    const datasets = materials.map(function(mat, i) {
      return {
        label:           mat,
        data:            periods.map(function(p) { return Math.round(p.materials[mat]?.total_g || 0); }),
        backgroundColor: COLORS[i % COLORS.length] + '33',
        borderColor:     COLORS[i % COLORS.length],
        borderWidth:     2,
        tension:         0.3,
        fill:            materials.length === 1,
        pointRadius:     4,
        pointHoverRadius: 6,
      };
    });

    // Ajouter une courbe total
    if (materials.length > 1) {
      datasets.unshift({
        label:           'Total',
        data:            periods.map(function(p) {
          return Math.round(Object.values(p.materials).reduce(function(s, m) { return s + m.total_g; }, 0));
        }),
        backgroundColor: 'transparent',
        borderColor:     'var(--text)',
        borderWidth:     2,
        borderDash:      [5, 5],
        tension:         0.3,
        fill:            false,
        pointRadius:     3,
      });
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';

    _historyChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        interaction:         { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { color: labelColor, boxWidth: 12, padding: 16 } },
          tooltip: {
            callbacks: {
              label: function(c) { return c.dataset.label + ' : ' + c.raw + 'g'; },
            }
          }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: labelColor } },
          y: {
            grid:  { color: gridColor },
            ticks: { color: labelColor, callback: function(v) { return v + 'g'; } },
            beginAtZero: true,
          }
        }
      }
    });
  }, 50);
}

function setHistoryMode(mode) {
  _historyMode = mode;
  renderStatsHistory();
}

// ── Activité d'impression par mois/trimestre ─────────────────────────────

let _activityMode  = 'month';
let _activityChart = null;
let _activityBarsChart = null;

async function renderStatsActivity() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  let data;
  try { data = await API.get('/stats/activity-history?mode=' + _activityMode); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">Erreur : ' + e.message + '</div>'; return; }

  const { periods, printers, meta } = data;
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  const modeBtn = function(mode, label) {
    return '<button onclick="setActivityMode(\'' + mode + '\')" style="padding:4px 14px;font-size:12px;' +
      'border-radius:var(--radius);border:0.5px solid var(--border2);cursor:pointer;' +
      'background:' + (_activityMode === mode ? 'var(--accent)' : 'var(--bg3)') + ';' +
      'color:' + (_activityMode === mode ? '#fff' : 'var(--text2)') + '">' + label + '</button>';
  };

  const rateColor = meta.rate12 >= 90 ? '#10b981' : meta.rate12 >= 70 ? '#f59e0b' : '#ef4444';

  let html = '<div style="display:flex;gap:6px;margin-bottom:16px;align-items:center">' +
    '<span style="font-size:12px;color:var(--text3)">Affichage :</span>' +
    modeBtn('month', 'Par mois') + modeBtn('quarter', 'Par trimestre') + '</div>';

  // Métriques
  html += '<div class="metrics-grid" style="margin-bottom:16px">';
  html += '<div class="metric-card"><div class="metric-label">Total 12 mois</div>' +
    '<div class="metric-value">' + meta.total12 + '<span style="font-size:14px;color:var(--text2)"> impr.</span></div></div>';
  html += '<div class="metric-card"><div class="metric-label">Taux de réussite</div>' +
    '<div class="metric-value" style="color:' + rateColor + '">' + meta.rate12 + '<span style="font-size:14px">%</span></div></div>';
  html += '<div class="metric-card"><div class="metric-label">Heures totales</div>' +
    '<div class="metric-value">' + meta.hours12 + '<span style="font-size:14px;color:var(--text2)">h</span></div></div>';
  html += '<div class="metric-card"><div class="metric-label">Pic d\'activité</div>' +
    '<div class="metric-value" style="font-size:16px">' + (meta.bestPeriod?.label || '—') + '</div>' +
    '<div class="metric-sub">' + (meta.bestPeriod?.total || 0) + ' impressions</div></div>';
  html += '</div>';

  // Graphiques côte à côte
  html += '<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">';

  // Chart principal — courbes réussies/échouées
  html += '<div class="card"><div class="card-header"><span class="card-title">Volume d\'impressions — ' +
    (_activityMode === 'quarter' ? '4 derniers trimestres' : '12 derniers mois') + '</span></div>' +
    '<div style="position:relative;height:260px"><canvas id="chart-activity-main"></canvas></div></div>';

  // Chart barres — heures
  html += '<div class="card"><div class="card-header"><span class="card-title">Heures d\'impression</span></div>' +
    '<div style="position:relative;height:260px"><canvas id="chart-activity-hours"></canvas></div></div>';

  html += '</div>';

  // Tableau récapitulatif
  if (periods.length) {
    html += '<div class="card"><div class="card-header"><span class="card-title">Détail par période</span></div>' +
      '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
      '<thead><tr style="background:var(--bg3)">' +
      '<th style="padding:8px 12px;text-align:left;font-weight:500;color:var(--text3)">Période</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:var(--text3)">Total</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:#10b981">Réussies</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:#ef4444">Échouées</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:var(--text3)">Annulées</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:#3b82f6">Taux</th>' +
      '<th style="padding:8px 12px;text-align:right;font-weight:500;color:var(--text3)">Heures</th>' +
      '</tr></thead><tbody>' +
      periods.map(function(p) {
        const rateCol = p.rate >= 90 ? '#10b981' : p.rate >= 70 ? '#f59e0b' : '#ef4444';
        return '<tr style="border-top:0.5px solid var(--border)">' +
          '<td style="padding:8px 12px;font-weight:500">' + p.label + '</td>' +
          '<td style="padding:8px 12px;text-align:right;font-weight:600">' + p.total + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:#10b981">' + p.success + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:' + (p.failed > 0 ? '#ef4444' : 'var(--text3)') + '">' + (p.failed || '—') + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:var(--text3)">' + (p.cancelled || '—') + '</td>' +
          '<td style="padding:8px 12px;text-align:right;font-weight:600;color:' + rateCol + '">' + p.rate + '%</td>' +
          '<td style="padding:8px 12px;text-align:right;color:var(--text2)">' + p.hours + 'h</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div></div>';
  } else {
    html += '<div class="card" style="text-align:center;padding:32px;color:var(--text3)">Aucune donnée sur cette période.</div>';
  }

  content.innerHTML = html;

  // Créer les charts
  setTimeout(function() {
    if (!periods.length || typeof Chart === 'undefined') return;

    const labels    = periods.map(function(p) { return p.label; });
    const isDark    = document.documentElement.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#9ca3af' : '#6b7280';

    const baseOpts = {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { color: labelColor, boxWidth: 12, padding: 14 } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: labelColor } },
        y: { grid: { color: gridColor }, ticks: { color: labelColor }, beginAtZero: true }
      }
    };

    // Chart principal : réussies + échouées + total
    const ctxMain = document.getElementById('chart-activity-main');
    if (ctxMain) {
      if (_activityChart) { _activityChart.destroy(); _activityChart = null; }
      _activityChart = new Chart(ctxMain, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Total',
              data:  periods.map(function(p) { return p.total; }),
              borderColor: '#6366f1', backgroundColor: 'transparent',
              borderWidth: 2, borderDash: [5,4], tension: 0.3, pointRadius: 4,
            },
            {
              label: 'Réussies',
              data:  periods.map(function(p) { return p.success; }),
              borderColor: '#10b981', backgroundColor: '#10b98120',
              borderWidth: 2, tension: 0.3, fill: true, pointRadius: 4,
            },
            {
              label: 'Échouées',
              data:  periods.map(function(p) { return p.failed; }),
              borderColor: '#ef4444', backgroundColor: '#ef444420',
              borderWidth: 2, tension: 0.3, fill: true, pointRadius: 4,
            },
          ]
        },
        options: {
          ...baseOpts,
          plugins: {
            ...baseOpts.plugins,
            tooltip: { callbacks: { label: function(c) { return c.dataset.label + ' : ' + c.raw; } } }
          },
          scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, color: labelColor, callback: function(v) { return v + ' impr.'; } } } }
        }
      });
    }

    // Chart barres : heures
    const ctxHours = document.getElementById('chart-activity-hours');
    if (ctxHours) {
      if (_activityBarsChart) { _activityBarsChart.destroy(); _activityBarsChart = null; }
      _activityBarsChart = new Chart(ctxHours, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Heures',
            data:  periods.map(function(p) { return p.hours; }),
            backgroundColor: '#3b82f680',
            borderColor:     '#3b82f6',
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          ...baseOpts,
          plugins: {
            ...baseOpts.plugins,
            tooltip: { callbacks: { label: function(c) { return c.raw + 'h'; } } }
          },
          scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, color: labelColor, callback: function(v) { return v + 'h'; } } } }
        }
      });
    }
  }, 50);
}

function setActivityMode(mode) {
  _activityMode = mode;
  renderStatsActivity();
}
