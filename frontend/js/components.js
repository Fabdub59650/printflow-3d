function openModal(html, title, options) {
  const modal = document.getElementById('modal');
  const tabbed = options && options.tabbed;
  const wide   = options && options.wide;
  const xl     = options && options.xl;
  modal.className = 'modal' + (tabbed ? ' modal-tabbed' : '') + (xl ? ' modal-xl' : wide ? ' modal-wide' : '');

  if (tabbed) {
    // Séparer le footer du reste pour le garder fixe en bas
    const footerMatch = html.match(/(<div class="modal-footer">[\s\S]*<\/div>)\s*$/);
    const footer = footerMatch ? footerMatch[1] : '';
    const body   = footerMatch ? html.slice(0, html.lastIndexOf(footerMatch[1])) : html;
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="btn btn-sm" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-tab-body">${body}</div>
      ${footer}`;
  } else {
    modal.innerHTML = `
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="btn btn-sm" onclick="closeModal()">✕</button>
      </div>
      ${html}`;
  }

  modal.classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.className = 'modal hidden';
  document.getElementById('modal-overlay').classList.add('hidden');
}

function openPrinterIframe(printer) {
  if (!printer.interface_url) return toast('Aucune URL définie pour cette imprimante', 'error');
  document.getElementById('iframe-modal-title').textContent = printer.name + ' — ' + (printer.interface_type || 'Interface');
  document.getElementById('printer-iframe').src = `/printer-proxy/${printer.id}/`;
  document.getElementById('iframe-open-tab').onclick = () => window.open(printer.interface_url, '_blank');
  document.getElementById('printer-iframe-modal').classList.remove('hidden');
}
function closePrinterIframe() {
  document.getElementById('printer-iframe-modal').classList.add('hidden');
  document.getElementById('printer-iframe').src = '';
}

function statusBadge(status) {
  const map = {
    idle: ['badge-success', 'Disponible'],
    printing: ['badge-info', 'En impression'],
    paused: ['badge-warning', 'En pause'],
    error: ['badge-danger', 'Erreur'],
    offline: ['badge-neutral', 'Hors ligne'],
    maintenance: ['badge-warning', 'Maintenance'],
    done: ['badge-success', 'Terminé'],
    failed: ['badge-danger', 'Échec'],
    cancelled: ['badge-neutral', 'Annulé'],
    queued: ['badge-neutral', 'En attente'],
    planned: ['badge-info', 'Planifié'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function pct(remaining, total) {
  if (!total) return 0;
  return Math.round((remaining / total) * 100);
}

function fmtDuration(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}` : `${m}min`;
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function confirmDelete(msg, cb) {
  if (confirm(msg)) cb();
}

function interfaceTypeLabel(t) {
  const m = { octoprint:'OctoPrint', moonraker:'Moonraker/Klipper', bambu:'Bambu Lab', duet:'Duet WebControl', repetier:'Repetier', other:'Autre' };
  return m[t] || t || '—';
}

function printerIcon() {
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="6" width="16" height="9" rx="2"/>
    <rect x="6" y="2" width="8" height="5" rx="1"/>
    <path d="M6 15h8v3a1 1 0 01-1 1H7a1 1 0 01-1-1v-3z"/>
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
  </svg>`;
}
