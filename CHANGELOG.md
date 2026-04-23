# Changelog PrintFlow-3D

## [2.4.0] — 2026-04-16

### Ajouté
- **Générateur d'étiquettes filaments** — accessible depuis l'onglet Filaments (bouton 🏷 Étiquettes)
  - 7 préréglages : Avery L7651/L7160/L7163/L7168, Dymo 36×89/54×101, Libre
  - Paramètres complets : colonnes, lignes, dimensions, marges, espacements (entiers)
  - **Étiquette de départ** — reprendre une feuille partiellement utilisée
  - **Copies par bobine** — imprimer N exemplaires de chaque bobine
  - Contenu configurable : QR Code, Nom, Marque, Matière, Couleur, Stock, Températures, Emplacement, N° bobine
  - Sélection individuelle des bobines + boutons Tout/Aucun
  - Aperçu temps réel mis à l'échelle avec QR code SVG représentatif
  - Impression HTML avec QR codes générés (canvas carré, sans doublon img/canvas)
  - **Sauvegarde de la mise en page** — configuration persistante entre sessions
- **Comparaison imprimantes** — nouvel onglet "Comparer" dans les Statistiques
  - Cartes colorées par imprimante avec 4 métriques + barres de progression relatives
  - Badge ⭐ Meilleure imprimante
  - Toggle de période : 7j / 30j / 3 mois / 12 mois
  - Tableau comparatif complet (taux de réussite, heures, filament, note, durée moyenne)
  - Intégré dans le rapport mensuel PDF (page 2)
- **Rapport mensuel PDF** — génération HTML depuis l'onglet Statistiques (bouton 📄 PDF)
  - Page 1 : métriques clés avec comparaison mois précédent (▲▼%)
  - Page 2 : comparaison imprimantes (tableau + cartes visuelles)
  - Page 3 : liste complète des impressions du mois
  - Page 4 : galerie photos 4★ et 5★
- **Toggle thème clair/sombre** — bouton 🌙/☀️ dans la topbar
  - Bascule instantanée, sauvegarde la préférence en base
- **Recherche avancée filaments** — panneau de filtres combinables
  - Finition, propriété spéciale, diamètre, NFC, stock min/max, stock faible %, emplacement
  - Badge avec nombre de filtres actifs, bouton ↺ Réinitialiser
  - Emplacement masqué si paramètre désactivé
- **Vue calendrier planning** — toggle Liste / Semaine / Mois dans la topbar du Planning
  - Vue Mois : grille 7 colonnes, navigation ◀ ▶, aujourd'hui surligné, pastilles colorées par imprimante
  - Vue Semaine : 7 colonnes avec détails (imprimante, durée, badge statut)
  - Légende des couleurs par imprimante
  - Badges alertes bobines 🟡🔴 dans les deux vues
- **QR Code par bobine** — bouton QR sur chaque ligne filament
  - Modale avec QR + fiche complète de la bobine
  - Bouton 🖨 Imprimer l'étiquette individuelle
  - Scan → ouverture directe dans PrintFlow (`/#filament/:id`)
- **Section Raccourcis clavier** dans l'aide en ligne (F1)
  - Tableau complet de tous les raccourcis par catégorie

### Corrigé
- Purge Historique : table `history_log` → `audit_log` (compteur et suppression)
- Toggle thème sombre : fond `var(--accent-bg)` → `var(--bg3)` + bordure accent (lisible en dark)
- Stats topbar : backtick de fermeture manquant causant une erreur JS au chargement
- Apostrophes non échappées dans `renderStatsGlobal` (exportCSV, Temps d'impression)

---

## [2.3.0] — 2026-04-15

### Ajouté
- Bobines partielles, raccourcis clavier, validation poids filament
- Tableau de bord personnalisable (9 widgets activables)
- Recherche avancée impressions (8 critères combinables)
- Alertes stock filament améliorées

---

## [2.2.0] — 2026-04-14

### Ajouté
- Moonraker temps réel, export CSV, galerie photos, aide en ligne
- Recherche globale, alertes bobines planifiées, stats activité
- Responsive tablette, purge par date, historique enrichi

---

## [2.1.0] — 2026-04-13
- Devis client, planning intégré, toggle modules

## [2.0.0] — 2026-04-13
- Intégration Tapo P100

## [1.9.0] — 2026-04-13
- NFC ELEGOO, rapport SMTP, thème auto, multi-filaments

---

## [2.5.0] — 2026-04-19

### Ajouté
- **Mode kiosque tactile** — page `/kiosk` dédiée à l'écran 7" 1024×600
  - 3 imprimantes côte à côte avec Moonraker live (état, températures, progression, fichier, temps restant)
  - Bordure colorée selon état (orange = en cours, rouge = erreur)
  - Colonne alertes (stock faible, bobines insuffisantes, maintenance)
  - Planning des prochaines impressions
  - Stats du jour (impressions, taux réussite, heures, grammes)
  - Mode nuit automatique (brightness 0.4 entre 22h et 7h)
  - Notification plein écran à la fin/échec d'impression Moonraker
  - Thème automatique synchronisé avec les paramètres de l'application
- **Panneaux overlay kiosque** — sans jamais quitter la page
  - Nouvelle impression — formulaire rapide 4 champs
  - Planning — liste des impressions planifiées
  - Filaments — grille de toutes les bobines avec stock
  - Pesée — sélection bobine + pavé numérique tactile 3×4
- **Pesée avec pavé numérique** — saisie du poids brut, calcul automatique net (brut - tare bobine), affichage coloré selon % restant
- **Endpoint PATCH `/api/filaments/:id/weigh`** — mise à jour ciblée du poids restant sans écraser les autres champs
- **Bypass auth localhost** — le kiosque sur le Pi n'a pas besoin de token (127.0.0.1 toujours autorisé)

### Corrigé
- Emojis remplacés par du texte (Chromium Pi OS sans polices emoji)
- Thème hardcodé dark → lecture dynamique depuis les settings
- Divs vides `.printer-temps:empty` masqués (plus de carrés)
- Pesée kiosque : PUT → PATCH dédié pour ne pas écraser le filament
- Auth token inclus dans tous les fetch du kiosque via `kioskFetch()`

---

## [2.5.0] — 2026-04-19

### Ajouté
- **Mode kiosque tactile 1024×600** — page `/kiosk` dédiée à l'écran 7"
  - 3 imprimantes côte à côte avec Moonraker live
  - Alertes, planning, stats du jour
  - Mode nuit automatique (22h-7h)
  - Notifications plein écran fin/échec impression
  - Thème clair forcé
  - Curseur masqué (`cursor:none`)
- **Panneaux overlay kiosque** — Nouvelle impression, Planning, Pesée, Filaments
- **Pesée avec pavé numérique tactile** — calcul brut/net automatique (tare bobine)
- **NFC dans le kiosque** — overlay bobine au scan, bouton Peser direct, fermeture auto 10s
  - Indicateur NFC : gris=absent, vert=connecté, bleu=détection
  - Bobine inconnue ignorée silencieusement
- **Endpoint PATCH `/api/filaments/:id/weigh`** — mise à jour poids sans écraser le filament
- **Bypass auth localhost** — kiosque Pi toujours autorisé sans token
- **Notifications Telegram** — bot Telegram configurable dans Paramètres
  - Impression terminée/échouée (Moonraker), stock faible, maintenance
  - Polling Moonraker 30s, vérification stock 1h
  - Bouton Test, toggles individuels par type
- **Sauvegarde incrémentielle NAS** — rsync --link-dest, dossiers horodatés
  - Destination locale ou NAS SMB/CIFS
  - Rapport email après chaque sauvegarde
  - Bouton Tester la connexion NAS
- **Script setup-kiosk.sh** — installation Xorg+Openbox+Chromium sur Pi OS Lite
  - Autologin tty1, démarrage X via .bash_profile
  - Résolution 1024×600, curseur masqué

### Corrigé
- Pesée kiosque : PUT → PATCH dédié (ne plus écraser les données filament)
- Auth token inclus dans tous les fetch du kiosque (`kioskFetch`)
- Emojis remplacés par du texte (Pi OS sans polices emoji)
- Thème hardcodé dark → thème clair forcé
- Divs `.printer-temps:empty { display:none }` (plus de carrés vides)
- `chromium-browser` → `chromium` (Raspberry Pi OS Bookworm)
- Démarrage kiosque : systemd → `.bash_profile` (plus fiable sur Pi OS Lite)

---

## [2.6.0] — 2026-04-19

### Ajouté
- **Devis multi-lignes** — refonte complète du système de devis
  - Table `quote_items` — chaque devis peut contenir plusieurs articles
  - Chaque ligne : désignation, quantité, durée, filament (g), filament sélectionné, imprimante
  - Calcul automatique par ligne : coût matière + électricité + marge → prix unitaire HT
  - Total devis = somme de toutes les lignes (qty × prix unitaire)
  - Aperçu calcul en temps réel pendant la saisie d'une ligne
  - Changement de marge globale → recalcul automatique de toutes les lignes
  - Migration automatique des devis existants (1 ligne par devis)
  - Suppression en cascade (quote_items supprimés avec le devis)
- **Association devis → impression** — lier une impression réalisée à une ligne de devis
  - Colonne `print_id` dans `quote_items` (FK vers `prints`)
  - Bouton Lier par ligne — sélecteur dans la liste des impressions terminées
  - Calcul marge réelle : prix estimé vs coût filament réel de l'impression liée
  - Vue Rentabilité (devis acceptés) : total estimé, coût réel, marge réelle en € et %
  - Barre d'avancement des liaisons par devis
- **Galerie photos améliorée**
  - Filtre période (7 jours, 30 jours, 3 mois, cette année)
  - Badge note en overlay sur chaque photo
  - Point couleur filament et date sur chaque carte
  - Lightbox : panneau d'infos à droite (note, matière, filament, imprimante, durée, filament consommé, notes)
  - Tri par meilleure note en plus du tri par date

- **Coût réel par impression** — calcul automatique au passage en statut "Terminée"
  - Colonnes `real_cost`, `real_filament_cost`, `real_electricity_cost` dans `prints`
  - Coût matière : filament consommé réel × prix/kg
  - Coût électricité : durée réelle × puissance imprimante × tarif kWh (paramètres)
  - Affichage dans la fiche impression : 3 blocs matière / électricité / total
  - Bouton Recalculer (ex: après correction du filament consommé)
  - Colonne coût réel dans la liste des impressions
- **Rapport hebdomadaire enrichi**
  - Consommation par matière (PLA, PETG, ABS...)
  - Activité comparative par imprimante (impressions, taux réussite, heures, filament)
  - Marge réelle globale des devis acceptés liés à des impressions
  - Maintenance à venir dans les 7 prochains jours
  - Nombre d'articles par devis dans la liste des devis récents

### Modifié
- Interface devis : liste affiche le nombre d'articles et le total HT
- Formulaire devis : séparation entête (client, marge, statut) et lignes
- Détail devis : tableau des lignes avec ajout/suppression inline, modal élargi (xl)
- Suppression du bouton Imprimer (outil d'estimation de prix, pas de devis commercial)


---

## [2.7.0] — 2026-04-20

### Ajouté
- **Stats — Rentabilité réelle** — nouvel onglet dans les statistiques
  - Métriques globales : coût total réel, dont matière, dont électricité, coût moyen par impression
  - Marge réelle globale si des impressions sont liées à des devis acceptés
  - Comparaison par imprimante : matière, électricité, total, moyenne par impression
  - Comparaison par matière : filament consommé, coût total, coût moyen
  - Évolution mensuelle du coût réel sur 12 mois (graphique barres + ligne moyenne)
  - Tableau détail : coût réel par impression + devis lié + marge calculée


### Corrigé (audit qualité)
- `schedule.js` non enregistré dans server.js (route morte)
- `real_cost` absent de l'export CSV impressions — ajout des 3 colonnes coût réel
- `console.error` de debug supprimé dans projects.js
- Sélecteur de période bloqué sur 30j dans l'onglet Rentabilité — corrigé
- Bouton refresh kiosque supprimé (rafraîchissement automatique suffisant)
- `tapo_ip` non défini à la création d'une imprimante — corrigé
- Pesée kiosque non enregistrée dans l'historique des pesées — corrigé
- Débordement des colonnes filaments sur les boutons d'action — menu déroulant •••

### Ajouté (suite)
- **Kiosque — Clavier virtuel AZERTY** dans le panneau Nouvelle impression
  - Clavier tactile pour Nom et Fichier source
  - Pavé numérique pour la Durée estimée
- **Kiosque — N° de bobine** affiché dans la liste des filaments
- **Kiosque — Bouton "Voir la fiche"** sur chaque carte filament (ouvre l'overlay NFC)
- **Filament — Champ Fournisseur** (boutique d'achat)
- **Filament — Champ Date d'achat**
- `--disk-cache-size=0` dans Chromium kiosque (évite les problèmes de cache)
- `setup-kiosk.sh` — option rotation écran 180° + installation xinput automatique
