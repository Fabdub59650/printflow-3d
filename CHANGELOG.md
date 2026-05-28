# Changelog PrintFlow-3D

## [2.9.6] — 2026-05-28

### Améliorations infrastructure
- **Quirks USB UAS** : ajout des chipsets ASMedia `174c:55aa` et `174c:235c` dans `cmdline.txt` pour éviter les freezes SSD
- **Architecture kiosque** : déport du kiosque sur Pi 3 séparé — nouveau script `scripts/setup-kiosk-pi3.sh`
- **Stockage SSD** : déplacement de `library/`, `prints/` et `backups/` vers SSD USB monté sur `/mnt/data`
- **Surveillance SSD** : nouveau script `scripts/check-ssd.js` avec timer systemd (toutes les 5 min) et alerte Telegram si SSD non monté ou espace critique

### Fichiers ajoutés
- `scripts/check-ssd.js` — surveillance SSD + alerte Telegram
- `scripts/setup-kiosk-pi3.sh` — installation kiosque standalone Pi 3 / Debian Trixie

---

## [2.9.5] — 2026-05-25

### Corrigé
- Corrections diverses et stabilisation

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
- **Kiosque — Écran de veille** — fond noir avec horloge plein écran, date et stats du jour après 2 min d'inactivité
- **Kiosque — Anti-gel RAF** — requestAnimationFrame pour l'horloge et le watchdog de gel
- **Kiosque — Démarrage fiable** — boucle until curl pour attendre Nginx + PrintFlow avant Chromium
- **Kiosque — Redémarrage auto** — boucle while true dans .xinitrc si Chromium plante
- **Bibliothèque — Quantité et couleur à la création** — champs présents dans le formulaire d'import

### Modifié
- Tarif électricité déplacé vers Paramètres → Imprimantes
- Modèles d'impression placés dans Paramètres → Imprimantes

### Corrigé
- Mode compact : renderPrintRows → renderPrintsTable (fonction inexistante)
- Sections repliables : consommables ne se repliait pas
- Kiosque — écran de veille : heure mise à jour via rafLoop (setTimeout gelé par Chromium)
- Kiosque — watchdog rechargement : seuil augmenté à 120s
- Bibliothèque — compteur fichiers : mis à jour après import et retrait de fichier

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
- **Kiosque — Anti-gel amélioré** — rechargement automatique si gel détecté
- **Rapport mensuel enrichi** — coût réel, détail matière/électricité, taux réussite 12 mois, filaments à surveiller
- **Galerie — Filtres supplémentaires** — tri par coût réel et durée, filtre par statut
- **Fiche impression — Détail coût** — formule de calcul visible
- **Paramètres — Tarif électricité** — champ dédié dans Données
- **Dashboard — Mini graphique 7 jours** — barres d'activité avec réussite/échec

### Corrigé
- Test Telegram : fonctionnait pas si token masqué → utilise la config stockée en base
- Kiosque : 502 au démarrage → sleep 15 dans .xinitrc
- Sélecteur période prédiction stock : ne s'appliquait pas

---

## [2.9.2] — 2026-05-03

### Ajouté
- **Stats — Taux de réussite** — graphique d'évolution sur 12 mois avec courbe mensuelle, ligne objectif 90%, tendance
- **Stats — Prédiction stock filaments** — consommation hebdomadaire, date estimée d'épuisement, alertes visuelles

---

## [2.9.1] — 2026-05-02

### Corrigé
- Export Excel : erreur de syntaxe JS sur les boutons (apostrophes dans window.open)
- Export Excel : fonction exportExcel() ajoutée globalement dans app.js

---

## [2.9.0] — 2026-05-02

### Ajouté
- **Export/Import bibliothèque** — exporter un objet complet en ZIP (fichiers 3D + photo + document joint + métadonnées)
- **Traçabilité devis** — création, modification, changement de statut, suppression enregistrés dans l'historique
- **Traçabilité paramètres** — modifications importantes loguées
- **Santé système** — widget dans Paramètres → Système (température CPU, RAM, disque, uptime, IP, statut service)
- **Mise à jour automatique** — vérification GitHub, installation en un clic, redémarrage automatique
- **Raccourci clavier** — touche `w` pour l'onglet Bobines réf.

### Corrigé
- Onglet Système vide — `process.version` non disponible dans le navigateur
- Version affichée 0.0.0 dans l'updater — lecture depuis package.json en fallback
- Bibliothèque stats : `file_count` → `total_files`

---

## [2.8.0] — 2026-04-24

### Ajouté
- **Thème de couleur** — sauvegarde immédiate au clic sans bouton Enregistrer (8 couleurs)
- **Base de référence poids bobines vides** — nouvel onglet "Bobines réf." avec 22 entrées préremplies
- **Duplication filament** — bouton "Dupliquer" dans le menu •••
- **Bibliothèque — Document joint** — PDF ou image attaché à un objet
- **Bibliothèque — Quantité et couleur** — champs dans la fiche élément
- **Bibliothèque — Nexprint** — badge coloré pour les liens ELEGOO Nexprint
- **Kiosque — Anti-gel** — Page Visibility API + watchdog + retry réseau
- **second modal (modal2)** — pour les sélecteurs par-dessus les formulaires

### Corrigé
- Fiche objet bibliothèque : nom affiché deux fois
- Fiche objet bibliothèque : photo tronquée → object-fit:contain
- Token auth : cookie persistant 1 an
- Mot de passe NAS chiffré AES-256-GCM
- Métadonnées sauvegardes stockées en BDD

---

## [2.7.0] — 2026-04-20

### Ajouté
- **Stats — Rentabilité réelle** — métriques globales, marge réelle, comparaison par imprimante et matière, évolution mensuelle sur 12 mois

### Corrigé
- `schedule.js` non enregistré dans server.js
- `real_cost` absent de l'export CSV
- `tapo_ip` non défini à la création d'une imprimante
- Pesée kiosque non enregistrée dans l'historique
- Débordement colonnes filaments → menu déroulant •••

### Ajouté (suite)
- **Kiosque — Clavier virtuel AZERTY** dans le panneau Nouvelle impression
- **Kiosque — N° de bobine** affiché dans la liste des filaments
- **Filament — Champ Fournisseur** et **Date d'achat**
- `setup-kiosk.sh` — option rotation écran 180° + installation xinput automatique

---

## [2.6.0] — 2026-04-19

### Ajouté
- **Devis multi-lignes** — refonte complète avec table `quote_items`, calcul automatique par ligne, aperçu temps réel
- **Association devis → impression** — lier une impression réalisée à une ligne de devis, calcul marge réelle
- **Galerie photos améliorée** — filtre période, badge note, lightbox avec panneau d'infos, tri par note
- **Coût réel par impression** — calcul automatique au passage en statut "Terminée"
- **Rapport hebdomadaire enrichi** — consommation par matière, activité par imprimante, marge réelle

### Modifié
- Interface devis : liste affiche le nombre d'articles et le total HT
- Suppression du bouton Imprimer dans les devis

---

## [2.5.0] — 2026-04-19

### Ajouté
- **Mode kiosque tactile** — page `/kiosk` dédiée à l'écran 7" 1024×600
  - 3 imprimantes côte à côte avec Moonraker live (état, températures, progression)
  - Mode nuit automatique (22h-7h), notifications plein écran fin/échec impression
- **Panneaux overlay kiosque** — Nouvelle impression, Planning, Pesée, Filaments
- **Pesée avec pavé numérique tactile** — calcul brut/net automatique (tare bobine)
- **NFC dans le kiosque** — overlay bobine au scan, indicateur NFC
- **Notifications Telegram** — bot configurable, polling Moonraker 30s, vérification stock 1h
- **Sauvegarde incrémentielle NAS** — rsync --link-dest, dossiers horodatés
- **Script setup-kiosk.sh** — installation Xorg+Openbox+Chromium sur Pi OS Lite

### Corrigé
- `chromium-browser` → `chromium` (Raspberry Pi OS Bookworm)
- Démarrage kiosque : systemd → `.bash_profile` (plus fiable sur Pi OS Lite)
- Pesée kiosque : PUT → PATCH dédié

---

## [2.4.0] — 2026-04-16

### Ajouté
- **Générateur d'étiquettes filaments** — 7 préréglages, étiquette de départ, copies par bobine, QR code
- **Comparaison imprimantes** — cartes colorées, badge ⭐ Meilleure imprimante, toggle période
- **Rapport mensuel PDF** — 4 pages (métriques, comparaison, liste impressions, galerie photos)
- **Toggle thème clair/sombre** — bouton 🌙/☀️ dans la topbar
- **Recherche avancée filaments** — 8 filtres combinables
- **Vue calendrier planning** — toggle Liste / Semaine / Mois
- **QR Code par bobine** — modale avec QR + fiche complète, scan → ouverture directe

### Corrigé
- Purge Historique : table `history_log` → `audit_log`
- Stats topbar : backtick de fermeture manquant

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

### Ajouté
- Devis client, planning intégré, toggle modules

---

## [2.0.0] — 2026-04-13

### Ajouté
- Intégration Tapo P100

---

## [1.9.0] — 2026-04-13

### Ajouté
- NFC ELEGOO, rapport SMTP, thème auto, multi-filaments
