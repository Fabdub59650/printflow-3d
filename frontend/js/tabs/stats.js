async function renderStats() {
  document.getElementById('page-title').textContent = 'Statistiques';
  document.getElementById('topbar-actions').innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="exportExcel(this)" data-url="/api/excel/rentabilite" style="flex-shrink:0">&#8595; Excel</button>
      <button class="btn btn-sm" onclick="openMonthlyReportPicker()" style="flex-shrink:0;background:var(--accent-bg);color:var(--accent);border-color:var(--accent)" title="Rapport mensuel PDF">📄 PDF</button>
      <div style="width:1px;height:20px;background:var(--border);flex-shrink:0"></div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
        <span style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase">Activité :</span>
        <div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">
          <button class="filter-btn active" data-view="global"   onclick="switchStatsView('global',this)">Global</button>
          <button class="filter-btn" data-view="activity"  onclick="switchStatsView('activity',this)">Activité</button>
          <button class="filter-btn" data-view="compare"   onclick="switchStatsView('compare',this)">Comparer</button>
          <button class="filter-btn" data-view="history"   onclick="switchStatsView('history',this)">Historique</button>
        </div>
        <span style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-left:4px">Filaments :</span>
        <div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">
          <button class="filter-btn" data-view="filaments"    onclick="switchStatsView('filaments',this)">Filaments</button>
          <button class="filter-btn" data-view="consumption"  onclick="switchStatsView('consumption',this)">Conso.</button>
          <button class="filter-btn" data-view="stock-predict" onclick="switchStatsView('stock-predict',this)">Stock</button>
        </div>
        <span style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-left:4px">Finances :</span>
        <div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">
          <button class="filter-btn" data-view="costs"         onclick="switchStatsView('costs',this)">Coûts</button>
          <button class="filter-btn" data-view="profitability" onclick="switchStatsView('profitability',this)">Rentabilité</button>
        </div>
        <span style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-left:4px">Qualité :</span>
        <div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">
          <button class="filter-btn" data-view="prints"        onclick="switchStatsView('prints',this)">Impressions</button>
          <button class="filter-btn" data-view="success-rate"  onclick="switchStatsView('success-rate',this)">Taux</button>
        </div>
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
  if (view === 'compare')     renderStatsCompare();
  if (view === 'filaments')   renderStatsFilaments();
  if (view === 'prints')      renderStatsPrints();
  if (view === 'consumption') renderStatsConsumption();
  if (view === 'history')     renderStatsHistory();
  if (view === 'costs')           renderStatsCosts();
  if (view === 'profitability')   renderStatsProfitability();
  if (view === 'success-rate')   renderStatsSuccessRate();
  if (view === 'stock-predict')  renderStatsStockPrediction();
}

async function renderStatsGlobal() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  const stats = await API.get('/stats');
  const s     = stats.totals;
  const successRate = s.total_prints > 0 ? Math.round((s.success/s.total_prints)*100) : 0;

  const exportBar =
    '<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">' +
    '<button class="btn btn-sm" onclick="exportCSV(\'prints\')" title="Exporter les impressions en CSV">⬇ CSV Impressions</button>' +
    '<button class="btn btn-sm" onclick="exportCSV(\'filaments\')" title="Exporter les filaments en CSV">⬇ CSV Filaments</button>' +
    '<button class="btn btn-sm" onclick="exportCSV(\'stats\')" title="Exporter les stats en CSV">⬇ CSV Stats</button>' +
    '</div>';

  const metricsHtml =
    '<div class="metrics-grid">' +
      '<div class="metric-card">' +
        '<div class="metric-label">Total impressions</div>' +
        '<div class="metric-value">' + (s.total_prints||0) + '</div>' +
        '<div class="metric-sub">Taux de réussite : ' + successRate + '%</div>' +
      '</div>' +
      '<div class="metric-card">' +
        '<div class="metric-label">Filament consommé</div>' +
        '<div class="metric-value">' + ((s.total_grams||0)/1000).toFixed(2) + '<span style="font-size:14px"> kg</span></div>' +
        '<div class="metric-sub">' + Math.round(s.total_grams||0) + ' g au total</div>' +
      '</div>' +
      '<div class="metric-card">' +
        '<div class="metric-label">Temps d\'impression</div>' +
        '<div class="metric-value">' + Math.round(s.total_hours||0) + '<span style="font-size:14px"> h</span></div>' +
      '</div>' +
      '<div class="metric-card">' +
        '<div class="metric-label">Imprimantes</div>' +
        '<div class="metric-value">' + (stats.printerCount||0) + '</div>' +
        '<div class="metric-sub">' + (stats.filamentCount||0) + ' filaments</div>' +
      '</div>' +
    '</div>';

  const totalUsed = stats.byMaterial.reduce(function(s,m){ return s + (parseFloat(m.grams)||0); }, 0);
  const matHtml = stats.byMaterial.map(function(m) {
    const pct = totalUsed > 0 ? Math.round((m.grams/totalUsed)*100) : 0;
    return '<div style="margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
        '<span style="font-size:13px;font-weight:500">' + m.material + '</span>' +
        '<span style="font-size:12px;color:var(--text2)">' + Math.round(m.grams) + 'g · ' + m.count + ' impressions</span>' +
      '</div>' +
      '<div class="progress-wrap"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }).join('');

  const printerHtml = stats.byPrinter.map(function(p) {
    const rate = p.total_prints > 0 ? Math.round((p.total_success/p.total_prints)*100) : 0;
    return '<tr>' +
      '<td style="font-weight:500">' + p.name + '</td>' +
      '<td>' + (p.total_prints||0) + '</td>' +
      '<td>' + rate + '%</td>' +
      '<td>' + Math.round(p.total_grams||0) + 'g</td>' +
    '</tr>';
  }).join('');

  const maxMonth = Math.max(...(stats.byMonth||[]).map(function(m){ return m.count||0; }), 1);
  const monthHtml = stats.byMonth && stats.byMonth.length
    ? '<div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding:8px 0">' +
      stats.byMonth.map(function(m) {
        const h = Math.round((m.count/maxMonth)*100);
        return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0">' +
          '<div style="font-size:10px;color:var(--text2)">' + (m.count||0) + '</div>' +
          '<div style="width:100%;background:var(--accent);border-radius:3px 3px 0 0;height:' + h + '%;min-height:2px"></div>' +
          '<div style="font-size:9px;color:var(--text3);writing-mode:vertical-rl;transform:rotate(180deg)">' + m.month + '</div>' +
        '</div>';
      }).join('') +
      '</div>'
    : '<p style="color:var(--text3);font-size:13px">Aucune donnée</p>';

  const gridHtml =
    '<div class="grid-2" style="margin-bottom:16px">' +
      '<div class="card">' +
        '<div class="card-header"><span class="card-title">Par matière</span></div>' +
        matHtml +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header"><span class="card-title">Par imprimante</span></div>' +
        '<table><thead><tr><th>Imprimante</th><th>Impressions</th><th>Réussite</th><th>Filament</th></tr></thead>' +
        '<tbody>' + printerHtml + '</tbody></table>' +
      '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Activité mensuelle</span></div>' +
      monthHtml +
    '</div>';

  content.innerHTML = exportBar + metricsHtml + gridHtml;
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
async function renderStatsCosts(days) {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  // Sélecteur de période
  if (!days) {
    const existingDays = document.getElementById('costs-days-select');
    days = existingDays ? existingDays.value : '30';
  }

  let data;
  try { data = await API.get('/stats/costs?days=' + days); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>'; return; }

  const t = data.totals || {};
  const fmt = function(v) { return (Math.round(v * 100) / 100).toFixed(2); };

  // Prix kWh configurable
  let html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
    '<select id="costs-days-select" onchange="renderStatsCosts(this.value)" style="font-size:12px">' +
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

// ── Rapport mensuel PDF ───────────────────────────────────────────────────

function openMonthlyReportPicker() {
  const now   = new Date();
  const defMonth = now.getFullYear() + '-' + String(now.getMonth()).padStart(2,'0'); // mois précédent
  const curMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  openModal(
    '<div style="margin-bottom:16px">' +
      '<label class="form-label">Sélectionner le mois</label>' +
      '<input id="report-month" type="month" value="' + (now.getMonth() === 0 ? (now.getFullYear()-1)+'-12' : defMonth) + '" ' +
        'max="' + curMonth + '" style="font-size:13px;width:100%">' +
    '</div>' +
    '<p style="font-size:12px;color:var(--text3);margin-bottom:16px">' +
      'Le rapport s\'ouvrira dans une nouvelle fenêtre. Utilisez Ctrl+P / ⌘+P pour l\'imprimer ou l\'enregistrer en PDF.' +
    '</p>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="generateMonthlyReport(document.getElementById(\'report-month\').value)">📄 Générer le rapport</button>' +
    '</div>',
    'Rapport mensuel PDF'
  );
}

async function generateMonthlyReport(month) {
  if (!month) return toast('Sélectionnez un mois', 'error');
  closeModal();
  toast('Génération du rapport…');

  let data;
  try { data = await API.get('/report/monthly?month=' + month); }
  catch(e) { toast('Erreur : ' + e.message, 'error'); return; }

  const d    = data;
  const s    = d.stats;
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  const monthLabel = new Date(month + '-15').toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  const capitalize = function(str) { return str.charAt(0).toUpperCase() + str.slice(1); };

  // ── Comparaison mois précédent
  function delta(val, prev) {
    if (!prev || prev == 0) return '';
    const d = val - prev;
    const pct = Math.round(Math.abs(d) / prev * 100);
    return '<span style="font-size:11px;color:' + (d >= 0 ? '#10b981' : '#ef4444') + ';margin-left:6px">' +
      (d >= 0 ? '▲' : '▼') + ' ' + pct + '% vs mois préc.</span>';
  }

  // ── Barres de progression inline
  function bar(pct, color) {
    return '<div style="height:6px;background:#e5e7eb;border-radius:3px;margin-top:4px">' +
      '<div style="height:100%;width:' + Math.min(100,pct) + '%;background:' + color + ';border-radius:3px"></div></div>';
  }

  // ── HTML du rapport
  const html = `<!DOCTYPE html><html lang="fr"><head>
  <meta charset="utf-8">
  <title>Rapport ${capitalize(monthLabel)} — ${d.appName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#111;background:#fff;padding:32px}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}
    h2{font-size:15px;font-weight:600;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #e5e7eb;color:#374151}
    h3{font-size:13px;font-weight:600;margin-bottom:8px;color:#6b7280}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;
            padding-bottom:16px;border-bottom:2px solid #111}
    .subtitle{font-size:13px;color:#6b7280;margin-top:4px}
    .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .metric{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px}
    .metric-val{font-size:28px;font-weight:700;color:#111;margin-bottom:2px}
    .metric-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em}
    .metric-sub{font-size:11px;color:#6b7280;margin-top:4px}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;
       padding:6px 8px;border-bottom:1px solid #e5e7eb;font-weight:500}
    td{padding:7px 8px;border-bottom:1px solid #f3f4f6}
    tr:last-child td{border-bottom:none}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
    .done{background:#dcfce7;color:#16a34a}
    .failed{background:#fee2e2;color:#dc2626}
    .cancelled{background:#f3f4f6;color:#6b7280}
    .dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle}
    .gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
    .gallery-item{border-radius:6px;overflow:hidden;border:1px solid #e5e7eb}
    .gallery-item img{width:100%;height:140px;object-fit:cover;display:block}
    .gallery-caption{padding:6px 8px;font-size:11px;color:#374151;font-weight:500}
    .gallery-stars{color:#f59e0b;font-size:11px;padding:0 8px 6px}
    .page-break{page-break-before:always;padding-top:24px}
    .rate-bar{height:8px;background:#e5e7eb;border-radius:4px;margin-top:6px;overflow:hidden}
    .rate-fill{height:100%;border-radius:4px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;
            font-size:11px;color:#9ca3af;display:flex;justify-content:space-between}
    @media print{
      body{padding:16px}
      @page{margin:12mm;size:A4}
      .page-break{page-break-before:always}
    }
  </style>
</head><body>

<!-- EN-TÊTE -->
<div class="header">
  <div>
    <h1>${d.appName}</h1>
    <div class="subtitle">Rapport mensuel — ${capitalize(monthLabel)}</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#9ca3af">
    Généré le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}<br>
    ${d.dateFrom} → ${d.dateTo}
  </div>
</div>

<!-- PAGE 1 : RÉSUMÉ -->
<h2>📊 Résumé du mois</h2>
<div class="metrics">
  <div class="metric">
    <div class="metric-val">${s.total}</div>
    <div class="metric-label">Impressions</div>
    <div class="metric-sub">${delta(s.total, d.prevStats?.total)}</div>
  </div>
  <div class="metric">
    <div class="metric-val" style="color:${s.rate>=90?'#16a34a':s.rate>=70?'#d97706':'#dc2626'}">${s.rate}%</div>
    <div class="metric-label">Taux de réussite</div>
    <div class="metric-sub">${s.success} réussies · ${s.failed} échouées · ${s.cancelled} annulées</div>
  </div>
  <div class="metric">
    <div class="metric-val">${s.hours}h</div>
    <div class="metric-label">Heures d'impression</div>
    <div class="metric-sub">${delta(s.hours, d.prevStats?.hours)}</div>
  </div>
  <div class="metric">
    <div class="metric-val">${s.grams}g</div>
    <div class="metric-label">Filament consommé</div>
    <div class="metric-sub">${delta(s.grams, d.prevStats?.grams)}</div>
  </div>
  ${s.realCost > 0 ? `<div class="metric">
    <div class="metric-val" style="color:#16a34a">${parseFloat(s.realCost).toFixed(2)}€</div>
    <div class="metric-label">Coût réel total</div>
    <div class="metric-sub">Mat. ${parseFloat(s.realCostMat||0).toFixed(2)}€ · Élec. ${parseFloat(s.realCostElec||0).toFixed(2)}€</div>
    <div class="metric-sub" style="margin-top:4px">Moy. ${parseFloat(s.avgCostPrint||0).toFixed(2)}€/impression</div>
  </div>` : ''}
</div>

<div class="grid-2">
  <!-- Par imprimante -->
  <div class="card">
    <h3>🖨 Par imprimante</h3>
    ${d.printerStats.length ? d.printerStats.map(function(p, i) {
      const pct = s.total > 0 ? Math.round(p.count/s.total*100) : 0;
      return '<div style="margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px">' +
          '<span style="font-weight:500">' +
            '<span class="dot" style="background:' + COLORS[i%COLORS.length] + '"></span>' + p.name +
          '</span>' +
          '<span style="color:#6b7280">' + p.count + ' impr. · ' + p.hours + 'h</span>' +
        '</div>' +
        bar(pct, COLORS[i%COLORS.length]) +
      '</div>';
    }).join('') : '<p style="color:#9ca3af;font-size:12px">Aucune impression ce mois.</p>'}
  </div>

  <!-- Par matière -->
  <div class="card">
    <h3>🧵 Filaments utilisés</h3>
    ${d.topFilaments.length ? d.topFilaments.map(function(f, i) {
      const maxG = d.topFilaments[0].grams;
      const pct  = maxG > 0 ? Math.round(f.grams/maxG*100) : 0;
      return '<div style="margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px">' +
          '<span style="font-weight:500">' +
            '<span class="dot" style="background:' + (f.color_hex||COLORS[i]) + '"></span>' + f.name +
          '</span>' +
          '<span style="color:#6b7280">' + f.grams + 'g</span>' +
        '</div>' +
        bar(pct, f.color_hex||COLORS[i]) +
      '</div>';
    }).join('') : '<p style="color:#9ca3af;font-size:12px">Aucun filament utilisé.</p>'}
  </div>
</div>

${d.quotes.length || d.maintenance.length ? `
<!-- Devis & Maintenance -->
<div class="grid-2">
  ${d.quotes.length ? `<div class="card">
    <h3>📄 Devis du mois</h3>
    <table>
      <thead><tr><th>Client</th><th>Montant HT</th><th>Statut</th></tr></thead>
      <tbody>
        ${d.quotes.map(function(q) {
          const statusMap = {draft:'Brouillon',sent:'Envoyé',accepted:'Accepté',refused:'Refusé'};
          const colMap    = {accepted:'#16a34a',refused:'#dc2626',sent:'#2563eb',draft:'#6b7280'};
          return '<tr><td>' + (q.client_name||'—') + '</td>' +
            '<td style="font-weight:500">' + parseFloat(q.total_ht||0).toFixed(2) + ' €</td>' +
            '<td><span class="badge" style="background:' + (colMap[q.status]||'#6b7280') + '22;color:' + (colMap[q.status]||'#6b7280') + '">' + (statusMap[q.status]||q.status) + '</span></td></tr>';
        }).join('')}
      </tbody>
    </table>
    ${d.caAccepted > 0 ? '<div style="margin-top:10px;text-align:right;font-size:12px">CA accepté : <strong>' + d.caAccepted.toFixed(2) + ' €</strong></div>' : ''}
  </div>` : '<div></div>'}

  ${d.maintenance.length ? `<div class="card">
    <h3>🔧 Maintenance</h3>
    <table>
      <thead><tr><th>Imprimante</th><th>Type</th><th>Date</th></tr></thead>
      <tbody>
        ${d.maintenance.map(function(m) {
          return '<tr><td>' + (m.printer_name||'—') + '</td>' +
            '<td>' + (m.type||'').replace(/_/g,' ') + '</td>' +
            '<td style="color:#6b7280">' + new Date(m.performed_at).toLocaleDateString('fr-FR') + '</td></tr>';
        }).join('')}
      </tbody>
    </table>
  </div>` : '<div></div>'}
</div>` : ''}

<!-- PAGE 2 : COMPARAISON IMPRIMANTES -->
<div class="page-break">
<h2>🖨 Comparaison des imprimantes</h2>
${d.printerStats.length ? `
<table>
  <thead><tr>
    <th>Imprimante</th>
    <th style="text-align:right">Total</th>
    <th style="text-align:right">Réussies</th>
    <th style="text-align:right">Échouées</th>
    <th style="text-align:right">Taux</th>
    <th style="text-align:right">Heures</th>
    <th style="text-align:right">Filament</th>
    <th style="text-align:right">Note moy.</th>
  </tr></thead>
  <tbody>
    ${d.printerStats.map(function(p, i) {
      const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899'];
      const col    = COLORS[i % COLORS.length];
      const rate   = p.count > 0 ? Math.round(p.success / p.count * 100) : null;
      const rateCol = rate === null ? '#6b7280' : rate >= 90 ? '#16a34a' : rate >= 70 ? '#d97706' : '#dc2626';
      return '<tr>' +
        '<td style="font-weight:500">' +
          '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + col + ';margin-right:6px;vertical-align:middle"></span>' +
          p.name +
        '</td>' +
        '<td style="text-align:right;font-weight:600">' + (p.count||0) + '</td>' +
        '<td style="text-align:right;color:#16a34a">' + (p.success||0) + '</td>' +
        '<td style="text-align:right;color:' + (p.failed > 0 ? '#dc2626' : '#6b7280') + '">' + (p.failed||'—') + '</td>' +
        '<td style="text-align:right;font-weight:600;color:' + rateCol + '">' + (rate !== null ? rate + '%' : '—') + '</td>' +
        '<td style="text-align:right">' + p.hours + 'h</td>' +
        '<td style="text-align:right">' + (p.grams||0) + 'g</td>' +
        '<td style="text-align:right;color:#d97706">' + (p.avg_rating ? '★ ' + p.avg_rating : '—') + '</td>' +
      '</tr>';
    }).join('')}
  </tbody>
</table>

<!-- Barres visuelles par imprimante -->
<div style="margin-top:20px;display:grid;grid-template-columns:repeat(${Math.min(d.printerStats.length, 3)},1fr);gap:16px">
  ${d.printerStats.slice(0,6).map(function(p, i) {
    const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899'];
    const col    = COLORS[i % COLORS.length];
    const maxCount = Math.max(...d.printerStats.map(function(x){ return x.count||0; }), 1);
    const maxHours = Math.max(...d.printerStats.map(function(x){ return parseFloat(x.hours)||0; }), 1);
    const maxGrams = Math.max(...d.printerStats.map(function(x){ return parseInt(x.grams)||0; }), 1);
    const rate     = p.count > 0 ? Math.round(p.success / p.count * 100) : 0;
    return '<div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;border-top:3px solid ' + col + '">' +
      '<div style="font-size:13px;font-weight:600;margin-bottom:10px">' + p.name + '</div>' +
      '<div style="font-size:11px;color:#6b7280;margin-bottom:3px">Impressions</div>' +
      '<div style="font-size:18px;font-weight:700;margin-bottom:4px">' + (p.count||0) + '</div>' +
      '<div style="height:5px;background:#e5e7eb;border-radius:3px;margin-bottom:10px">' +
        '<div style="height:100%;width:' + Math.round((p.count||0)/maxCount*100) + '%;background:' + col + ';border-radius:3px"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">' +
        '<div>' +
          '<div style="color:#6b7280">Taux réussite</div>' +
          '<div style="font-weight:600;color:' + (rate>=90?'#16a34a':rate>=70?'#d97706':'#dc2626') + '">' + rate + '%</div>' +
        '</div>' +
        '<div>' +
          '<div style="color:#6b7280">Heures</div>' +
          '<div style="font-weight:600">' + p.hours + 'h</div>' +
        '</div>' +
        '<div>' +
          '<div style="color:#6b7280">Filament</div>' +
          '<div style="font-weight:600">' + (p.grams||0) + 'g</div>' +
        '</div>' +
        '<div>' +
          '<div style="color:#6b7280">Note moy.</div>' +
          '<div style="font-weight:600;color:#d97706">' + (p.avg_rating ? '★ ' + p.avg_rating : '—') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('')}
</div>` : '<p style="color:#9ca3af">Aucune donnée imprimante ce mois.</p>'}
</div>

<!-- PAGE 3 : LISTE DES IMPRESSIONS -->
<div class="page-break">
<h2>📋 Liste des impressions</h2>
${d.prints.length ? `
<table>
  <thead><tr><th>Nom</th><th>Imprimante</th><th>Filament</th><th>Durée</th><th>Consommé</th><th>Coût réel</th><th>Note</th><th>Statut</th></tr></thead>
  <tbody>
    ${d.prints.map(function(p) {
      const statusMap = {done:'Réussie',failed:'Échouée',cancelled:'Annulée'};
      const cls       = {done:'done',failed:'failed',cancelled:'cancelled'};
      const dur       = p.actual_duration ? Math.floor(p.actual_duration/60)+'h'+(p.actual_duration%60>0?p.actual_duration%60+'min':'') : '—';
      const stars     = p.rating ? '★'.repeat(p.rating)+'☆'.repeat(5-p.rating) : '—';
      return '<tr>' +
        '<td style="font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + '</td>' +
        '<td style="color:#6b7280">' + (p.printer_name||'—') + '</td>' +
        '<td>' + (p.filament_name ? '<span class="dot" style="background:' + (p.color_hex||'#ccc') + '"></span>' + p.filament_name : '—') + '</td>' +
        '<td style="color:#6b7280">' + dur + '</td>' +
        '<td style="color:#6b7280">' + (p.filament_used ? Math.round(p.filament_used)+'g' : '—') + '</td>' +
        '<td style="color:#16a34a;font-weight:500">' + (p.real_cost ? parseFloat(p.real_cost).toFixed(2)+'€' : '—') + '</td>' +
        '<td style="color:#f59e0b;font-size:11px">' + stars + '</td>' +
        '<td><span class="badge ' + (cls[p.status]||'') + '">' + (statusMap[p.status]||p.status) + '</span></td>' +
      '</tr>';
    }).join('')}
  </tbody>
</table>` : '<p style="color:#9ca3af">Aucune impression ce mois.</p>'}
</div>

${d.gallery.length ? `
<!-- PAGE 4 : GALERIE -->
<div class="page-break">
<h2>🖼 Galerie — Meilleures réalisations (4★ et 5★)</h2>
<div class="gallery-grid">
  ${d.gallery.map(function(p) {
    return '<div class="gallery-item">' +
      '<img src="/api/prints/' + p.id + '/photo" alt="' + p.name + '" onerror="this.style.display=\'none\'">' +
      '<div class="gallery-caption">' + p.name + '</div>' +
      '<div class="gallery-stars">' + '★'.repeat(p.rating||0) + '</div>' +
    '</div>';
  }).join('')}
</div>
</div>` : ''}

<!-- PAGE 5 : TAUX DE RÉUSSITE 12 MOIS -->
${d.successHistory && d.successHistory.length >= 3 ? `
<div class="page-break">
<h2>📈 Évolution du taux de réussite — 12 mois</h2>
<table>
  <thead><tr><th>Mois</th><th>Impressions</th><th>Réussies</th><th>Taux</th></tr></thead>
  <tbody>
    ${d.successHistory.slice().reverse().map(function(m) {
      const rate = parseFloat(m.rate||0);
      const col = rate>=90?'#16a34a':rate>=70?'#d97706':'#dc2626';
      return '<tr>' +
        '<td style="font-weight:500">' + m.month + '</td>' +
        '<td style="text-align:center">' + m.total + '</td>' +
        '<td style="text-align:center">' + m.success + '</td>' +
        '<td style="text-align:center;font-weight:700;color:' + col + '">' + rate + '%</td>' +
      '</tr>';
    }).join('')}
  </tbody>
</table>
</div>` : ''}

<!-- PAGE 6 : PRÉDICTION STOCK -->
${d.stockPred && d.stockPred.filter(function(p){ return parseFloat(p.stock_pct||100) < 25; }).length ? `
<div class="page-break">
<h2>📦 Filaments à surveiller</h2>
<table>
  <thead><tr><th>Filament</th><th>Matière</th><th>Stock (g)</th><th>Stock %</th><th>Conso./sem.</th></tr></thead>
  <tbody>
    ${d.stockPred.filter(function(p){ return parseFloat(p.stock_pct||100) < 25; }).map(function(p) {
      const pct = parseFloat(p.stock_pct||0);
      const col = pct<10?'#dc2626':pct<20?'#d97706':'#ca8a04';
      const icon = pct<10?'🔴':pct<20?'🟠':'🟡';
      return '<tr>' +
        '<td><span class="dot" style="background:' + (p.color_hex||'#888') + '"></span>' + p.name + '</td>' +
        '<td style="color:#6b7280">' + (p.material||'—') + '</td>' +
        '<td style="text-align:right">' + Math.round(p.weight_remaining||0) + 'g</td>' +
        '<td style="text-align:center;font-weight:700;color:' + col + '">' + icon + ' ' + pct + '%</td>' +
        '<td style="text-align:right;color:#6b7280">' + (parseFloat(p.weekly_rate_g||0) > 0 ? parseFloat(p.weekly_rate_g).toFixed(0)+'g' : 'Non utilisé') + '</td>' +
      '</tr>';
    }).join('')}
  </tbody>
</table>
</div>` : ''}

<!-- PIED DE PAGE -->
<div class="footer">
  <span>${d.appName} — Rapport ${capitalize(monthLabel)}</span>
  <span>Généré le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</span>
</div>

</body></html>`;

  // Ouvrir dans une nouvelle fenêtre
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  // Déclencher l'impression après chargement des images
  setTimeout(function() { win.print(); }, 800);
}

// ── Comparaison imprimantes ───────────────────────────────────────────────

let _compareDays = 30;

async function renderStatsCompare() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  let data;
  try { data = await API.get('/stats/compare-printers?days=' + _compareDays); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>'; return; }

  const { printers } = data;
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899'];

  const periodBtn = function(days, label) {
    return '<button onclick="_compareDays=' + days + ';renderStatsCompare()" ' +
      'style="padding:4px 14px;font-size:12px;border-radius:var(--radius);cursor:pointer;' +
      'border:0.5px solid var(--border2);' +
      'background:' + (_compareDays === days ? 'var(--accent)' : 'var(--bg3)') + ';' +
      'color:' + (_compareDays === days ? '#fff' : 'var(--text2)') + '">' + label + '</button>';
  };

  let html =
    '<div style="display:flex;gap:6px;margin-bottom:16px;align-items:center">' +
      '<span style="font-size:12px;color:var(--text3)">Période :</span>' +
      periodBtn(7,   '7 jours') +
      periodBtn(30,  '30 jours') +
      periodBtn(90,  '3 mois') +
      periodBtn(365, '12 mois') +
    '</div>';

  if (!printers.length) {
    content.innerHTML = html + '<div class="empty-state"><p>Aucune imprimante trouvée.</p></div>';
    return;
  }

  // Normaliser les métriques sur 100 pour le radar
  const maxTotal  = Math.max(...printers.map(function(p){ return parseFloat(p.total||0); }), 1);
  const maxHours  = Math.max(...printers.map(function(p){ return parseFloat(p.hours||0); }), 1);
  const maxGrams  = Math.max(...printers.map(function(p){ return parseFloat(p.grams||0); }), 1);
  const maxRating = Math.max(...printers.map(function(p){ return parseFloat(p.avg_rating||0); }), 1);

  const normalize = function(val, max) { return max > 0 ? Math.round(parseFloat(val||0) / max * 100) : 0; };

  // Trouver les champions
  const best = {
    rate:   printers.filter(function(p){ return p.rate !== null; }).sort(function(a,b){ return b.rate-a.rate; })[0]?.id,
    total:  printers.sort(function(a,b){ return b.total-a.total; })[0]?.id,
    hours:  printers.sort(function(a,b){ return b.hours-a.hours; })[0]?.id,
    rating: printers.filter(function(p){ return p.avg_rating; }).sort(function(a,b){ return b.avg_rating-a.avg_rating; })[0]?.id,
  };

  // Graphique radar + tableau
  html +=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">' +

      // Radar
      '<div class="card">' +
        '<div class="card-header"><span class="card-title">Vue radar</span></div>' +
        '<canvas id="chart-compare-radar" height="220"></canvas>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;justify-content:center">' +
          printers.map(function(p, i) {
            return '<span style="font-size:11px;display:flex;align-items:center;gap:4px">' +
              '<span style="width:10px;height:10px;border-radius:50%;background:' + COLORS[i%COLORS.length] + ';display:inline-block"></span>' +
              p.name + '</span>';
          }).join('') +
        '</div>' +
      '</div>' +

      // Métriques clés
      '<div class="card">' +
        '<div class="card-header"><span class="card-title">Champions</span></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
          [
            { label: '🏆 Plus d\'impressions', key: 'total', fmt: function(p){ return p.total + ' impressions'; } },
            { label: '✅ Meilleur taux reussite', key: 'rate', fmt: function(p){ return p.rate + '%'; } },
            { label: '⏱ Plus d\'heures', key: 'hours', fmt: function(p){ return p.hours + 'h'; } },
            { label: '⭐ Meilleure note', key: 'rating', fmt: function(p){ return p.avg_rating + '/5'; } },
          ].map(function(m) {
            const winner = printers.find(function(p){ return p.id === best[m.key]; });
            if (!winner) return '';
            const idx = printers.indexOf(winner);
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--radius)">' +
              '<span style="font-size:12px;color:var(--text3)">' + m.label + '</span>' +
              '<span style="font-size:13px;font-weight:600;color:' + COLORS[idx%COLORS.length] + '">' +
                winner.name + ' — ' + m.fmt(winner) +
              '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

    '</div>' +

    // Tableau comparatif
    '<div class="card">' +
      '<div class="card-header"><span class="card-title">Comparatif détaillé</span></div>' +
      '<div style="overflow-x:auto">' +
      '<table>' +
        '<thead><tr>' +
          '<th>Métrique</th>' +
          printers.map(function(p, i) {
            return '<th style="color:' + COLORS[i%COLORS.length] + '">' + p.name + '</th>';
          }).join('') +
        '</tr></thead>' +
        '<tbody>' +
          [
            { label: 'Impressions totales', key: 'total', fmt: function(v){ return v || '0'; } },
            { label: 'Réussies', key: 'success', fmt: function(v){ return v || '0'; } },
            { label: 'Échouées', key: 'failed', fmt: function(v){ return v || '0'; } },
            { label: 'Taux de réussite', key: 'rate', fmt: function(v){ return v !== null ? v + '%' : '—'; } },
            { label: 'Heures totales', key: 'hours', fmt: function(v){ return v ? v + 'h' : '—'; } },
            { label: 'Durée moyenne', key: 'avg_duration_label', fmt: function(v){ return v || '—'; } },
            { label: 'Filament consommé', key: 'grams', fmt: function(v){ return v ? Math.round(v) + 'g' : '—'; } },
            { label: 'Note moyenne', key: 'avg_rating', fmt: function(v){ return v ? v + '/5' : '—'; } },
          ].map(function(row, ri) {
            // Trouver le meilleur pour cette métrique
            const bestVal = Math.max(...printers.map(function(p){ return parseFloat(p[row.key]||0); }));
            return '<tr>' +
              '<td style="font-size:12px;color:var(--text3);font-weight:500">' + row.label + '</td>' +
              printers.map(function(p, i) {
                const val = p[row.key];
                const isBest = parseFloat(val||0) === bestVal && bestVal > 0;
                return '<td style="text-align:center;font-weight:' + (isBest?'700':'400') + ';color:' + (isBest?COLORS[i%COLORS.length]:'var(--text)') + '">' +
                  row.fmt(val) +
                '</td>';
              }).join('') +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
      '</div>' +
    '</div>';

  content.innerHTML = html;

  // Dessiner le radar Chart.js
  if (typeof Chart !== 'undefined') {
    const ctx = document.getElementById('chart-compare-radar');
    if (ctx) {
      new Chart(ctx.getContext('2d'), {
        type: 'radar',
        data: {
          labels: ['Impressions', 'Taux réussite', 'Heures', 'Filament', 'Note'],
          datasets: printers.map(function(p, i) {
            const color = COLORS[i % COLORS.length];
            return {
              label: p.name,
              data: [
                normalize(p.total,      maxTotal),
                p.rate !== null ? p.rate : 0,
                normalize(p.hours,      maxHours),
                normalize(p.grams,      maxGrams),
                normalize(p.avg_rating, maxRating),
              ],
              borderColor:     color,
              backgroundColor: color + '22',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: color,
            };
          }),
        },
        options: {
          responsive: true,
          scales: {
            r: {
              min: 0, max: 100,
              ticks: { display: false },
              pointLabels: { font: { size: 11 } },
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return ctx.dataset.label + ' : ' + ctx.parsed.r;
                }
              }
            }
          }
        }
      });
    }
  }

}


async function renderStatsProfitability(days) {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  if (!days) {
    const existingDays = document.getElementById('prof-days-select');
    days = existingDays ? existingDays.value : '30';
  }

  let data;
  try { data = await API.get('/stats/profitability?days=' + days); }
  catch(e) { content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>'; return; }

  const t   = data.totals || {};
  const fmt = function(v) { return (Math.round((v||0) * 100) / 100).toFixed(2); };
  const fmtG = function(g) { return g ? Math.round(g) + 'g' : '—'; };

  if (!data.prints || data.prints.length === 0) {
    content.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
        '<select id="prof-days-select" onchange="renderStatsProfitability(this.value)" style="font-size:12px">' +
          periodOptions(days) +
        '</select>' +
      '</div>' +
      '<div class="empty-state"><p>Aucune impression avec coût réel calculé sur cette période.</p>' +
        '<p style="font-size:12px;color:var(--text3);margin-top:8px">' +
          'Le coût réel est calculé automatiquement quand une impression passe en "Terminée" ' +
          'avec filament consommé et durée réelle renseignés.' +
        '</p></div>';
    return;
  }

  let html = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
    '<select id="prof-days-select" onchange="renderStatsProfitability(this.value)" style="font-size:12px">' +
      periodOptions(days) +
    '</select>' +
    '<span style="font-size:12px;color:var(--text3)">' + t.count + ' impression(s) avec coût réel calculé</span>' +
  '</div>';

  // ── Métriques globales ─────────────────────────────────────────────────
  html += '<div class="metrics-grid" style="margin-bottom:16px">' +
    metricCard('Coût total réel',   fmt(t.real_cost)        + ' €', 'var(--text)') +
    metricCard('Dont matière',      fmt(t.real_filament)    + ' €', 'var(--accent)') +
    metricCard('Dont électricité',  fmt(t.real_electricity) + ' €', '#f59e0b') +
    metricCard('Coût moyen/imp.',   fmt(t.avg_cost)         + ' €', '#8b5cf6') +
  '</div>';

  // ── Marge réelle si devis liés ─────────────────────────────────────────
  if (t.linked_count > 0 && t.real_margin !== null) {
    const marginCol = t.real_margin >= 0 ? 'var(--success)' : 'var(--danger)';
    const marginPct = t.quoted_total > 0
      ? Math.round(t.real_margin / t.quoted_total * 100) : 0;
    html +=
      '<div style="background:var(--bg3);border-radius:var(--radius);padding:16px;margin-bottom:16px;' +
        'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">' +
        '<div>' +
          '<div style="font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;' +
            'letter-spacing:0.05em;margin-bottom:4px">Marge réelle — ' + t.linked_count + ' impression(s) liée(s) à des devis</div>' +
          '<div style="font-size:13px;color:var(--text3)">' +
            'Estimé : <b>' + fmt(t.quoted_total) + ' €</b> · ' +
            'Coût réel : <b>' + fmt(t.real_cost) + ' €</b>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:28px;font-weight:700;color:' + marginCol + '">' +
            (t.real_margin >= 0 ? '+' : '') + fmt(t.real_margin) + ' €' +
          '</div>' +
          '<div style="font-size:13px;color:' + marginCol + '">' + marginPct + '%</div>' +
        '</div>' +
      '</div>';
  }

  // ── Par imprimante ─────────────────────────────────────────────────────
  const printerEntries = Object.entries(data.byPrinter || {})
    .sort(function(a,b){ return b[1].real_cost - a[1].real_cost; });

  if (printerEntries.length > 1) {
    html += '<div class="grid-2" style="margin-bottom:16px">' +
      '<div class="card"><div class="card-header"><span class="card-title">Coût réel par imprimante</span></div>' +
      '<table><thead><tr>' +
        '<th>Imprimante</th><th>Impressions</th><th>Matière</th><th>Élec.</th><th>Total</th><th>Moy./imp.</th>' +
      '</tr></thead><tbody>' +
      printerEntries.map(function(e) {
        const name = e[0], d = e[1];
        const avg  = d.count > 0 ? d.real_cost / d.count : 0;
        return '<tr>' +
          '<td style="font-weight:500">' + name + '</td>' +
          '<td style="font-size:12px;text-align:center">' + d.count + '</td>' +
          '<td style="font-size:12px;color:var(--accent)">' + fmt(d.real_filament) + ' €</td>' +
          '<td style="font-size:12px;color:#f59e0b">' + fmt(d.real_electricity) + ' €</td>' +
          '<td style="font-size:12px;font-weight:600">' + fmt(d.real_cost) + ' €</td>' +
          '<td style="font-size:12px;color:var(--text3)">' + fmt(avg) + ' €</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';

    // Par matière
    const matEntries = Object.entries(data.byMaterial || {})
      .sort(function(a,b){ return b[1].real_cost - a[1].real_cost; });
    html += '<div class="card"><div class="card-header"><span class="card-title">Coût réel par matière</span></div>' +
      '<table><thead><tr>' +
        '<th>Matière</th><th>Impressions</th><th>Filament</th><th>Coût total</th><th>Moy./imp.</th>' +
      '</tr></thead><tbody>' +
      matEntries.map(function(e) {
        const mat = e[0], d = e[1];
        const avg = d.count > 0 ? d.real_cost / d.count : 0;
        return '<tr>' +
          '<td style="font-weight:500">' + mat + '</td>' +
          '<td style="font-size:12px;text-align:center">' + d.count + '</td>' +
          '<td style="font-size:12px;color:var(--text3)">' + fmtG(d.filament_g) + '</td>' +
          '<td style="font-size:12px;font-weight:600">' + fmt(d.real_cost) + ' €</td>' +
          '<td style="font-size:12px;color:var(--text3)">' + fmt(avg) + ' €</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  // ── Évolution mensuelle ────────────────────────────────────────────────
  if (data.monthly && data.monthly.length > 1) {
    html += '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-header"><span class="card-title">Évolution mensuelle du coût réel</span></div>' +
      '<canvas id="chart-profitability" height="80"></canvas>' +
    '</div>';
  }

  // ── Tableau détail ─────────────────────────────────────────────────────
  html += '<div class="card"><div class="card-header"><span class="card-title">Détail par impression</span></div>' +
    '<div style="overflow-x:auto"><table><thead><tr>' +
      '<th>Impression</th><th>Date</th><th>Matière</th><th>Filament</th><th>Élec.</th>' +
      '<th>Coût réel</th><th>Devis lié</th><th>Marge</th>' +
    '</tr></thead><tbody>' +
    data.prints.map(function(p) {
      const rc  = parseFloat(p.real_cost || 0);
      const rfc = parseFloat(p.real_filament_cost || 0);
      const rec = parseFloat(p.real_electricity_cost || 0);
      const quoted = p.quote_unit_price
        ? parseFloat(p.quote_unit_price) * parseInt(p.quote_qty || 1) : null;
      const margin = quoted !== null ? quoted - rc : null;
      const mCol   = margin !== null ? (margin >= 0 ? 'var(--success)' : 'var(--danger)') : '';

      return '<tr>' +
        '<td style="font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + p.name + '</td>' +
        '<td style="font-size:11px;color:var(--text3);white-space:nowrap">' + fmtDate(p.created_at) + '</td>' +
        '<td style="font-size:12px;color:var(--text3)">' + (p.material||'—') + '</td>' +
        '<td style="font-size:12px;color:var(--accent)">' + fmt(rfc) + ' €</td>' +
        '<td style="font-size:12px;color:#f59e0b">' + fmt(rec) + ' €</td>' +
        '<td style="font-size:12px;font-weight:600">' + fmt(rc) + ' €</td>' +
        '<td style="font-size:11px;color:var(--text3)">' +
          (p.quote_client ? p.quote_client + ' · ' + fmt(quoted) + ' €' : '—') +
        '</td>' +
        '<td style="font-size:12px;font-weight:600;color:' + mCol + '">' +
          (margin !== null ? (margin >= 0 ? '+' : '') + fmt(margin) + ' €' : '—') +
        '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table></div></div>';

  content.innerHTML = html;

  // Graphique évolution mensuelle
  if (data.monthly && data.monthly.length > 1) {
    const ctx = document.getElementById('chart-profitability');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: data.monthly.map(function(m) { return m.month; }),
          datasets: [
            {
              label: 'Coût réel total (€)',
              data:  data.monthly.map(function(m) { return parseFloat(m.total_cost || 0); }),
              backgroundColor: 'rgba(59,130,246,0.7)',
              borderRadius: 4,
            },
            {
              label: 'Coût moyen/impression (€)',
              data:  data.monthly.map(function(m) { return parseFloat(m.avg_cost || 0); }),
              type:  'line',
              borderColor: '#10b981',
              backgroundColor: 'transparent',
              pointRadius: 4,
              tension: 0.3,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: function(v){ return v + ' €'; } } }
          }
        }
      });
    }
  }
}

function periodOptions(selected) {
  return [['7','7 jours'],['30','30 jours'],['90','90 jours'],['365','12 mois']].map(function(o) {
    return '<option value="' + o[0] + '"' + (selected === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
  }).join('');
}

function metricCard(label, value, color) {
  return '<div class="metric-card">' +
    '<div class="metric-label">' + label + '</div>' +
    '<div class="metric-value" style="font-size:20px;color:' + color + '">' + value + '</div>' +
  '</div>';
}

// ── Taux de réussite dans le temps ───────────────────────────────────────
async function renderStatsSuccessRate() {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  try {
    const data = await API.get('/stats/success-rate-history');
    const monthly = data.monthly || [];

    if (!monthly.length) {
      content.innerHTML = '<div class="empty-state"><p>Pas encore assez de données.</p></div>';
      return;
    }

    const trendLabel = { up: '📈 En amélioration', down: '📉 En baisse', stable: '➡ Stable' };
    const trendColor = { up: '#10b981', down: '#ef4444', stable: '#f59e0b' };
    const trend = data.trend || 'stable';
    const avgRate = monthly.length
      ? Math.round(monthly.reduce(function(s,m){ return s + parseFloat(m.rate||0); }, 0) / monthly.length * 10) / 10
      : 0;
    const lastRate = monthly.length ? parseFloat(monthly[monthly.length-1].rate) : 0;

    let html =
      // Métriques
      '<div class="metrics-grid" style="margin-bottom:16px">' +
        '<div class="metric-card"><div class="metric-label">Taux actuel</div>' +
          '<div class="metric-value" style="color:' + (lastRate>=90?'#10b981':lastRate>=70?'#f59e0b':'#ef4444') + '">' + lastRate + '<span style="font-size:14px">%</span></div></div>' +
        '<div class="metric-card"><div class="metric-label">Moyenne 12 mois</div>' +
          '<div class="metric-value">' + avgRate + '<span style="font-size:14px">%</span></div></div>' +
        '<div class="metric-card"><div class="metric-label">Tendance</div>' +
          '<div class="metric-value" style="font-size:16px;color:' + (trendColor[trend]||'#6b7280') + '">' + (trendLabel[trend]||'—') + '</div></div>' +
        '<div class="metric-card"><div class="metric-label">Total impressions</div>' +
          '<div class="metric-value">' + monthly.reduce(function(s,m){ return s+parseInt(m.total||0); },0) + '</div></div>' +
      '</div>' +

      // Graphique
      '<div class="card" style="margin-bottom:16px">' +
        '<div class="card-header"><span class="card-title">Évolution du taux de réussite — 12 mois</span></div>' +
        '<canvas id="chart-success-rate" height="100"></canvas>' +
      '</div>' +

      // Tableau détail
      '<div class="card"><div class="card-header"><span class="card-title">Détail mensuel</span></div>' +
        '<table><thead><tr>' +
          '<th>Mois</th><th>Impressions</th><th>Réussies</th><th>Échouées</th><th>Taux %</th><th>Heures</th><th>Filament</th>' +
        '</tr></thead><tbody>' +
        monthly.slice().reverse().map(function(m) {
          const rate = parseFloat(m.rate||0);
          const rCol = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
          return '<tr>' +
            '<td style="font-weight:500">' + m.month + '</td>' +
            '<td style="text-align:center">' + m.total + '</td>' +
            '<td style="text-align:center;color:#10b981">' + m.success + '</td>' +
            '<td style="text-align:center;color:#ef4444">' + (m.failed||0) + '</td>' +
            '<td style="text-align:center;font-weight:700;color:' + rCol + '">' + rate + '%</td>' +
            '<td style="text-align:right;color:var(--text3)">' + (m.hours||0) + 'h</td>' +
            '<td style="text-align:right;color:var(--text3)">' + (m.filament_g ? Math.round(m.filament_g)+'g' : '—') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div>';

    content.innerHTML = html;

    // Graphique Chart.js
    if (typeof Chart !== 'undefined') {
      const ctx = document.getElementById('chart-success-rate');
      if (ctx) {
        new Chart(ctx.getContext('2d'), {
          type: 'line',
          data: {
            labels: monthly.map(function(m){ return m.month; }),
            datasets: [
              {
                label: 'Taux de réussite %',
                data:  monthly.map(function(m){ return parseFloat(m.rate||0); }),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: monthly.map(function(m){
                  const r = parseFloat(m.rate||0);
                  return r >= 90 ? '#10b981' : r >= 70 ? '#f59e0b' : '#ef4444';
                }),
                tension: 0.3,
                fill: true,
              },
              {
                label: 'Objectif 90%',
                data:  monthly.map(function(){ return 90; }),
                borderColor: 'rgba(16,185,129,0.4)',
                borderDash: [5, 5],
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                min: 0, max: 100,
                ticks: { callback: function(v){ return v + '%'; } }
              }
            },
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    const m = monthly[ctx.dataIndex];
                    if (!m) return ctx.dataset.label + ': ' + ctx.parsed.y + '%';
                    return ctx.dataset.label + ': ' + ctx.parsed.y + '% (' + m.success + '/' + m.total + ')';
                  }
                }
              }
            }
          }
        });
      }
    }
  } catch(e) {
    content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>';
  }
}

// ── Prédiction épuisement stock filaments ────────────────────────────────
async function renderStatsStockPrediction(days) {
  const content = document.getElementById('content');
  content.innerHTML = '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  if (!days) {
    const existingDays = document.getElementById('stock-pred-days');
    days = existingDays ? existingDays.value : '30';
  }

  try {
    const data = await API.get('/stats/stock-prediction?days=' + days);
    const preds = data.predictions || [];

    const active = preds.filter(function(p){ return p.stock_pct > 0; });
    const critical = active.filter(function(p){ return p.status === 'critical'; });
    const low      = active.filter(function(p){ return p.status === 'low'; });
    const warning  = active.filter(function(p){ return p.status === 'warning'; });

    const statusIcon  = { critical:'🔴', low:'🟠', warning:'🟡', ok:'🟢' };
    const statusLabel = { critical:'Critique (< 10%)', low:'Faible (< 20%)', warning:'Attention (< 4 semaines)', ok:'OK' };
    const statusColor = { critical:'#ef4444', low:'#f59e0b', warning:'#f59e0b', ok:'#10b981' };

    let html =
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">' +
        '<select id="stock-pred-days" onchange="renderStatsStockPrediction(this.value)" style="font-size:12px">' +
          [['7','7 jours'],['14','14 jours'],['30','30 jours'],['60','60 jours'],['90','90 jours']].map(function(o){
            return '<option value="' + o[0] + '"' + (days===o[0]?' selected':'') + '>Période : ' + o[1] + '</option>';
          }).join('') +
        '</select>' +
        '<span style="font-size:12px;color:var(--text3)">Basé sur la consommation des ' + days + ' derniers jours</span>' +
      '</div>';

    // Résumé alertes
    if (critical.length || low.length || warning.length) {
      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">';
      if (critical.length) html += '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:20px">🔴</div><div style="font-weight:600;color:#ef4444">' + critical.length + ' critique' + (critical.length>1?'s':'') + '</div></div>';
      if (low.length)      html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:20px">🟠</div><div style="font-weight:600;color:#f59e0b">' + low.length + ' faible' + (low.length>1?'s':'') + '</div></div>';
      if (warning.length)  html += '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:var(--radius);padding:12px;text-align:center"><div style="font-size:20px">🟡</div><div style="font-weight:600;color:#f59e0b">' + warning.length + ' à surveiller</div></div>';
      html += '</div>';
    }

    // Tableau principal
    html += '<div class="card"><div class="card-header"><span class="card-title">Prédiction par filament</span></div>' +
      '<table><thead><tr>' +
        '<th>Filament</th><th>Matière</th><th>Stock</th><th>%</th>' +
        '<th>Consommation/semaine</th><th>Semaines restantes</th><th>Épuisement estimé</th><th>Statut</th>' +
      '</tr></thead><tbody>' +
      active.map(function(p) {
        const col = statusColor[p.status] || 'var(--text3)';
        const pctBar = '<div style="display:flex;align-items:center;gap:6px">' +
          '<div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">' +
            '<div style="height:100%;width:' + Math.min(100,p.stock_pct) + '%;background:' + col + ';border-radius:3px"></div>' +
          '</div>' +
          '<span style="font-size:12px;color:' + col + ';font-weight:600">' + p.stock_pct + '%</span>' +
        '</div>';

        return '<tr>' +
          '<td>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<span style="width:8px;height:8px;border-radius:50%;background:' + (p.color_hex||'#888') + ';flex-shrink:0;display:inline-block"></span>' +
              '<span style="font-weight:500;font-size:13px">' + p.name + '</span>' +
            '</div>' +
          '</td>' +
          '<td style="font-size:12px;color:var(--text3)">' + (p.material||'—') + '</td>' +
          '<td style="font-size:12px;font-weight:500">' + Math.round(p.weight_remaining) + 'g</td>' +
          '<td>' + pctBar + '</td>' +
          '<td style="font-size:12px;text-align:center">' +
            (p.weekly_rate_g > 0 ? '<span style="color:var(--text2)">' + p.weekly_rate_g + 'g/sem</span>' : '<span style="color:var(--text3)">Non utilisé</span>') +
          '</td>' +
          '<td style="font-size:12px;text-align:center;font-weight:600;color:' + col + '">' +
            (p.weeks_left !== null ? (p.weeks_left < 1 ? '< 1 semaine' : p.weeks_left + ' sem.') : '—') +
          '</td>' +
          '<td style="font-size:12px;color:var(--text3)">' +
            (p.depletion_date ? new Date(p.depletion_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—') +
          '</td>' +
          '<td>' +
            '<span style="font-size:11px;font-weight:500;color:' + col + '">' +
              (statusIcon[p.status]||'') + ' ' + (statusLabel[p.status]||'') +
            '</span>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>';

    // Filaments non utilisés
    const unused = preds.filter(function(p){ return p.weekly_rate_g === 0 && p.stock_pct > 0; });
    if (unused.length) {
      html += '<div style="margin-top:12px;font-size:12px;color:var(--text3);text-align:center">' +
        unused.length + ' filament' + (unused.length>1?'s':'') + ' non utilisé' + (unused.length>1?'s':'') +
        ' sur la période (' + unused.map(function(u){ return u.name; }).join(', ') + ')' +
      '</div>';
    }

    content.innerHTML = html;
  } catch(e) {
    content.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>';
  }
}

