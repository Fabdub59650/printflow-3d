// help.js — Aide en ligne PrintFlow-3D

// ── Contenu de l'aide par section ────────────────────────────────────────

const HELP_SECTIONS = [
  {
    id:    'dashboard',
    tab:   'dashboard',
    icon:  '🏠',
    title: 'Tableau de bord',
    content: `
<p>Le tableau de bord donne une vue d'ensemble de votre activité d'impression en temps réel.</p>

<h4>Métriques principales</h4>
<p>Les tuiles en haut affichent le nombre d'imprimantes actives, le total d'impressions, les heures passées et le filament consommé sur les 30 derniers jours.</p>

<h4>Alertes automatiques</h4>
<p>Le tableau de bord affiche automatiquement plusieurs types d'alertes :</p>
<ul>
  <li><strong>🧵 Stock insuffisant</strong> — si une bobine risque de manquer pour une impression planifiée</li>
  <li><strong>⚠ Bobines bientôt vides</strong> — quand le stock d'une bobine passe sous le seuil configuré</li>
  <li><strong>🔧 Maintenance à prévoir</strong> — quand une maintenance est due ou en retard</li>
  <li><strong>⚙ Consommables à remplacer</strong> — buse, plateau ou autres pièces d'usure</li>
</ul>

<h4>Activité 7 derniers jours</h4>
<p>Un mini graphique en barres en haut du tableau de bord montre l'activité jour par jour sur les 7 derniers jours. Les barres vertes représentent les impressions réussies, la partie rouge les échecs. Le résumé en bas indique le total, le taux de réussite, les heures et le coût réel.</p>

<h4>Impressions récentes</h4>
<p>La liste du bas affiche les 8 dernières impressions avec leur statut, durée et filament utilisé.</p>
    `
  },
  {
    id:    'printers',
    tab:   'printers',
    icon:  '🖨',
    title: 'Imprimantes',
    content: `
<p>Gérez votre parc d'imprimantes 3D et suivez leurs statistiques.</p>

<h4>Ajouter une imprimante</h4>
<p>Cliquez sur <strong>+ Ajouter</strong> et renseignez le nom, modèle, IP et type d'interface (Moonraker/Fluidd pour les imprimantes Klipper).</p>

<h4>Suivi Moonraker temps réel</h4>
<p>Pour les imprimantes équipées de Klipper/Fluidd (ex: Neptune 4 Plus), configurez l'URL d'interface avec le type <strong>Fluidd</strong> ou <strong>Moonraker</strong>. PrintFlow affiche alors en temps réel :</p>
<ul>
  <li>🌡 Température buse et plateau (actuelle / cible)</li>
  <li>📊 Progression de l'impression en cours</li>
  <li>⏱ Temps restant estimé</li>
  <li>Nom du fichier en cours d'impression</li>
</ul>
<p>Le suivi se met à jour toutes les 10 secondes automatiquement.</p>

<h4>Consommables</h4>
<p>Dans la fiche détail d'une imprimante, l'onglet <strong>Consommables</strong> permet de suivre l'usure des pièces (buse, plateau, courroies...) avec des alertes automatiques selon le nombre d'heures d'utilisation.</p>

<h4>Prise connectée Tapo</h4>
<p>Si vous avez des prises TP-Link Tapo P100, vous pouvez les associer à une imprimante pour l'allumer/éteindre directement depuis PrintFlow (nécessite firmware ≤ 1.3).</p>
    `
  },
  {
    id:    'prints',
    tab:   'prints',
    icon:  '📋',
    title: 'Impressions',
    content: `
<p>L'onglet Impressions centralise tout l'historique de vos impressions 3D.</p>

<h4>Créer une impression</h4>
<p>Cliquez sur <strong>+ Nouvelle impression</strong>. Les champs importants sont :</p>
<ul>
  <li><strong>Nom</strong> — identifiant de la pièce</li>
  <li><strong>Imprimante & Filament</strong> — pour les statistiques et alertes de stock</li>
  <li><strong>Filament consommé (g)</strong> — permet les alertes de stock anticipées</li>
  <li><strong>Durée estimée (min)</strong> — utilisée pour calculer le temps restant dans le planning</li>
</ul>

<h4>Statuts disponibles</h4>
<ul>
  <li><strong>Planifié</strong> — impression prévue, apparaît dans le Planning</li>
  <li><strong>En attente</strong> — prête à lancer</li>
  <li><strong>En cours</strong> — impression active</li>
  <li><strong>Terminé / Échec / Annulé</strong></li>
</ul>

<h4>Multi-filaments</h4>
<p>Pour les impressions multi-couleurs, cliquez sur <strong>+ Filament</strong> pour ajouter plusieurs bobines avec leur consommation respective.</p>

<h4>Mode compact</h4>
<p>Le bouton <strong>☰</strong> dans la barre d'actions bascule en mode compact — les lignes sont plus fines avec moins de colonnes, ce qui permet d'afficher environ deux fois plus d'impressions à l'écran. Votre préférence est mémorisée d'une session à l'autre.</p>

<h4>Modèles d'impression</h4>
<p>À la création d'une nouvelle impression, un sélecteur <strong>📋 Modèle</strong> apparaît en haut du formulaire. Choisir un modèle pré-remplit automatiquement les températures, hauteur de couche, remplissage et vitesse. Les modèles sont gérés dans <strong>Paramètres → Imprimantes</strong>.</p>
<p>Depuis la fiche d'une impression, le bouton <strong>📋 Modèle</strong> permet de sauvegarder ses paramètres comme nouveau modèle réutilisable.</p>

<h4>Dupliquer une impression</h4>
<p>Le bouton <strong>⎘</strong> dans la liste crée une copie de l'impression avec tous ses paramètres, statut remis à "En attente". Utile pour relancer une impression identique.</p>

<h4>Photo</h4>
<p>Depuis la fiche détail, vous pouvez ajouter une photo de la pièce imprimée et lui attribuer une note de 1 à 5 étoiles.</p>
    `
  },
  {
    id:    'schedule',
    tab:   'schedule',
    icon:  '📅',
    title: 'Planning',
    content: `
<p>Le Planning est une vue filtrée sur vos impressions ayant le statut <strong>Planifié</strong>. Il n'y a pas de table séparée — toute modification dans le Planning se reflète immédiatement dans l'onglet Impressions.</p>

<h4>Planifier une impression</h4>
<p>Cliquez sur <strong>+ Planifier une impression</strong> ou créez une impression avec le statut "Planifié" et choisissez une date. L'impression apparaît automatiquement dans le Planning.</p>

<h4>Groupes d'affichage</h4>
<ul>
  <li><strong>⚠ En retard</strong> — date dépassée, impression non démarrée</li>
  <li><strong>🔄 En cours</strong> — impression active ou en pause</li>
  <li><strong>📅 À venir</strong> — planifiées dans le futur</li>
  <li><strong>📋 Sans date</strong> — planifiées sans date précise</li>
</ul>

<h4>Alertes stock bobine</h4>
<p>Si le stock d'une bobine est insuffisant pour une impression planifiée, un badge apparaît directement sur la carte :</p>
<ul>
  <li><strong>🟡 Stock limite</strong> — la bobine sera presque vide après l'impression</li>
  <li><strong>🔴 Stock insuffisant</strong> — le filament disponible ne suffira pas</li>
</ul>
<p>L'estimation est calculée automatiquement depuis l'historique de consommation (g/h moyen).</p>
    `
  },
  {
    id:    'filaments',
    tab:   'filaments',
    icon:  '🧵',
    title: 'Filaments',
    content: `
<p>Gérez votre stock de bobines et suivez leur consommation.</p>

<h4>Ajouter une bobine</h4>
<p>Cliquez sur <strong>+ Ajouter</strong> et renseignez au minimum le nom, la matière, et les poids total/restant. Les températures sont pré-remplies selon la matière choisie.</p>

<h4>Pesée</h4>
<p>Le bouton <strong>⚖ Peser</strong> permet d'enregistrer le poids réel de la bobine (avec ou sans bobine vide). Si vous avez renseigné le poids de la bobine vide, PrintFlow calcule automatiquement le filament restant.</p>

<h4>NFC</h4>
<p>Avec un lecteur NFC ACR122U connecté au Raspberry Pi, vous pouvez lier une puce NFC à chaque bobine. Le scan d'une puce sélectionne automatiquement le filament dans le formulaire d'impression.</p>
<p>Pour les bobines ELEGOO, le format NFC natif est supporté — les données sont lues et écrites au format ELEGOO.</p>

<h4>Bobines partielles</h4>
<p>Quand vous avez plusieurs restes de bobines du même filament, vous pouvez les regrouper sous un filament "parent" :</p>
<ul>
  <li>Cliquez sur le bouton <strong>+½</strong> sur la ligne d'un filament pour créer une bobine partielle rattachée</li>
  <li>Ou dans le formulaire d'un filament, utilisez la section <strong>Bobine partielle</strong> pour le rattacher à un parent existant</li>
  <li>Donnez une étiquette libre à chaque partielle (ex: "Reste mars", "Bobine B")</li>
</ul>
<p>Dans la liste, les partielles s'affichent indentées (↳) sous leur parent avec un badge orange. Le parent affiche automatiquement le <strong>Σ stock total du groupe</strong> (toutes bobines confondues). Les alertes de stock tiennent compte du stock cumulé du groupe entier.</p>

<h4>Archivage</h4>
<p>Les bobines vides ou inutilisées peuvent être archivées. Elles disparaissent de la liste principale mais restent dans les statistiques. Activez <strong>Afficher archivés</strong> pour les voir.</p>

<h4>Alertes de stock</h4>
<p>Configurez le seuil d'alerte dans Paramètres → Interface. Les bobines sous ce seuil apparaissent en rouge dans la liste et déclenchent une alerte sur le tableau de bord.</p>
    `
  },
  {
    id:    'projects',
    tab:   'projects',
    icon:  '📁',
    title: 'Projets',
    content: `
<p>Les projets permettent de regrouper plusieurs impressions liées à un même objet ou objectif.</p>

<h4>Créer un projet</h4>
<p>Donnez un nom, un code court (ex: PRJ-001) et une description. Vous pouvez associer des pièces depuis la bibliothèque STL.</p>

<h4>Associer des impressions</h4>
<p>Dans le formulaire d'impression, sélectionnez un projet et nommez la pièce (ex: "Corps", "Couvercle", "Support"). Le projet suit automatiquement l'avancement global.</p>

<h4>Statut automatique</h4>
<p>Le statut du projet se met à jour automatiquement selon l'état des impressions associées. Vous pouvez aussi le forcer manuellement depuis la fiche projet.</p>

<p><em>Note : l'onglet Projets peut être activé/désactivé dans Paramètres → Interface.</em></p>
    `
  },
  {
    id:    'quotes',
    tab:   'quotes',
    icon:  '📄',
    title: 'Devis',
    content: `
<p>L'onglet Devis permet de créer et suivre des devis clients pour vos impressions.</p>

<h4>Créer un devis</h4>
<p>Cliquez sur <strong>+ Nouveau devis</strong> et renseignez :</p>
<ul>
  <li>Nom et email du client</li>
  <li>Description de l'impression</li>
  <li>Filament, imprimante, durée estimée, grammes estimés</li>
  <li>Marge souhaitée (%)</li>
</ul>

<h4>Calcul automatique</h4>
<p>Le coût est calculé en temps réel selon :</p>
<ul>
  <li><strong>Coût matière</strong> = grammes × prix au kg du filament</li>
  <li><strong>Coût électricité</strong> = durée (h) × puissance (W) × tarif kWh</li>
  <li><strong>Marge</strong> = % appliqué sur la somme des deux</li>
</ul>
<p>Le tarif électricité est configurable dans Paramètres → Interface.</p>

<h4>Statuts</h4>
<p>Brouillon → Envoyé → Accepté / Refusé. Le CA accepté est visible dans les stats globales et le rapport hebdomadaire.</p>

<p><em>Note : l'onglet Devis peut être activé/désactivé dans Paramètres → Interface.</em></p>
    `
  },
  {
    id:    'stats',
    tab:   'stats',
    icon:  '📊',
    title: 'Statistiques',
    content: `
<p>Les statistiques offrent plusieurs vues analytiques sur votre activité.</p>

<h4>Vues disponibles</h4>
<ul>
  <li><strong>Global</strong> — synthèse générale, top imprimantes et filaments</li>
  <li><strong>Activité</strong> — courbe d'impressions par mois/trimestre sur 12 mois, avec taux de réussite et heures</li>
  <li><strong>Filaments</strong> — consommation par bobine et matière</li>
  <li><strong>Impressions</strong> — analyse des durées, succès/échecs, répartition</li>
  <li><strong>Consommation</strong> — consommation filament sur 7, 30 ou 90 jours</li>
  <li><strong>Historique</strong> — courbe de consommation filament sur 12 mois par matière, vue mois ou trimestre</li>
  <li><strong>Coûts</strong> — analyse financière des impressions</li>
</ul>

<h4>Export CSV</h4>
<p>Les boutons <strong>⬇ Impressions</strong>, <strong>⬇ Filaments</strong> et <strong>⬇ Stats</strong> exportent les données au format CSV compatible Excel (séparateur point-virgule, encodage UTF-8 avec BOM).</p>
    `
  },
  {
    id:    'library',
    tab:   'library',
    icon:  '📚',
    title: 'Bibliothèque',
    content: `
<p>La bibliothèque permet de stocker et organiser vos fichiers STL et modèles 3D.</p>

<h4>Ajouter un objet</h4>
<p>Créez un objet avec un nom, une description et des tags. Vous pouvez y attacher plusieurs fichiers STL correspondant aux différentes pièces (ex: Corps, Couvercle, Support).</p>

<h4>Versioning</h4>
<p>Chaque fichier peut avoir un numéro de version (v1.0, v2.1...) pour suivre l'évolution de vos modèles.</p>

<h4>Lien impression ↔ bibliothèque</h4>
<p>Lors de la création d'une impression, vous pouvez la lier à un objet de la bibliothèque. Cela permet de retrouver toutes les impressions d'une pièce depuis sa fiche bibliothèque.</p>

<h4>Chemin de stockage</h4>
<p>Le dossier de stockage des fichiers est configurable dans Paramètres → Système. Par défaut : <code>/opt/printflow/library</code></p>
    `
  },
  {
    id:    'maintenance',
    tab:   'maintenance',
    icon:  '🔧',
    title: 'Maintenance',
    content: `
<p>Suivez l'entretien de vos imprimantes et planifiez les interventions récurrentes.</p>

<h4>Enregistrer une maintenance</h4>
<p>Sélectionnez l'imprimante, le type d'intervention (nettoyage, calibration, remplacement buse...), la date réalisée et optionnellement la prochaine échéance.</p>

<h4>Alertes automatiques</h4>
<p>Quand une maintenance approche de sa date d'échéance, une alerte apparaît sur le tableau de bord. Le délai d'alerte est configurable dans Paramètres → Interface.</p>

<h4>Consommables</h4>
<p>Dans la fiche d'une imprimante, l'onglet Consommables permet de suivre l'usure des pièces en heures d'utilisation (buse toutes les 500h, plateau toutes les 200h...). Une alerte se déclenche à 80% du seuil.</p>
    `
  },
  {
    id:    'gallery',
    tab:   'gallery',
    icon:  '🖼',
    title: 'Galerie',
    content: `
<p>La Galerie affiche toutes vos impressions ayant une photo, sous forme de grille visuelle.</p>

<h4>Ajouter une photo</h4>
<p>Les photos s'ajoutent depuis la fiche détail d'une impression (onglet Impressions → clic sur l'impression → bouton 📷). Formats acceptés : JPG, PNG, WebP.</p>

<h4>Filtrer les photos</h4>
<p>Quatre filtres sont disponibles en haut de la galerie :</p>
<ul>
  <li><strong>⭐ Note</strong> — afficher uniquement les impressions avec une note minimale</li>
  <li><strong>🧵 Matière</strong> — filtrer par type de filament (PLA, PETG...)</li>
  <li><strong>🖨 Imprimante</strong> — filtrer par imprimante utilisée</li>
  <li><strong>Tri</strong> — par date, note ou nom</li>
</ul>
<p>Le bouton <strong>↺ Réinitialiser</strong> remet tous les filtres à zéro.</p>

<h4>Lightbox</h4>
<p>Cliquez sur une photo pour l'ouvrir en plein écran. Vous pouvez :</p>
<ul>
  <li>Naviguer entre les photos avec les boutons ‹ › ou les touches ← →</li>
  <li>Voir les informations (note, matière, imprimante, durée, date)</li>
  <li>Ouvrir la fiche complète de l'impression via le bouton "Voir la fiche →"</li>
  <li>Fermer avec ✕ ou la touche Échap</li>
</ul>

<p><em>Note : l'onglet Galerie peut être activé/désactivé dans Paramètres → Interface.</em></p>
    `
  },
  {
    id:    'history',
    tab:   'history',
    icon:  '🕐',
    title: 'Historique',
    content: `
<p>L'historique enregistre toutes les modifications importantes effectuées dans PrintFlow.</p>

<h4>Filtrer par entité</h4>
<p>Utilisez le menu déroulant pour filtrer par type :</p>
<ul>
  <li>🧵 Filaments, 🖨 Impressions, ⚙️ Imprimantes, 📁 Projets</li>
  <li>📄 Devis, 🔧 Maintenance, 📚 Bibliothèque, 📡 NFC</li>
</ul>

<h4>Historique NFC</h4>
<p>Toutes les lectures et écritures NFC sont enregistrées avec la date, le filament concerné, le format utilisé et l'UID de la puce.</p>
    `
  },
  {
    id:    'settings',
    tab:   'settings',
    icon:  '⚙️',
    title: 'Paramètres',
    content: `
<p>Les paramètres sont organisés en 5 onglets.</p>

<h4>Général</h4>
<p>Nom de l'application, thème (clair/sombre/automatique), couleur d'accent, chemins des fichiers.</p>

<h4>Interface</h4>
<p>Activer/désactiver les modules optionnels : Projets, Devis, affichage des prix, des emplacements, alertes stock et maintenance.</p>

<h4>Rapport</h4>
<p>Configuration du rapport hebdomadaire par email (SMTP). Le rapport inclut l'activité de la semaine, la consommation filament, les devis et le planning à venir.</p>

<h4>Système</h4>
<p>Version de l'application, informations système, sauvegarde automatique.</p>

<h4>Données</h4>
<p>Deux options de purge :</p>
<ul>
  <li><strong>Vider des données</strong> — supprime toutes les données d'une catégorie</li>
  <li><strong>📅 Purge par date</strong> — supprime uniquement les données antérieures à une date choisie (impressions, maintenances, devis, historique)</li>
</ul>

<h4>Intégrations</h4>
<p>Configuration Spoolman (gestion de stock filament externe) et Tapo (prises connectées TP-Link).</p>
    `
  },
  {
    id:    'shortcuts',
    tab:   null,
    icon:  '⌨',
    title: 'Raccourcis clavier',
    content: `
<p>PrintFlow dispose de raccourcis clavier pour naviguer rapidement entre les onglets sans utiliser la souris.</p>

<h4>Navigation entre onglets</h4>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin-bottom:12px">
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Tableau de bord</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">d</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Imprimantes</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">i</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Impressions</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">p</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Planning</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">l</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Filaments</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">f</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Projets</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">r</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Bibliothèque</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">b</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Maintenance</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">m</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Statistiques</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">s</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Devis</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">q</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Galerie</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">g</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Historique</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">h</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Paramètres</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">,</kbd></div>
</div>

<h4>Fonctions globales</h4>
<div style="display:flex;flex-direction:column;gap:4px">
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Recherche globale</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">⌘K / Ctrl+K</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Aide en ligne</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">F1</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Cheatsheet raccourcis</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">?</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border)"><span>Fermer modale / panneau</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">Échap</kbd></div>
  <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Galerie — navigation lightbox</span><kbd style="background:var(--bg3);border:0.5px solid var(--border2);border-radius:4px;padding:1px 8px;font-family:monospace;font-size:11px">← →</kbd></div>
</div>

<p style="margin-top:12px"><strong>Note :</strong> les raccourcis sont inactifs quand le curseur est dans un champ de saisie ou qu'une modale est ouverte. Les onglets désactivés (Projets, Devis, Galerie) sont ignorés si le module correspondant est désactivé dans les Paramètres.</p>
    `
  },
  {
    id:    'search',
    tab:   null,
    icon:  '🔍',
    title: 'Recherche globale',
    content: `
<p>La barre de recherche en haut de l'écran permet de trouver rapidement n'importe quel élément dans PrintFlow.</p>

<h4>Utilisation</h4>
<ul>
  <li>Raccourci clavier : <strong>⌘K</strong> (Mac) ou <strong>Ctrl+K</strong> (Windows/Linux)</li>
  <li>Tapez au moins 2 caractères pour lancer la recherche</li>
  <li>Les résultats s'affichent groupés par catégorie</li>
  <li>Cliquez sur un résultat pour naviguer directement vers la fiche</li>
  <li>Naviguez au clavier avec ↑ ↓ et validez avec Entrée</li>
</ul>

<h4>Ce qui est recherché</h4>
<p>La recherche porte simultanément sur les impressions (nom, fichier, notes), filaments (nom, marque, matière, couleur), projets (nom, code), bibliothèque (nom, tags) et devis (client, description).</p>
    `
  },
  {
    id:    'nfc',
    tab:   null,
    icon:  '📡',
    title: 'NFC & ELEGOO',
    content: `
<p>PrintFlow supporte les puces NFC NTAG213/215/216 via un lecteur ACR122U connecté au Raspberry Pi en USB.</p>

<h4>Lier une puce à une bobine</h4>
<ol>
  <li>Ouvrez la fiche d'un filament</li>
  <li>Cliquez sur <strong>📡 Lier une puce</strong></li>
  <li>Approchez la puce du lecteur</li>
  <li>La puce est automatiquement lue et associée</li>
</ol>

<h4>Format ELEGOO</h4>
<p>Les bobines ELEGOO utilisent un format NFC propriétaire. PrintFlow peut lire et écrire ce format :</p>
<ul>
  <li><strong>Lire</strong> — approchez une bobine ELEGOO, les informations (matière, couleur, température) sont lues automatiquement</li>
  <li><strong>Écrire</strong> — le bouton <strong>◈ Écrire format ELEGOO</strong> programme une puce vierge au format ELEGOO depuis les données du filament</li>
</ul>

<h4>Scan rapide</h4>
<p>L'icône 📡 NFC dans le formulaire d'impression permet de scanner une bobine pour la sélectionner automatiquement.</p>
    `
  },
];

// ── Moteur de l'aide ──────────────────────────────────────────────────────

let _helpOpen    = false;
let _helpSection = null;

// Raccourci F1
document.addEventListener('keydown', function(e) {
  if (e.key === 'F1') { e.preventDefault(); toggleHelp(); }
  if (e.key === 'Escape' && _helpOpen) closeHelp();
});

function toggleHelp() {
  _helpOpen ? closeHelp() : openHelp();
}

function openHelp() {
  _helpOpen = true;
  const overlay = document.getElementById('help-overlay');
  const drawer  = document.getElementById('help-drawer');
  if (overlay) overlay.style.display = 'block';
  if (drawer)  { drawer.style.display = 'flex'; setTimeout(function() { drawer.style.transform = 'translateX(0)'; }, 10); }
  renderHelpNav();
  // Ouvrir la section correspondant à l'onglet actif
  const section = HELP_SECTIONS.find(function(s) { return s.tab === currentTab; })
                || HELP_SECTIONS[0];
  showHelpSection(section.id);
}

function closeHelp() {
  _helpOpen = false;
  const drawer  = document.getElementById('help-drawer');
  const overlay = document.getElementById('help-overlay');
  if (drawer)  { drawer.style.transform = 'translateX(100%)'; setTimeout(function() { drawer.style.display = 'none'; }, 260); }
  if (overlay) overlay.style.display = 'none';
  // Effacer la recherche
  const si = document.getElementById('help-search');
  if (si) si.value = '';
}

function renderHelpNav() {
  const nav = document.getElementById('help-nav');
  if (!nav) return;
  nav.innerHTML = HELP_SECTIONS.map(function(s) {
    return '<button onclick="showHelpSection(\'' + s.id + '\')" id="help-nav-' + s.id + '" ' +
      'style="padding:4px 10px;font-size:11px;border-radius:20px;border:0.5px solid var(--border2);' +
      'background:var(--bg3);color:var(--text2);cursor:pointer;white-space:nowrap">' +
      s.icon + ' ' + s.title + '</button>';
  }).join('');
}

function showHelpSection(id) {
  _helpSection = id;
  // Mettre à jour le nav
  HELP_SECTIONS.forEach(function(s) {
    const btn = document.getElementById('help-nav-' + s.id);
    if (!btn) return;
    btn.style.background = s.id === id ? 'var(--accent)' : 'var(--bg3)';
    btn.style.color      = s.id === id ? '#fff' : 'var(--text2)';
    btn.style.borderColor = s.id === id ? 'var(--accent)' : 'var(--border2)';
  });

  const section = HELP_SECTIONS.find(function(s) { return s.id === id; });
  if (!section) return;

  const content = document.getElementById('help-content');
  if (!content) return;

  // Effacer recherche
  const si = document.getElementById('help-search');
  if (si) si.value = '';

  content.innerHTML =
    '<div style="margin-bottom:16px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
        '<span style="font-size:24px">' + section.icon + '</span>' +
        '<h3 style="margin:0;font-size:17px;font-weight:600">' + section.title + '</h3>' +
      '</div>' +
      '<div class="help-body" style="font-size:13px;line-height:1.7;color:var(--text2)">' +
        section.content +
      '</div>' +
    '</div>';

  // CSS pour le contenu de l'aide
  if (!document.getElementById('help-styles')) {
    const style = document.createElement('style');
    style.id = 'help-styles';
    style.textContent =
      '.help-body h4 { font-size:13px;font-weight:600;color:var(--text);margin:16px 0 6px }' +
      '.help-body p  { margin:0 0 10px }' +
      '.help-body ul,.help-body ol { margin:0 0 10px;padding-left:20px }' +
      '.help-body li { margin-bottom:4px }' +
      '.help-body code { font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:3px }' +
      '.help-body strong { color:var(--text);font-weight:600 }';
    document.head.appendChild(style);
  }

  content.scrollTop = 0;
}

// ── Recherche dans l'aide ─────────────────────────────────────────────────

function onHelpSearch(query) {
  const content = document.getElementById('help-content');
  if (!content) return;
  if (!query || query.trim().length < 2) {
    if (_helpSection) showHelpSection(_helpSection);
    return;
  }

  const q    = query.toLowerCase();
  const hits = [];

  HELP_SECTIONS.forEach(function(section) {
    const text = (section.title + ' ' + section.content).toLowerCase();
    if (text.includes(q)) {
      // Extraire les passages pertinents
      const stripped = section.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const idx = stripped.toLowerCase().indexOf(q);
      const excerpt = idx >= 0
        ? '…' + stripped.substring(Math.max(0, idx - 60), idx + 120) + '…'
        : stripped.substring(0, 150) + '…';
      hits.push({ section, excerpt });
    }
  });

  if (!hits.length) {
    content.innerHTML = '<div style="color:var(--text3);text-align:center;padding:32px 0">' +
      'Aucun résultat pour « ' + query + ' »</div>';
    return;
  }

  // Réinitialiser le nav
  HELP_SECTIONS.forEach(function(s) {
    const btn = document.getElementById('help-nav-' + s.id);
    if (btn) { btn.style.background = 'var(--bg3)'; btn.style.color = 'var(--text2)'; btn.style.borderColor = 'var(--border2)'; }
  });

  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');

  content.innerHTML = '<p style="font-size:12px;color:var(--text3);margin-bottom:16px">' +
    hits.length + ' résultat' + (hits.length > 1 ? 's' : '') + ' pour « ' + query + ' »</p>' +
    hits.map(function(h) {
      return '<div onclick="showHelpSection(\'' + h.section.id + '\')" ' +
        'style="padding:12px;background:var(--bg3);border-radius:var(--radius);' +
        'margin-bottom:8px;cursor:pointer;border:0.5px solid var(--border2)">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<span>' + h.section.icon + '</span>' +
          '<span style="font-size:13px;font-weight:500;color:var(--text)">' + h.section.title + '</span>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text3);line-height:1.5">' +
          h.excerpt.replace(re, '<mark style="background:var(--accent);color:#fff;border-radius:2px;padding:0 2px">$1</mark>') +
        '</div>' +
      '</div>';
    }).join('');
}
