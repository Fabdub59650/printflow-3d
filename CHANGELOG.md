# Changelog PrintFlow-3D

## [2.9.5] — 2026-05-25

### Ajouté
- **Intégration PixelIt** — affichage pixel art sur matrice LED
  - Configurateur complet dans Paramètres → Intégrations
  - Rotation automatique des écrans au démarrage du service
  - Écrans : horloge, stats d'impression, météo (Open-Meteo, sans clé API)
  - Notifications : impression terminée, échouée, stock faible
  - Réglages : activation, IP, luminosité, couleur horloge, durée par écran
- **Multi-fichiers par impression** — une impression peut contenir plusieurs fichiers avec quantités
  - Table `print_files` avec quantité par fichier (1 par défaut)
  - Interface de gestion dans la fiche impression
- **Fiche impression réorganisée** — meilleure lisibilité des sections
- **Stats corrigées** — calculs dynamiques sans colonnes cachées

### Corrigé
- Écran de veille kiosque — emojis remplacés par texte, horloge via `requestAnimationFrame`
- Export complet — streaming direct `tar` sans copie en RAM
- Checkboxes PixelIt — alignement texte corrigé


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

---

## [2.8.0] — 2026-04-24

### Ajouté
- **Thème de couleur** — sauvegarde immédiate au clic sans bouton Enregistrer (8 couleurs)
- **Base de référence poids bobines vides** — nouvel onglet "Bobines réf." dans la navigation
  - 22 entrées préremplies (Bambu Lab, Elegoo, Polymaker, Prusament, Sunlu, Hatchbox, eSUN...)
  - Bouton 📋 dans le formulaire filament pour sélectionner la tare automatiquement
  - Gestion complète : Ajouter, Modifier, Supprimer
- **Duplication filament** — bouton "Dupliquer" dans le menu ••• (tare, NFC, N° bobine et date remis à zéro)
- **Bibliothèque — Document joint** — PDF ou image attaché à un objet (aperçu, téléchargement, suppression)
- **Bibliothèque — Quantité et couleur** — champs Quantité et Couleur recommandée dans la fiche élément
- **Bibliothèque — Nexprint** — badge coloré pour les liens ELEGOO Nexprint
- **Kiosque — Anti-gel** — Page Visibility API + watchdog + retry réseau pour éviter le gel après inactivité
- **second modal (modal2)** — pour les sélecteurs par-dessus les formulaires (picker bobines)

### Corrigé
- Fiche objet bibliothèque : nom affiché deux fois (supprimé dans le corps)
- Fiche objet bibliothèque : photo tronquée en galerie et en fiche → object-fit:contain
- Fiche objet bibliothèque : retour bibliothèque après modif fichier → rouvre la fiche
- Fiche objet bibliothèque : retour bibliothèque après modif objet → rouvre la fiche
- Fiche objet bibliothèque : bouton Source en double → supprimé du bas
- Fiche objet bibliothèque : liste fichiers longue → ascenseur vertical si > 4 fichiers
- Vue 3D STL : retour bibliothèque à la fermeture → rouvre la fiche objet
- Kiosque : sélection poids bobine fermait le formulaire filament → modal2 indépendant
- Token auth : cookie persistant 1 an (survit au vidage du cache navigateur)
- Chemin photos impressions lu depuis settings (prints_photo_path) dans la sauvegarde
- Mot de passe NAS chiffré AES-256-GCM
- Métadonnées sauvegardes stockées en BDD (visible même si NAS non monté)

---

## [2.9.0] — 2026-05-02

### Ajouté
- **Export/Import bibliothèque** — exporter un objet complet (fichiers 3D + photo + document joint + métadonnées) en ZIP
  - Bouton "↓ Exporter" dans la fiche objet
  - Bouton "📦 Importer ZIP" dans la barre bibliothèque
  - Format avec manifest.json, reconstruction complète à l'import
- **Traçabilité devis** — création, modification, changement de statut, suppression enregistrés dans l'historique
- **Traçabilité paramètres** — modifications importantes loguées (SMTP, auth, sauvegarde, modules, thème...)
- **Santé système** — widget dans Paramètres → Système
  - Température CPU avec alerte > 75°C
  - Mémoire RAM et espace disque avec barres de progression colorées
  - Uptime, charge CPU, IP réseau, statut service PrintFlow
- **Mise à jour automatique** — widget dans Paramètres → Système
  - Vérification de la dernière version sur GitHub
  - Installation en un clic avec confirmation
  - Redémarrage automatique du service après mise à jour
- **Raccourci clavier** — touche `w` pour l'onglet Bobines réf.

### Corrigé
- Onglet Système vide — `process.version` non disponible dans le navigateur
- Version affichée 0.0.0 dans l'updater — lecture depuis package.json en fallback
- Bibliothèque stats : `file_count` → `total_files` (undefined affiché)

---

## [2.9.1] — 2026-05-02

### Corrigé
- Export Excel : erreur de syntaxe JS sur les boutons (apostrophes dans window.open)
- Export Excel : fonction exportExcel() ajoutée globalement dans app.js

---

## [2.9.2] — 2026-05-03

### Ajouté
- **Stats — Taux de réussite** — nouvel onglet avec graphique d'évolution sur 12 mois
  - Courbe mensuelle avec points colorés (vert/orange/rouge)
  - Ligne objectif 90%, tendance calculée (en hausse/baisse/stable)
  - Tableau détail par mois avec heures et filament consommé
- **Stats — Prédiction stock filaments** — nouvel onglet
  - Consommation hebdomadaire par filament sur période configurable
  - Date estimée d'épuisement et semaines restantes
  - Alertes visuelles : critique (< 10%), faible (< 20%), à surveiller (< 4 semaines)
  - Filaments non utilisés sur la période identifiés

---

## [2.9.3] — 2026-05-03

### Ajouté
- **Telegram — Photo avec impression terminée** — si une photo est associée à l'impression, elle est envoyée directement via Telegram avec la légende
- **Telegram — Coût réel** dans la notification impression terminée
- **Telegram — Résumé quotidien** — message automatique à 20h avec : impressions du jour, heures de chauffe, filament consommé, coût réel, alertes stock faible
- **Telegram — Maintenance préventive** — alerte 24h avant l'échéance d'une maintenance planifiée
- **Telegram — Toggle résumé quotidien** dans les paramètres

---

## [2.9.3] — 2026-05-03

### Ajouté
- **Telegram — Photo avec impression terminée** — envoi de la photo via Telegram avec la légende enrichie
- **Telegram — Coût réel** dans la notification impression terminée
- **Telegram — Résumé quotidien à 20h** — bilan impressions, heures, filament, coût, alertes stock
- **Telegram — Maintenance préventive** — alerte 24h avant l'échéance
- **Telegram — Toggle résumé quotidien** dans les paramètres
- **Stats — Comparaison imprimantes enrichie** — graphique radar + tableau comparatif complet + champions par métrique
- **Stats — Groupes de navigation** — onglets regroupés par thème (Activité, Filaments, Finances, Qualité)
- **Kiosque — Widget prédiction stock** — bobines à commander visible sur l'écran tactile
- **Kiosque — Anti-gel amélioré** — rechargement automatique de la page si gel détecté (comparaison horloge JS vs réelle)
- **Rapport mensuel enrichi** — coût réel, détail matière/électricité, taux réussite 12 mois, filaments à surveiller
- **Galerie — Filtres supplémentaires** — tri par coût réel et durée, filtre par statut
- **Galerie — Vignettes enrichies** — durée et coût réel affichés sur chaque photo
- **Fiche impression — Détail coût** — formule de calcul visible (g × €/kg, min × €/min, €/h)
- **Paramètres — Tarif électricité** — champ dédié dans Données (utilisé pour coûts réels et devis)
- **Dashboard — Mini graphique 7 jours** — barres d'activité avec réussite/échec, résumé heures/grammes/coût

### Corrigé
- Test Telegram : fonctionnait pas si token masqué → utilise la config stockée en base
- Kiosque : layout reorganisé (Planning L2, Aujourd'hui L3, Alertes C3 L2-3, Stock C4 L2-3)
- Kiosque : 502 au démarrage → sleep 15 dans .xinitrc
- Sélecteur période prédiction stock : ne s'appliquait pas → passage de la valeur en paramètre

---

## [2.9.4] — 2026-05-03

### Ajouté
- **Modèles d'impression** — profils de paramètres réutilisables (températures, couche, remplissage, vitesse)
  - Sélecteur dans le formulaire nouvelle impression
  - Bouton "📋 Modèle" dans la fiche pour sauvegarder les paramètres d'une impression
  - Gestion complète dans Paramètres → Imprimantes
- **Mode compact impressions** — bouton ☰ pour afficher ~2x plus d'impressions à l'écran
  - Préférence mémorisée entre les sessions
- **Raccourci "/" recherche** — en plus de Ctrl+K / ⌘K
- **Logs d'erreurs backend** — Paramètres → Système, 200 dernières erreurs avec filtre et bouton vider
- **Sections repliables** — Consommables et Modèles d'impression dans Paramètres → Imprimantes
- **Aide mise à jour** — toutes les fonctionnalités v2.8-v2.9 documentées

### Modifié
- Tarif électricité déplacé vers Paramètres → Imprimantes (logique avec les coûts machines)
- Modèles d'impression placés dans Paramètres → Imprimantes (sous les consommables)

### Corrigé
- Mode compact : renderPrintRows → renderPrintsTable (fonction inexistante)
- Sections repliables : consommables ne se repliait pas

### Ajouté (suite v2.9.4)
- **Kiosque — Écran de veille** — fond noir avec horloge plein écran, date et stats du jour après 2 min d'inactivité
  - Détection via requestAnimationFrame (jamais gelé par Chromium)
  - Un toucher/clic pour réveiller
- **Kiosque — Anti-gel RAF** — requestAnimationFrame pour l'horloge et le watchdog de gel
- **Kiosque — Démarrage fiable** — boucle until curl pour attendre Nginx + PrintFlow avant Chromium
- **Kiosque — Redémarrage auto** — boucle while true dans .xinitrc si Chromium plante
- **Bibliothèque — Quantité et couleur à la création** — champs présents dans le formulaire d'import
- **Bibliothèque — Badge thème** — affiche uniquement les objets directs + sous-thèmes (cohérent avec la navigation)

### Corrigé (final v2.9.4)
- Kiosque — écran de veille : heure mise à jour via rafLoop (setTimeout gelé par Chromium)
- Kiosque — écran de veille : détection inactivité via rafLoop (plus de setTimeout)
- Kiosque — watchdog rechargement : seuil augmenté à 120s (évite rechargement avant veille)
- Bibliothèque — compteur fichiers : mis à jour après import et retrait de fichier
- Bibliothèque — badge thème : compte objets directs + sous-thèmes (cohérent avec navigation)
- Bibliothèque — quantité et couleur : présents à la création d'un fichier
