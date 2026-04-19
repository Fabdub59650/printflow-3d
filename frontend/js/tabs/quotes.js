// quotes.js — Devis client PrintFlow-3D

let allQuotes = [];

const QUOTE_STATUS = {
  draft:    { label: 'Brouillon',  color: '#6b7280', bg: 'var(--bg3)' },
  sent:     { label: 'Envoyé',     color: '#3b82f6', bg: '#eff6ff' },
  accepted: { label: 'Accepté',    color: '#10b981', bg: '#f0fdf4' },
  refused:  { label: 'Refusé',     color: '#ef4444', bg: '#fef2f2' },
};

function quoteBadge(status) {
  const s = QUOTE_STATUS[status] || QUOTE_STATUS.draft;
  return `<span style="font-size:11px;padding:2px 8px;border-radius:20px;
    background:${s.bg};color:${s.color};font-weight:500">${s.label}</span>`;
}

async function renderQuotes() {
  document.getElementById('page-title').textContent = 'Devis';
  document.getElementById('topbar-actions').innerHTML =
    `<button class="btn btn-primary" onclick="openQuoteForm()">+ Nouveau devis</button>`;
  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';
  allQuotes = await API.get('/quotes');
  renderQuoteList();
}

function renderQuoteList() {
  const container = document.getElementById('content');
  if (!allQuotes.length) {
    container.innerHTML = `<div class="empty-state"><p>Aucun devis. Créez votre premier devis.</p></div>`;
    return;
  }

  const total    = allQuotes.reduce((s, q) => s + parseFloat(q.total_ht||0), 0);
  const accepted = allQuotes.filter(q => q.status === 'accepted').reduce((s, q) => s + parseFloat(q.total_ht||0), 0);

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      <div class="card" style="padding:14px">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Total devis</div>
        <div style="font-size:22px;font-weight:600;margin-top:4px">${allQuotes.length}</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Montant total HT</div>
        <div style="font-size:22px;font-weight:600;margin-top:4px">${total.toFixed(2)} €</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Acceptés</div>
        <div style="font-size:22px;font-weight:600;color:#10b981;margin-top:4px">${accepted.toFixed(2)} €</div>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--bg3);font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">
            <th style="padding:10px 16px;text-align:left;font-weight:500">Client</th>
            <th style="padding:10px 16px;text-align:left;font-weight:500">Description</th>
            <th style="padding:10px 16px;text-align:right;font-weight:500">Matière</th>
            <th style="padding:10px 16px;text-align:right;font-weight:500">Électricité</th>
            <th style="padding:10px 16px;text-align:right;font-weight:500">Total HT</th>
            <th style="padding:10px 16px;text-align:center;font-weight:500">Statut</th>
            <th style="padding:10px 16px;text-align:right;font-weight:500">Date</th>
            <th style="padding:10px 16px"></th>
          </tr>
        </thead>
        <tbody>
          ${allQuotes.map(function(q) {
            return '<tr style="border-top:0.5px solid var(--border);font-size:13px">' +
              '<td style="padding:12px 16px;font-weight:500">' + q.client_name +
                (q.client_email ? '<br><span style="font-size:11px;color:var(--text3)">' + q.client_email + '</span>' : '') +
              '</td>' +
              '<td style="padding:12px 16px;color:var(--text2)">' + (q.description||'—').substring(0,50) + '</td>' +
              '<td style="padding:12px 16px;text-align:right">' + parseFloat(q.filament_cost||0).toFixed(2) + ' €</td>' +
              '<td style="padding:12px 16px;text-align:right">' + parseFloat(q.electricity_cost||0).toFixed(2) + ' €</td>' +
              '<td style="padding:12px 16px;text-align:right;font-weight:600">' + parseFloat(q.total_ht||0).toFixed(2) + ' €</td>' +
              '<td style="padding:12px 16px;text-align:center">' + quoteBadge(q.status) + '</td>' +
              '<td style="padding:12px 16px;text-align:right;color:var(--text3)">' + fmtDate(q.created_at) + '</td>' +
              '<td style="padding:12px 16px;text-align:right;white-space:nowrap">' +
                '<button class="btn btn-sm" onclick="openQuoteDetail(' + q.id + ')">Voir</button> ' +
                '<button class="btn btn-sm" onclick="openQuoteForm(' + q.id + ')">✏</button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deleteQuote(' + q.id + ')">✕</button>' +
              '</td>' +
            '</tr>';
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

async function openQuoteForm(id) {
  const q   = id ? await API.get('/quotes/' + id) : {};
  const [filaments, printers, settings] = await Promise.all([
    API.get('/filaments'),
    API.get('/printers'),
    API.get('/settings'),
  ]);
  const marginDefault = settings.quote_margin_default || '20';
  const title = id ? 'Modifier le devis' : 'Nouveau devis';

  openModal(`
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Nom du client *</label>
        <input id="qf-client" value="${q.client_name||''}" placeholder="Nom du client">
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input id="qf-email" type="email" value="${q.client_email||''}" placeholder="client@exemple.com">
      </div>
      <div class="form-group full">
        <label class="form-label">Description de l'impression</label>
        <input id="qf-desc" value="${q.description||''}" placeholder="Ex: Pièce mécanique 15x10x8cm">
      </div>
      <div class="form-group">
        <label class="form-label">Filament</label>
        <select id="qf-filament" onchange="recalcQuote()">
          <option value="">— Sélectionner —</option>
          ${filaments.map(f => `<option value="${f.id}" data-price="${f.price||0}" ${q.filament_id==f.id?'selected':''}>${f.name} (${f.material}) — ${f.price||0} €/kg</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Imprimante</label>
        <select id="qf-printer" onchange="recalcQuote()">
          <option value="">— Sélectionner —</option>
          ${printers.map(p => `<option value="${p.id}" data-power="${p.power_consumption||0}" ${q.printer_id==p.id?'selected':''}>${p.name}${p.power_consumption?' ('+p.power_consumption+'W)':''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Quantité filament (g)</label>
        <input id="qf-filament-g" type="number" min="0" step="1" value="${q.filament_g||''}" placeholder="ex: 120" oninput="recalcQuote()">
      </div>
      <div class="form-group">
        <label class="form-label">Durée d'impression (h)</label>
        <input id="qf-time" type="number" min="0" step="0.5" value="${q.print_time_h||''}" placeholder="ex: 4.5" oninput="recalcQuote()">
      </div>
      <div class="form-group">
        <label class="form-label">Marge (%)</label>
        <input id="qf-margin" type="number" min="0" step="1" value="${q.margin_pct||marginDefault}" oninput="recalcQuote()">
      </div>
      <div class="form-group">
        <label class="form-label">Statut</label>
        <select id="qf-status">
          ${Object.entries(QUOTE_STATUS).map(([k,v]) => `<option value="${k}" ${(q.status||'draft')==k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <!-- Résumé calcul -->
    <div id="qf-calc" style="background:var(--bg3);border-radius:var(--radius);padding:14px;margin:12px 0">
      <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:10px">💰 Calcul du devis</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div style="color:var(--text3)">Coût matière</div>
        <div id="qf-r-filament" style="text-align:right;font-weight:500">—</div>
        <div style="color:var(--text3)">Coût électricité</div>
        <div id="qf-r-elec" style="text-align:right;font-weight:500">—</div>
        <div style="color:var(--text3)">Coût de base</div>
        <div id="qf-r-base" style="text-align:right;font-weight:500">—</div>
        <div style="color:var(--text3)">Marge</div>
        <div id="qf-r-margin" style="text-align:right;font-weight:500">—</div>
        <div style="color:var(--text);font-weight:600;font-size:15px;border-top:0.5px solid var(--border);padding-top:8px;margin-top:4px">Total HT</div>
        <div id="qf-r-total" style="text-align:right;font-weight:700;font-size:15px;color:var(--accent);border-top:0.5px solid var(--border);padding-top:8px;margin-top:4px">—</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Notes internes</label>
      <textarea id="qf-notes" rows="2" style="width:100%;resize:vertical">${q.notes||''}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="saveQuote(${id||'null'})">Enregistrer</button>
    </div>
  `, title, { wide: true });

  // Calculer si édition existante
  if (id) setTimeout(recalcQuote, 100);
}

// Stocker le dernier calcul
let _lastCalc = {};

async function recalcQuote() {
  const filamentSel = document.getElementById('qf-filament');
  const printerSel  = document.getElementById('qf-printer');
  const filament_g   = parseFloat(document.getElementById('qf-filament-g')?.value) || 0;
  const print_time_h = parseFloat(document.getElementById('qf-time')?.value) || 0;
  const margin_pct   = parseFloat(document.getElementById('qf-margin')?.value) || 20;
  const filament_id  = filamentSel?.value || null;
  const printer_id   = printerSel?.value || null;

  try {
    const result = await API.post('/quotes/calculate', { filament_g, print_time_h, filament_id, printer_id, margin_pct });
    _lastCalc = result;
    const set = function(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('qf-r-filament', result.filament_cost.toFixed(2) + ' €');
    set('qf-r-elec',     result.electricity_cost.toFixed(2) + ' €');
    set('qf-r-base',     result.base_cost.toFixed(2) + ' €');
    set('qf-r-margin',   result.margin_amount.toFixed(2) + ' € (' + margin_pct + '%)');
    set('qf-r-total',    result.total_ht.toFixed(2) + ' €');
  } catch(_) {}
}

async function saveQuote(id) {
  const client_name = document.getElementById('qf-client')?.value?.trim();
  if (!client_name) return toast('Nom client requis', 'error');

  const body = {
    client_name,
    client_email:     document.getElementById('qf-email')?.value || null,
    description:      document.getElementById('qf-desc')?.value || null,
    notes:            document.getElementById('qf-notes')?.value || null,
    status:           document.getElementById('qf-status')?.value || 'draft',
    filament_id:      document.getElementById('qf-filament')?.value || null,
    printer_id:       document.getElementById('qf-printer')?.value || null,
    filament_g:       document.getElementById('qf-filament-g')?.value || 0,
    print_time_h:     document.getElementById('qf-time')?.value || 0,
    margin_pct:       document.getElementById('qf-margin')?.value || 20,
    filament_cost:    _lastCalc.filament_cost || 0,
    electricity_cost: _lastCalc.electricity_cost || 0,
    total_ht:         _lastCalc.total_ht || 0,
  };

  try {
    if (id) await API.put('/quotes/' + id, body);
    else    await API.post('/quotes', body);
    closeModal();
    toast(id ? 'Devis mis à jour' : 'Devis créé', 'success');
    renderQuotes();
  } catch(e) { toast(e.message, 'error'); }
}

async function openQuoteDetail(id) {
  const q = await API.get('/quotes/' + id);
  openModal(`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Client</div>
        <div style="font-size:15px;font-weight:600">${q.client_name}</div>
        ${q.client_email ? '<div style="font-size:12px;color:var(--text3)">' + q.client_email + '</div>' : ''}
      </div>
      <div style="text-align:right">
        ${quoteBadge(q.status)}
        <div style="font-size:11px;color:var(--text3);margin-top:4px">${fmtDate(q.created_at)}</div>
      </div>
    </div>
    ${q.description ? '<p style="font-size:13px;color:var(--text2);margin-bottom:16px">' + q.description + '</p>' : ''}
    <div style="background:var(--bg3);border-radius:var(--radius);padding:14px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div class="stat-row"><span class="stat-label">Filament</span><span class="stat-val">${q.filament_name||'—'} ${q.filament_g ? '('+q.filament_g+'g)' : ''}</span></div>
        <div class="stat-row"><span class="stat-label">Imprimante</span><span class="stat-val">${q.printer_name||'—'}</span></div>
        <div class="stat-row"><span class="stat-label">Durée estimée</span><span class="stat-val">${q.print_time_h ? q.print_time_h+'h' : '—'}</span></div>
        <div class="stat-row"><span class="stat-label">Marge</span><span class="stat-val">${q.margin_pct}%</span></div>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,var(--accent-bg),var(--bg3));border-radius:var(--radius);padding:16px;margin-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr auto;gap:6px;font-size:13px">
        <span style="color:var(--text2)">Coût matière</span><span style="font-weight:500">${parseFloat(q.filament_cost||0).toFixed(2)} €</span>
        <span style="color:var(--text2)">Coût électricité</span><span style="font-weight:500">${parseFloat(q.electricity_cost||0).toFixed(2)} €</span>
        <span style="color:var(--text2)">Marge (${q.margin_pct}%)</span><span style="font-weight:500">${(parseFloat(q.total_ht||0) - parseFloat(q.filament_cost||0) - parseFloat(q.electricity_cost||0)).toFixed(2)} €</span>
        <span style="font-size:16px;font-weight:700;color:var(--accent);padding-top:6px;border-top:0.5px solid var(--border)">Total HT</span>
        <span style="font-size:16px;font-weight:700;color:var(--accent);padding-top:6px;border-top:0.5px solid var(--border)">${parseFloat(q.total_ht||0).toFixed(2)} €</span>
      </div>
    </div>
    ${q.notes ? '<p style="font-size:12px;color:var(--text3);font-style:italic">' + q.notes + '</p>' : ''}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Fermer</button>
      <button class="btn" onclick="closeModal();openQuoteForm(${id})">Modifier</button>
      <button class="btn btn-primary" onclick="printQuote(${id})">🖨 Imprimer</button>
    </div>
  `, 'Devis — ' + q.client_name);
}

function printQuote(id) {
  window.open('/api/quotes/' + id + '/print', '_blank');
}

async function deleteQuote(id) {
  confirmDelete('Supprimer ce devis ?', async () => {
    await API.del('/quotes/' + id);
    toast('Devis supprimé');
    renderQuotes();
  });
}
