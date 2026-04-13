// schedule.js — Planning d'impression (vue filtrée sur prints avec status='planned')

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
  document.getElementById('topbar-actions').innerHTML =
    '<button class="btn btn-primary" onclick="openPrintForm(null,null,\'planned\')">+ Planifier une impression</button>';
  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  const allPrints = await API.get('/prints?limit=500');
  const planned   = allPrints.filter(function(p) {
    return p.status === 'planned' || p.status === 'printing' || p.status === 'paused';
  });

  renderScheduleList(planned);
}

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

function schedPrintCard(p) {
  const overdue     = isOverdueSched(p);
  const borderColor = overdue ? 'var(--danger)' :
    (p.status === 'printing' || p.status === 'paused') ? '#f59e0b' : 'var(--border)';
  const filamentDot = p.color_hex
    ? '<span style="width:8px;height:8px;border-radius:50%;background:' + p.color_hex + ';display:inline-block;flex-shrink:0"></span>'
    : '';

  return '<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;' +
    'background:var(--bg2);border-radius:var(--radius);' +
    'border:0.5px solid ' + borderColor + ';margin-bottom:8px">' +
    '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
        '<span style="font-size:14px;font-weight:500">' + p.name + '</span>' +
        statusBadge(p.status) +
        (overdue ? '<span style="font-size:11px;color:var(--danger);font-weight:500">⚠ En retard</span>' : '') +
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
