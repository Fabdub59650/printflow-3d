// quotes.js — Devis client PrintFlow-3D (multi-lignes v2.6.0)

let allQuotes = [];
let _quoteFilaments = [];
let _quotePrinters  = [];
let _quoteSettings  = {};

const QUOTE_STATUS = {
  draft:    { label: 'Brouillon', color: '#6b7280', bg: 'var(--bg3)' },
  sent:     { label: 'Envoyé',    color: '#3b82f6', bg: '#eff6ff'    },
  accepted: { label: 'Accepté',   color: '#10b981', bg: '#f0fdf4'    },
  refused:  { label: 'Refusé',    color: '#ef4444', bg: '#fef2f2'    },
};

function quoteBadge(status) {
  const s = QUOTE_STATUS[status] || QUOTE_STATUS.draft;
  return '<span style="font-size:11px;padding:2px 8px;border-radius:20px;' +
    'background:' + s.bg + ';color:' + s.color + ';font-weight:500">' + s.label + '</span>';
}

// ── Liste des devis ───────────────────────────────────────────────────────

async function renderQuotes() {
  document.getElementById('page-title').textContent = 'Devis';
  document.getElementById('topbar-actions').innerHTML =
    '<button class="btn btn-primary" onclick="openQuoteForm()">+ Nouveau devis</button>';
  document.getElementById('content').innerHTML =
    '<div style="color:var(--text3);padding:20px 0">Chargement…</div>';

  allQuotes = await API.get('/quotes');
  renderQuoteList();
}

function renderQuoteList() {
  const container = document.getElementById('content');
  if (!allQuotes.length) {
    container.innerHTML = '<div class="empty-state"><p>Aucun devis. Créez votre premier devis.</p></div>';
    return;
  }

  const total    = allQuotes.reduce(function(s, q) { return s + parseFloat(q.total_ht || 0); }, 0);
  const accepted = allQuotes.filter(function(q) { return q.status === 'accepted'; })
    .reduce(function(s, q) { return s + parseFloat(q.total_ht || 0); }, 0);

  container.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">' +
      '<div class="card" style="padding:14px">' +
        '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Total devis</div>' +
        '<div style="font-size:22px;font-weight:600;margin-top:4px">' + allQuotes.length + '</div>' +
      '</div>' +
      '<div class="card" style="padding:14px">' +
        '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Montant total HT</div>' +
        '<div style="font-size:22px;font-weight:600;margin-top:4px">' + total.toFixed(2) + ' €</div>' +
      '</div>' +
      '<div class="card" style="padding:14px">' +
        '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Acceptés</div>' +
        '<div style="font-size:22px;font-weight:600;color:#10b981;margin-top:4px">' + accepted.toFixed(2) + ' €</div>' +
      '</div>' +
    '</div>' +
    '<div class="card" style="padding:0;overflow:hidden">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="background:var(--bg3);font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">' +
          '<th style="padding:10px 16px;text-align:left;font-weight:500">Client</th>' +
          '<th style="padding:10px 16px;text-align:center;font-weight:500">Lignes</th>' +
          '<th style="padding:10px 16px;text-align:right;font-weight:500">Total HT</th>' +
          '<th style="padding:10px 16px;text-align:center;font-weight:500">Statut</th>' +
          '<th style="padding:10px 16px;text-align:right;font-weight:500">Date</th>' +
          '<th style="padding:10px 16px"></th>' +
        '</tr></thead>' +
        '<tbody>' +
        allQuotes.map(function(q) {
          return '<tr style="border-top:0.5px solid var(--border);font-size:13px">' +
            '<td style="padding:12px 16px;font-weight:500">' + q.client_name +
              (q.client_email ? '<br><span style="font-size:11px;color:var(--text3)">' + q.client_email + '</span>' : '') +
            '</td>' +
            '<td style="padding:12px 16px;text-align:center;color:var(--text3)">' +
              (q.item_count || 0) + ' article' + (q.item_count > 1 ? 's' : '') +
            '</td>' +
            '<td style="padding:12px 16px;text-align:right;font-weight:600">' + parseFloat(q.total_ht || 0).toFixed(2) + ' €</td>' +
            '<td style="padding:12px 16px;text-align:center">' + quoteBadge(q.status) + '</td>' +
            '<td style="padding:12px 16px;text-align:right;color:var(--text3)">' + fmtDate(q.created_at) + '</td>' +
            '<td style="padding:12px 16px;text-align:right;white-space:nowrap">' +
              '<button class="btn btn-sm" onclick="openQuoteDetail(' + q.id + ')">Voir</button> ' +
              '<button class="btn btn-sm" onclick="openQuoteForm(' + q.id + ')">✏</button> ' +
              '<button class="btn btn-sm btn-danger" onclick="deleteQuote(' + q.id + ')">✕</button>' +
            '</td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
}

// ── Formulaire devis (entête) ─────────────────────────────────────────────

async function openQuoteForm(id) {
  const q = id ? await API.get('/quotes/' + id) : {};
  const settings = await API.get('/settings');
  const marginDefault = settings.quote_margin_default || '20';

  openModal(
    '<div class="form-grid">' +
      '<div class="form-group">' +
        '<label class="form-label">Nom du client *</label>' +
        '<input id="qf-client" value="' + (q.client_name || '') + '" placeholder="Nom du client">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Email</label>' +
        '<input id="qf-email" type="email" value="' + (q.client_email || '') + '" placeholder="client@exemple.com">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Marge globale (%)</label>' +
        '<input id="qf-margin" type="number" min="0" step="1" value="' + (q.margin_pct || marginDefault) + '">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Statut</label>' +
        '<select id="qf-status">' +
          Object.entries(QUOTE_STATUS).map(function(e) {
            return '<option value="' + e[0] + '"' + ((q.status || 'draft') === e[0] ? ' selected' : '') + '>' + e[1].label + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-group full">' +
        '<label class="form-label">Notes internes</label>' +
        '<textarea id="qf-notes" rows="2" style="width:100%;resize:vertical">' + (q.notes || '') + '</textarea>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal()">Annuler</button>' +
      '<button class="btn btn-primary" onclick="saveQuoteHeader(' + (id || 'null') + ')">' +
        (id ? 'Enregistrer' : 'Créer le devis') +
      '</button>' +
    '</div>',
    id ? 'Modifier le devis' : 'Nouveau devis',
    { wide: false }
  );
}

async function saveQuoteHeader(id) {
  const client_name = document.getElementById('qf-client')?.value?.trim();
  if (!client_name) return toast('Nom client requis', 'error');

  const body = {
    client_name,
    client_email: document.getElementById('qf-email')?.value || null,
    notes:        document.getElementById('qf-notes')?.value || null,
    status:       document.getElementById('qf-status')?.value || 'draft',
    margin_pct:   parseFloat(document.getElementById('qf-margin')?.value) || 20,
  };

  try {
    let q;
    if (id) {
      q = await API.put('/quotes/' + id, body);
    } else {
      q = await API.post('/quotes', body);
    }
    closeModal();
    toast(id ? 'Devis mis à jour' : 'Devis créé', 'success');
    if (!id) {
      // Ouvrir directement le détail pour ajouter les lignes
      await renderQuotes();
      openQuoteDetail(q.id);
    } else {
      renderQuotes();
    }
  } catch(e) { toast(e.message, 'error'); }
}

// ── Détail devis avec gestion des lignes ──────────────────────────────────

async function openQuoteDetail(id) {
  // Charger les données nécessaires
  const [q, filaments, printers] = await Promise.all([
    API.get('/quotes/' + id),
    API.get('/filaments'),
    API.get('/printers'),
  ]);
  _quoteFilaments = filaments;
  _quotePrinters  = printers;

  renderQuoteDetailModal(q);
}

function renderQuoteDetailModal(q) {
  const items = q.items || [];
  const total = items.reduce(function(s, i) {
    return s + parseFloat(i.qty) * parseFloat(i.unit_price || 0);
  }, 0);

  const html =
    // Entête client
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
      '<div>' +
        '<div style="font-size:18px;font-weight:700">' + q.client_name + '</div>' +
        (q.client_email ? '<div style="font-size:12px;color:var(--text3)">' + q.client_email + '</div>' : '') +
        '<div style="font-size:12px;color:var(--text3);margin-top:2px">Marge : ' + q.margin_pct + '% · ' + fmtDate(q.created_at) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        quoteBadge(q.status) +
        '<button class="btn btn-sm" onclick="openQuoteForm(' + q.id + ')">✏ Modifier</button>' +
      '</div>' +
    '</div>' +

    // Tableau des lignes
    '<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="background:var(--bg3);font-size:11px;color:var(--text3);text-transform:uppercase">' +
          '<th style="padding:8px 12px;text-align:left;font-weight:500">Désignation</th>' +
          '<th style="padding:8px 12px;text-align:center;font-weight:500">Qté</th>' +
          '<th style="padding:8px 12px;text-align:right;font-weight:500">Total HT</th>' +
          '<th style="padding:8px 12px;text-align:center;font-weight:500">Impression liée</th>' +
          '<th style="padding:8px 12px;text-align:right;font-weight:500">Marge réelle</th>' +
          '<th style="padding:8px 12px;width:50px"></th>' +
        '</tr></thead>' +
        '<tbody id="quote-items-body">' +
        (items.length === 0 ?
          '<tr><td colspan="7" style="padding:20px;text-align:center;color:var(--text3);font-size:13px">Aucune ligne — ajoutez des articles ci-dessous</td></tr>' :
          items.map(function(item) { return renderItemRow(item, q.id); }).join('')
        ) +
        '</tbody>' +
        '<tfoot>' +
          '<tr style="border-top:1px solid var(--border);background:var(--bg3)">' +
            '<td colspan="3" style="padding:10px 12px;text-align:right;font-weight:600;font-size:14px">Total HT</td>' +
            '<td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;color:var(--accent)">' + total.toFixed(2) + ' €</td>' +
            '<td></td>' +
          '</tr>' +
        '</tfoot>' +
      '</table>' +
    '</div>' +

    // Formulaire ajout ligne
    '<div style="background:var(--bg3);border-radius:var(--radius);padding:14px;margin-bottom:12px">' +
      '<div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em">+ Ajouter une ligne</div>' +
      '<div class="form-grid">' +
        '<div class="form-group full">' +
          '<label class="form-label">Désignation *</label>' +
          '<input id="qi-designation" placeholder="Ex: Support mural pour écran">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Quantité</label>' +
          '<input id="qi-qty" type="number" min="1" value="1" oninput="recalcItemLine(' + q.id + ')">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Durée (h)</label>' +
          '<input id="qi-time" type="number" min="0" step="0.5" placeholder="ex: 2.5" oninput="recalcItemLine(' + q.id + ')">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Filament (g)</label>' +
          '<input id="qi-filament-g" type="number" min="0" step="1" placeholder="ex: 80" oninput="recalcItemLine(' + q.id + ')">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Filament</label>' +
          '<select id="qi-filament" onchange="recalcItemLine(' + q.id + ')">' +
            '<option value="">— Sélectionner —</option>' +
            _quoteFilaments.map(function(f) {
              return '<option value="' + f.id + '" data-price="' + (f.price || 0) + '">' +
                f.name + ' (' + f.material + ') — ' + (f.price || 0) + ' €/kg</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Imprimante</label>' +
          '<select id="qi-printer" onchange="recalcItemLine(' + q.id + ')">' +
            '<option value="">— Sélectionner —</option>' +
            _quotePrinters.map(function(p) {
              return '<option value="' + p.id + '">' + p.name +
                (p.power_consumption ? ' (' + p.power_consumption + 'W)' : '') + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      // Aperçu calcul
      '<div id="qi-calc-preview" style="font-size:12px;color:var(--text3);margin:8px 0"></div>' +
      '<button class="btn btn-primary btn-sm" onclick="addQuoteItem(' + q.id + ')">Ajouter la ligne</button>' +
    '</div>' +

    (q.notes ? '<p style="font-size:12px;color:var(--text3);font-style:italic;margin-bottom:12px">' + q.notes + '</p>' : '') +

    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal();renderQuotes()">Fermer</button>' +
      
    '</div>';

  openModal(html, 'Devis — ' + q.client_name, { xl: true });
}

function renderItemRow(item, quoteId) {
  // Calcul marge réelle si impression liée
  let realCostHtml = '—', marginHtml = '—', printLinkHtml = '';

  if (item.print_id) {
    const estimated = parseFloat(item.qty) * parseFloat(item.unit_price || 0);
    if (item.real_filament_g !== null && item.real_filament_g !== undefined) {
      const fil_cost  = (parseFloat(item.real_filament_g) / 1000) * parseFloat(item.filament_price || 0);
      // électricité approximée depuis durée réelle
      const real_cost = fil_cost; // simplifié — le calcul complet est dans /profitability
      realCostHtml = '~' + fil_cost.toFixed(2) + ' €';
    }
    const margin = item.margin_real !== undefined && item.margin_real !== null
      ? parseFloat(item.margin_real) : null;
    if (margin !== null) {
      const col = margin >= 0 ? 'var(--success)' : 'var(--danger)';
      marginHtml = '<span style="color:' + col + ';font-weight:600">' +
        (margin >= 0 ? '+' : '') + margin.toFixed(2) + ' €</span>';
    }
    printLinkHtml =
      '<span style="font-size:11px;color:var(--success)">✓ ' + (item.print_name || '#' + item.print_id) + '</span>' +
      '<br><button class="btn btn-sm" onclick="unlinkPrint(' + quoteId + ',' + item.id + ')" ' +
      'style="font-size:10px;margin-top:2px">Délier</button>';
  } else {
    printLinkHtml = '<button class="btn btn-sm" onclick="openLinkPrint(' + quoteId + ',' + item.id + ')">Lier</button>';
  }

  const lineTotal = (parseFloat(item.qty) * parseFloat(item.unit_price || 0)).toFixed(2);
  const details = [
    item.print_time_h > 0 ? item.print_time_h + 'h' : null,
    item.filament_g > 0   ? item.filament_g + 'g'   : null,
    parseFloat(item.unit_price || 0).toFixed(2) + ' €/u',
  ].filter(Boolean).join(' · ');

  return '<tr style="border-top:0.5px solid var(--border);font-size:13px" id="item-row-' + item.id + '">' +
    '<td style="padding:10px 12px;font-weight:500">' + item.designation +
      '<br><span style="font-size:11px;color:var(--text3)">' + details + '</span>' +
      (item.filament_name ? '<span style="font-size:11px;color:var(--text3)"> · ' + item.filament_name + '</span>' : '') +
    '</td>' +
    '<td style="padding:10px 12px;text-align:center">' + item.qty + '</td>' +
    '<td style="padding:10px 12px;text-align:right;font-weight:600">' + lineTotal + ' €</td>' +
    '<td style="padding:10px 12px;text-align:center">' + printLinkHtml + '</td>' +
    '<td style="padding:10px 12px;text-align:right">' + marginHtml + '</td>' +
    '<td style="padding:10px 12px;text-align:right">' +
      '<button class="btn btn-sm btn-danger" onclick="deleteQuoteItem(' + quoteId + ',' + item.id + ')" title="Supprimer">✕</button>' +
    '</td>' +
  '</tr>';
}

// ── Liaison impression ────────────────────────────────────────────────────

let _allPrints = [];

async function openLinkPrint(quoteId, itemId) {
  if (!_allPrints.length) {
    _allPrints = await API.get('/prints');
  }
  const done = _allPrints.filter(function(p) { return p.status === 'done'; });

  openModal(
    '<p style="font-size:13px;color:var(--text2);margin-bottom:14px">' +
      'Sélectionnez l\'impression réalisée correspondant à cette ligne de devis.' +
    '</p>' +
    '<div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius)">' +
      (done.length === 0 ?
        '<div style="padding:20px;text-align:center;color:var(--text3)">Aucune impression terminée disponible</div>' :
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr style="background:var(--bg3);font-size:11px;color:var(--text3);text-transform:uppercase">' +
            '<th style="padding:8px 12px;text-align:left;font-weight:500">Impression</th>' +
            '<th style="padding:8px 12px;text-align:right;font-weight:500">Filament réel</th>' +
            '<th style="padding:8px 12px;text-align:right;font-weight:500">Durée réelle</th>' +
            '<th style="padding:8px 12px;text-align:right;font-weight:500">Date</th>' +
            '<th style="padding:8px 12px;width:60px"></th>' +
          '</tr></thead>' +
          '<tbody>' +
          done.map(function(p) {
            return '<tr style="border-top:0.5px solid var(--border);font-size:13px">' +
              '<td style="padding:9px 12px;font-weight:500">' + p.name + '</td>' +
              '<td style="padding:9px 12px;text-align:right;color:var(--text3)">' +
                (p.filament_used ? p.filament_used + ' g' : '—') + '</td>' +
              '<td style="padding:9px 12px;text-align:right;color:var(--text3)">' +
                (p.actual_duration ? Math.round(p.actual_duration/60*10)/10 + 'h' : '—') + '</td>' +
              '<td style="padding:9px 12px;text-align:right;color:var(--text3)">' +
                (p.finished_at ? fmtDate(p.finished_at) : '—') + '</td>' +
              '<td style="padding:9px 12px;text-align:right">' +
                '<button class="btn btn-sm btn-primary" onclick="linkPrint(' + quoteId + ',' + itemId + ',' + p.id + ')">Lier</button>' +
              '</td>' +
            '</tr>';
          }).join('') +
          '</tbody></table>'
      ) +
    '</div>' +
    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal();openQuoteDetail(' + quoteId + ')">Annuler</button>' +
    '</div>',
    'Lier une impression',
    { wide: true }
  );
}

async function linkPrint(quoteId, itemId, printId) {
  try {
    await API.patch('/quotes/' + quoteId + '/items/' + itemId + '/link', { print_id: printId });
    _allPrints = []; // Reset cache
    toast('Impression liée avec succès', 'success');
    closeModal();
    openQuoteDetail(quoteId);
  } catch(e) { toast(e.message, 'error'); }
}

async function unlinkPrint(quoteId, itemId) {
  try {
    await API.patch('/quotes/' + quoteId + '/items/' + itemId + '/link', { print_id: null });
    toast('Liaison supprimée', 'success');
    openQuoteDetail(quoteId);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Rentabilité ───────────────────────────────────────────────────────────

async function openQuoteProfitability(quoteId) {
  const data = await API.get('/quotes/' + quoteId + '/profitability');

  const linkedItems = data.items.filter(function(i) { return i.print_id; });
  const pctLinked   = data.total_count > 0
    ? Math.round(data.linked_count / data.total_count * 100) : 0;
  const marginPct   = data.total_estimated > 0
    ? Math.round(data.total_margin / data.total_estimated * 100 * 10) / 10 : 0;
  const marginCol   = data.total_margin >= 0 ? 'var(--success)' : 'var(--danger)';

  openModal(
    // Résumé global
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">' +
      '<div style="background:var(--bg3);border-radius:var(--radius);padding:12px;text-align:center">' +
        '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Prix estimé HT</div>' +
        '<div style="font-size:20px;font-weight:700">' + data.total_estimated.toFixed(2) + ' €</div>' +
      '</div>' +
      '<div style="background:var(--bg3);border-radius:var(--radius);padding:12px;text-align:center">' +
        '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Coût réel</div>' +
        '<div style="font-size:20px;font-weight:700">' +
          (data.linked_count > 0 ? data.total_real_cost.toFixed(2) + ' €' : '—') +
        '</div>' +
      '</div>' +
      '<div style="background:var(--bg3);border-radius:var(--radius);padding:12px;text-align:center">' +
        '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Marge réelle</div>' +
        '<div style="font-size:20px;font-weight:700;color:' + marginCol + '">' +
          (data.linked_count > 0
            ? (data.total_margin >= 0 ? '+' : '') + data.total_margin.toFixed(2) + ' € (' + marginPct + '%)'
            : '—') +
        '</div>' +
      '</div>' +
    '</div>' +

    // Avancement liaison
    '<div style="margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text3);margin-bottom:4px">' +
        '<span>Impressions liées</span>' +
        '<span>' + data.linked_count + ' / ' + data.total_count + ' lignes (' + pctLinked + '%)</span>' +
      '</div>' +
      '<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">' +
        '<div style="height:100%;width:' + pctLinked + '%;background:var(--accent);border-radius:3px;transition:width 0.5s"></div>' +
      '</div>' +
    '</div>' +

    // Tableau par ligne
    '<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr style="background:var(--bg3);font-size:11px;color:var(--text3);text-transform:uppercase">' +
          '<th style="padding:8px 12px;text-align:left;font-weight:500">Désignation</th>' +
          '<th style="padding:8px 12px;text-align:right;font-weight:500">Estimé HT</th>' +
          '<th style="padding:8px 12px;text-align:right;font-weight:500">Coût réel</th>' +
          '<th style="padding:8px 12px;text-align:right;font-weight:500">Marge</th>' +
          '<th style="padding:8px 12px;text-align:center;font-weight:500">Impression</th>' +
        '</tr></thead>' +
        '<tbody>' +
        data.items.map(function(item) {
          const estimated = parseFloat(item.estimated || 0);
          const realCost  = item.real_cost !== null ? parseFloat(item.real_cost) : null;
          const margin    = item.margin_real !== null ? parseFloat(item.margin_real) : null;
          const mPct      = item.margin_pct_real !== null ? parseFloat(item.margin_pct_real) : null;
          const mCol      = margin !== null ? (margin >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text3)';

          return '<tr style="border-top:0.5px solid var(--border);font-size:13px">' +
            '<td style="padding:9px 12px;font-weight:500">' + item.designation +
              '<br><span style="font-size:11px;color:var(--text3)">× ' + item.qty + '</span>' +
            '</td>' +
            '<td style="padding:9px 12px;text-align:right">' + estimated.toFixed(2) + ' €</td>' +
            '<td style="padding:9px 12px;text-align:right;color:var(--text3)">' +
              (realCost !== null ? realCost.toFixed(2) + ' €' : '—') +
            '</td>' +
            '<td style="padding:9px 12px;text-align:right;font-weight:600;color:' + mCol + '">' +
              (margin !== null
                ? (margin >= 0 ? '+' : '') + margin.toFixed(2) + ' €' +
                  (mPct !== null ? '<br><span style="font-size:11px">' + mPct + '%</span>' : '')
                : '—') +
            '</td>' +
            '<td style="padding:9px 12px;text-align:center;font-size:11px">' +
              (item.print_id
                ? '<span style="color:var(--success)">✓ ' + (item.print_name || '#' + item.print_id) + '</span>'
                : '<span style="color:var(--text3)">Non liée</span>') +
            '</td>' +
          '</tr>';
        }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>' +

    '<div class="modal-footer">' +
      '<button class="btn" onclick="closeModal();openQuoteDetail(' + quoteId + ')">Retour au devis</button>' +
    '</div>',
    'Rentabilité — ' + data.client_name
  );
}

// ── Calcul aperçu ligne ───────────────────────────────────────────────────

let _recalcTimer = null;
async function recalcItemLine(quoteId) {
  clearTimeout(_recalcTimer);
  _recalcTimer = setTimeout(async function() {
    const filament_g   = parseFloat(document.getElementById('qi-filament-g')?.value) || 0;
    const print_time_h = parseFloat(document.getElementById('qi-time')?.value) || 0;
    const qty          = parseInt(document.getElementById('qi-qty')?.value) || 1;
    const filament_id  = document.getElementById('qi-filament')?.value || null;
    const printer_id   = document.getElementById('qi-printer')?.value || null;

    if (!filament_g && !print_time_h) {
      const el = document.getElementById('qi-calc-preview');
      if (el) el.textContent = '';
      return;
    }

    try {
      const [[q]] = [await API.get('/quotes/' + quoteId)];
      const result = await API.post('/quotes/calculate', {
        filament_g, print_time_h, filament_id, printer_id,
        margin_pct: q.margin_pct, qty,
      });
      const el = document.getElementById('qi-calc-preview');
      if (el) {
        el.innerHTML =
          'Matière : <b>' + result.filament_cost.toFixed(2) + ' €</b> · ' +
          'Élec : <b>' + result.electricity_cost.toFixed(2) + ' €</b> · ' +
          'Prix unit. HT : <b>' + result.unit_price.toFixed(2) + ' €</b> · ' +
          'Total ligne : <b style="color:var(--accent)">' + result.line_total.toFixed(2) + ' €</b>';
      }
    } catch(_) {}
  }, 400);
}

// ── Ajouter une ligne ─────────────────────────────────────────────────────

async function addQuoteItem(quoteId) {
  const designation = document.getElementById('qi-designation')?.value?.trim();
  if (!designation) return toast('Désignation requise', 'error');

  const body = {
    designation,
    qty:          parseInt(document.getElementById('qi-qty')?.value) || 1,
    print_time_h: parseFloat(document.getElementById('qi-time')?.value) || 0,
    filament_g:   parseFloat(document.getElementById('qi-filament-g')?.value) || 0,
    filament_id:  document.getElementById('qi-filament')?.value || null,
    printer_id:   document.getElementById('qi-printer')?.value || null,
  };

  try {
    await API.post('/quotes/' + quoteId + '/items', body);
    toast('Ligne ajoutée', 'success');
    // Recharger le détail
    const q = await API.get('/quotes/' + quoteId);
    closeModal();
    renderQuoteDetailModal(q);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Supprimer une ligne ───────────────────────────────────────────────────

async function deleteQuoteItem(quoteId, itemId) {
  try {
    await API.del('/quotes/' + quoteId + '/items/' + itemId);
    toast('Ligne supprimée', 'success');
    const q = await API.get('/quotes/' + quoteId);
    closeModal();
    renderQuoteDetailModal(q);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Impression / Suppression ──────────────────────────────────────────────


async function deleteQuote(id) {
  confirmDelete('Supprimer ce devis et toutes ses lignes ?', async function() {
    await API.del('/quotes/' + id);
    toast('Devis supprimé');
    renderQuotes();
  });
}
