// schedule.js — Planning d'impression (vue filtrée sur prints avec status='planned')

let _schedView = 'list'; // 'list' | 'month' | 'week'
let _schedDate = new Date(); // date de navigation calendrier

function fmtDateTimeSched(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }) +
    ' à ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
}

function isOverdueSched(p) {
  return p.status === 'planned' && p.planned_at && new Date(p.planned_at) < new Date();
}

async function renderSchedule() {
  document.getElementById('page-title').textContent = 'Planning';

  // Topbar avec toggle de vue
  document.getElementById('topbar-actions').innerHTML =
    '<div style="display:flex;gap:6px;align-items:center">' +
      '<div style="display:flex;border:0.5px solid var(--border2);border-radius:var(--radius);overflow:hidden">' +
        '<button onclick="setSchedView(\'list\')" style="padding:5px 12px;font-size:12px;border:none;cursor:pointer;' +
          'background:' + (_schedView==='list' ? 'var(--text)' : 'var(--bg3)') + ';' +
          'color:' + (_schedView==='list' ? 'var(--bg)' : 'var(--text2)') + '">≡ Liste</button>' +
        '<button onclick="setSchedView(\'week\')" style="padding:5px 12px;font-size:12px;border:none;cursor:pointer;' +
          'background:' + (_schedView==='week' ? 'var(--text)' : 'var(--bg3)') + ';' +
          'color:' + (_schedView==='week' ? 'var(--bg)' : 'var(--text2)') + '">Semaine</button>' +
        '<button onclick="setSchedView(\'month\')" style="padding:5px 12px;font-size:12px;border:none;cursor:pointer;' +
          'background:' + (_schedView==='month' ? 'var(--text)' : 'var(--bg3)') + ';' +
          'color:' + (_schedView==='month' ? 'var(--bg)' : 'var(--text2)') + '">Mois</button>' +
      '</div>' +
      '<button class="btn btn-primary" onclick="openPrintForm(null,null,\'planned\')">+ Planifier</button>' +
    '</div>';

  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  const [allPrints, bobineAlerts] = await Promise.all([
    API.get('/prints?limit=500'),
    API.get('/alerts/bobines').catch(function() { return []; }),
  ]);

  window._schedBobineAlerts = {};
  (bobineAlerts || []).forEach(function(a) {
    window._schedBobineAlerts[a.print_id] = a;
  });

  const planned = allPrints.filter(function(p) {
    return p.status === 'planned' || p.status === 'printing' || p.status === 'paused';
  });

  window._schedPlanned = planned;

  if (_schedView === 'list')  renderScheduleList(planned);
  if (_schedView === 'month') renderScheduleMonth(planned);
  if (_schedView === 'week')  renderScheduleWeek(planned);
}

function setSchedView(view) {
  _schedView = view;
  renderSchedule();
}

// ── Vue Liste (existante) ─────────────────────────────────────────────────

function renderScheduleList(prints) {
  const container = document.getElementById('content');

  if (!prints.length) {
    container.innerHTML =
      '<div class="empty-state"><p>Aucune impression planifiée.</p>' +
      '<button class="btn btn-primary" onclick="openPrintForm(null,null,\'planned\')">+ Planifier une impression</button>' +
      '</div>';
    return;
  }

  const now         = new Date();
  const overdue     = prints.filter(function(p) { return isOverdueSched(p); });
  const inprogress  = prints.filter(function(p) { return p.status === 'printing' || p.status === 'paused'; });
  const upcoming    = prints.filter(function(p) { return p.status === 'planned' && p.planned_at && new Date(p.planned_at) >= now; });
  const unscheduled = prints.filter(function(p) { return p.status === 'planned' && !p.planned_at; });

  function renderGroup(icon, title, items) {
    if (!items.length) return '';
    return '<div style="margin-bottom:24px">' +
      '<div style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;' +
      'letter-spacing:0.05em;margin-bottom:10px">' + icon + ' ' + title + '</div>' +
      items.map(schedPrintCard).join('') +
    '</div>';
  }

  container.innerHTML =
    renderGroup('⚠', 'En retard', overdue) +
    renderGroup('🔄', 'En cours', inprogress) +
    renderGroup('📅', 'À venir', upcoming) +
    (unscheduled.length ? renderGroup('📋', 'Sans date', unscheduled) : '');
}

// ── Vue Mois ──────────────────────────────────────────────────────────────

// Couleurs par imprimante (cohérentes entre les deux vues)
const PRINTER_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#06b6d4','#84cc16'];
function getPrinterColor(printerId) {
  if (!printerId) return '#6b7280';
  const keys = Object.keys(window._printerColorMap || {});
  if (!(window._printerColorMap)) window._printerColorMap = {};
  if (!window._printerColorMap[printerId]) {
    window._printerColorMap[printerId] = PRINTER_COLORS[Object.keys(window._printerColorMap).length % PRINTER_COLORS.length];
  }
  return window._printerColorMap[printerId];
}

function renderScheduleMonth(prints) {
  const container = document.getElementById('content');
  const year  = _schedDate.getFullYear();
  const month = _schedDate.getMonth();

  const monthName = new Date(year, month, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);

  // Lundi = 0, ..., Dimanche = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  // Indexer les impressions par date
  const byDay = {};
  prints.forEach(function(p) {
    if (!p.planned_at) return;
    const key = p.planned_at.slice(0,10);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(p);
  });

  // Légende imprimantes
  const printerIds = [...new Set(prints.filter(function(p) { return p.printer_id; }).map(function(p) { return p.printer_id; }))];
  const printerNames = {};
  prints.forEach(function(p) { if (p.printer_id && p.printer_name) printerNames[p.printer_id] = p.printer_name; });

  const legend = printerIds.length ? '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;font-size:12px">' +
    printerIds.map(function(id) {
      return '<span style="display:flex;align-items:center;gap:5px">' +
        '<span style="width:10px;height:10px;border-radius:50%;background:' + getPrinterColor(id) + ';display:inline-block"></span>' +
        (printerNames[id]||'Inconnue') + '</span>';
    }).join('') + '</div>' : '';

  // Jours de la semaine
  const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  let html = '<div style="background:var(--bg2);border-radius:var(--radius-lg);border:0.5px solid var(--border2);overflow:hidden">' +

    // Navigation
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;' +
      'border-bottom:0.5px solid var(--border2)">' +
      '<button onclick="schedNavMonth(-1)" style="border:none;background:none;cursor:pointer;' +
        'font-size:20px;color:var(--text2);padding:4px 8px">‹</button>' +
      '<span style="font-size:15px;font-weight:600;text-transform:capitalize">' + monthName + '</span>' +
      '<button onclick="schedNavMonth(1)" style="border:none;background:none;cursor:pointer;' +
        'font-size:20px;color:var(--text2);padding:4px 8px">›</button>' +
    '</div>' +

    // Entêtes jours
    '<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:0.5px solid var(--border2)">' +
    days.map(function(d, i) {
      return '<div style="padding:8px;text-align:center;font-size:11px;font-weight:600;' +
        'color:' + (i >= 5 ? 'var(--text3)' : 'var(--text2)') + '">' + d + '</div>';
    }).join('') +
    '</div>' +

    // Grille jours
    '<div style="display:grid;grid-template-columns:repeat(7,1fr)">';

  // Cellules vides avant le 1er
  for (let i = 0; i < startDow; i++) {
    html += '<div style="min-height:90px;border-right:0.5px solid var(--border);' +
      'border-bottom:0.5px solid var(--border);background:var(--bg3);opacity:0.5"></div>';
  }

  const todayStr = new Date().toISOString().slice(0,10);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const isToday = dateStr === todayStr;
    const dow = (startDow + d - 1) % 7;
    const isWeekend = dow >= 5;
    const dayPrints = byDay[dateStr] || [];

    html += '<div style="min-height:90px;padding:6px;' +
      'border-right:0.5px solid var(--border);border-bottom:0.5px solid var(--border);' +
      'background:' + (isToday ? 'var(--accent-bg)' : isWeekend ? 'var(--bg3)' : 'var(--bg2)') + '">' +

      '<div style="font-size:12px;font-weight:' + (isToday ? '700' : '400') + ';' +
        'color:' + (isToday ? 'var(--accent)' : isWeekend ? 'var(--text3)' : 'var(--text2)') + ';' +
        'margin-bottom:4px;display:flex;align-items:center;justify-content:space-between">' +
        '<span>' + d + '</span>' +
        (isToday ? '<span style="font-size:9px;background:var(--accent);color:#fff;border-radius:3px;padding:0 4px">Auj.</span>' : '') +
      '</div>' +

      dayPrints.map(function(p) {
        const col = getPrinterColor(p.printer_id);
        const overdue = isOverdueSched(p);
        const alert = window._schedBobineAlerts && window._schedBobineAlerts[p.id];
        return '<div onclick="openPrintForm(' + p.id + ')" ' +
          'title="' + p.name + (p.printer_name ? ' — ' + p.printer_name : '') + '"' +
          'style="font-size:10px;padding:2px 6px;border-radius:3px;margin-bottom:2px;cursor:pointer;' +
          'background:' + col + '22;border-left:2px solid ' + col + ';' +
          'color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
          'display:flex;align-items:center;gap:4px">' +
          (overdue ? '⚠ ' : '') +
          (alert ? (alert.severity === 'critical' ? '🔴 ' : '🟡 ') : '') +
          p.name +
        '</div>';
      }).join('') +

      (dayPrints.length === 0 ? '' : '') +
    '</div>';
  }

  // Cellules vides après le dernier jour
  const totalCells = startDow + lastDay.getDate();
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 0; i < remaining; i++) {
    html += '<div style="min-height:90px;border-right:0.5px solid var(--border);' +
      'border-bottom:0.5px solid var(--border);background:var(--bg3);opacity:0.5"></div>';
  }

  html += '</div></div>';
  container.innerHTML = legend + html;
}

function schedNavMonth(dir) {
  _schedDate = new Date(_schedDate.getFullYear(), _schedDate.getMonth() + dir, 1);
  renderScheduleMonth(window._schedPlanned || []);
}

// ── Vue Semaine ───────────────────────────────────────────────────────────

function renderScheduleWeek(prints) {
  const container = document.getElementById('content');

  // Trouver le lundi de la semaine courante
  const cur = new Date(_schedDate);
  const dow = cur.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  cur.setDate(cur.getDate() + diff);

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(cur);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const weekLabel = weekDays[0].toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) +
    ' – ' + weekDays[6].toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });

  // Indexer par date
  const byDay = {};
  prints.forEach(function(p) {
    if (!p.planned_at) return;
    const key = p.planned_at.slice(0,10);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(p);
  });

  const todayStr = new Date().toISOString().slice(0,10);
  const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  let html = '<div style="background:var(--bg2);border-radius:var(--radius-lg);border:0.5px solid var(--border2);overflow:hidden">' +

    // Navigation
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;' +
      'border-bottom:0.5px solid var(--border2)">' +
      '<button onclick="schedNavWeek(-1)" style="border:none;background:none;cursor:pointer;' +
        'font-size:20px;color:var(--text2);padding:4px 8px">‹</button>' +
      '<span style="font-size:15px;font-weight:600">Semaine du ' + weekLabel + '</span>' +
      '<button onclick="schedNavWeek(1)" style="border:none;background:none;cursor:pointer;' +
        'font-size:20px;color:var(--text2);padding:4px 8px">›</button>' +
    '</div>' +

    // Colonnes
    '<div style="display:grid;grid-template-columns:repeat(7,1fr)">';

  weekDays.forEach(function(day, i) {
    const dateStr = day.toISOString().slice(0,10);
    const isToday = dateStr === todayStr;
    const isWeekend = i >= 5;
    const dayPrints = byDay[dateStr] || [];

    html += '<div style="border-right:0.5px solid var(--border);' +
      (i === 6 ? 'border-right:none;' : '') + '">' +

      // Entête colonne
      '<div style="padding:10px;text-align:center;border-bottom:0.5px solid var(--border);' +
        'background:' + (isToday ? 'var(--accent-bg)' : isWeekend ? 'var(--bg3)' : 'var(--bg2)') + '">' +
        '<div style="font-size:11px;font-weight:600;color:' + (isWeekend ? 'var(--text3)' : 'var(--text2)') + '">' + JOURS[i] + '</div>' +
        '<div style="font-size:16px;font-weight:' + (isToday ? '700' : '400') + ';' +
          'color:' + (isToday ? 'var(--accent)' : 'var(--text)') + '">' + day.getDate() + '</div>' +
      '</div>' +

      // Impressions
      '<div style="padding:8px;min-height:120px">' +
      dayPrints.map(function(p) {
        const col     = getPrinterColor(p.printer_id);
        const overdue = isOverdueSched(p);
        const alert   = window._schedBobineAlerts && window._schedBobineAlerts[p.id];
        return '<div onclick="openPrintForm(' + p.id + ')" ' +
          'style="margin-bottom:6px;padding:6px 8px;border-radius:var(--radius);cursor:pointer;' +
          'background:' + col + '18;border:0.5px solid ' + col + '44;border-left:3px solid ' + col + '">' +
          '<div style="font-size:12px;font-weight:500;margin-bottom:2px;color:var(--text)">' +
            (overdue ? '⚠ ' : '') +
            (alert ? (alert.severity === 'critical' ? '🔴 ' : '🟡 ') : '') +
            p.name +
          '</div>' +
          '<div style="font-size:10px;color:var(--text3);display:flex;flex-direction:column;gap:1px">' +
            (p.printer_name ? '<span>🖨 ' + p.printer_name + '</span>' : '') +
            (p.estimated_duration ? '<span>⏱ ' + fmtDuration(p.estimated_duration) + '</span>' : '') +
          '</div>' +
          statusBadge(p.status) +
        '</div>';
      }).join('') +
      (dayPrints.length === 0 ? '<div style="color:var(--text3);font-size:11px;text-align:center;margin-top:16px">—</div>' : '') +
      '</div>' +

    '</div>';
  });

  html += '</div></div>';

  // Impressions sans date en dessous
  const unscheduled = prints.filter(function(p) { return p.status === 'planned' && !p.planned_at; });
  if (unscheduled.length) {
    html += '<div style="margin-top:16px">' +
      '<div style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">📋 Sans date</div>' +
      unscheduled.map(schedPrintCard).join('') +
    '</div>';
  }

  container.innerHTML = html;
}

function schedNavWeek(dir) {
  _schedDate = new Date(_schedDate.getTime() + dir * 7 * 24 * 60 * 60 * 1000);
  renderScheduleWeek(window._schedPlanned || []);
}

function schedPrintCard(p) {
  const overdue     = isOverdueSched(p);
  const bobineAlert = window._schedBobineAlerts && window._schedBobineAlerts[p.id];
  const borderColor = overdue ? 'var(--danger)' :
    bobineAlert ? (bobineAlert.severity === 'critical' ? '#ef4444' : '#f59e0b') :
    (p.status === 'printing' || p.status === 'paused') ? '#f59e0b' : 'var(--border)';
  const filamentDot = p.color_hex
    ? '<span style="width:8px;height:8px;border-radius:50%;background:' + p.color_hex + ';display:inline-block;flex-shrink:0"></span>'
    : '';
  const bobineBadge = bobineAlert
    ? '<span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:500;' +
      'background:' + (bobineAlert.severity === 'critical' ? '#fef2f2' : '#fef3c7') + ';' +
      'color:' + (bobineAlert.severity === 'critical' ? '#ef4444' : '#f59e0b') + '">' +
      (bobineAlert.severity === 'critical' ? '🔴 Stock insuffisant' : '🟡 Stock limite') +
      ' (' + bobineAlert.stock_remaining + 'g / ' + bobineAlert.estimated_g + 'g nécessaires)</span>'
    : '';

  return '<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;' +
    'background:var(--bg2);border-radius:var(--radius);' +
    'border:0.5px solid ' + borderColor + ';margin-bottom:8px">' +
    '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
        '<span style="font-size:14px;font-weight:500">' + p.name + '</span>' +
        statusBadge(p.status) +
        (overdue ? '<span style="font-size:11px;color:var(--danger);font-weight:500">⚠ En retard</span>' : '') +
        bobineBadge +
      '</div>' +
      '<div style="font-size:12px;color:var(--text3);display:flex;gap:14px;flex-wrap:wrap;align-items:center">' +
        (p.planned_at
          ? '<span>📅 ' + fmtDateTimeSched(p.planned_at) + '</span>'
          : '<span style="color:var(--warning)">📅 Sans date planifiée</span>') +
        (p.estimated_duration ? '<span>⏱ ' + fmtDuration(p.estimated_duration) + '</span>' : '') +
        (p.printer_name ? '<span>🖨 ' + p.printer_name + '</span>' : '') +
        (p.filament_name ? '<span style="display:flex;align-items:center;gap:4px">' + filamentDot + p.filament_name + '</span>' : '') +
      '</div>' +
      (p.notes ? '<div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic">' + p.notes + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-shrink:0;align-items:center;flex-wrap:wrap;justify-content:flex-end">' +
      (p.status === 'planned'
        ? '<button class="btn btn-sm btn-primary" onclick="quickStartPrint(' + p.id + ')">▶ Démarrer</button>' : '') +
      (p.status === 'printing'
        ? '<button class="btn btn-sm" style="background:#dcfce7;color:#16a34a;border:none" onclick="quickDonePrint(' + p.id + ')">✓ Terminer</button>' : '') +
      '<button class="btn btn-sm" onclick="openPrintForm(' + p.id + ')" title="Modifier">✏ Modifier</button>' +
    '</div>' +
  '</div>';
}

async function quickStartPrint(id) {
  try {
    const print = await API.get('/prints/' + id);
    await API.put('/prints/' + id, Object.assign({}, print, { status: 'printing' }));
    toast('Impression démarrée ✓', 'success');
    renderSchedule();
  } catch(e) { toast(e.message, 'error'); }
}

async function quickDonePrint(id) {
  try {
    const print = await API.get('/prints/' + id);
    await API.put('/prints/' + id, Object.assign({}, print, { status: 'done' }));
    toast('Impression terminée ✓', 'success');
    renderSchedule();
  } catch(e) { toast(e.message, 'error'); }
}
