# Changelog

## [1.9.0] — 2026-04-11

### Ajouté
- **Photo impression** — upload, miniature dans tableau, suppression, export PDF avec photo
- **Graphique activité dashboard** — grille 12 mois type GitHub, tooltip, légende intensité
- **Calcul coût impression** — filament + électricité, onglet Coûts dans Statistiques, export PDF
- **Consommables imprimantes** — suivi huile/lubrifiant/HEPA/courroies etc. par compteur d'heures auto, alerte dashboard à 80%, bouton ✓ Remplacé, 8 modèles prédéfinis
- Champ puissance (W) dans fiche imprimante
- Prix kWh configurable dans l'onglet Coûts
- Chemin de stockage photos impressions configurable dans Paramètres
- Routes API : photo impression, stats/activity, stats/costs, consumables (CRUD + reset + alerts + templates)

### Corrigé
- jsPDF UMD exposé sous window.jspdf.jsPDF et non window.jsPDF

---

[OLD_1.9.0] — 2026-04-11

### Ajouté
- **Photo impression** — upload d'une photo du résultat depuis la fiche détail, miniature dans le tableau, suppression possible. Stockage dans `/opt/printflow/prints/`
- **Graphique activité dashboard** — grille type GitHub sur 12 mois, colorée selon l'intensité d'impressions (0 à 6+ par jour), tooltip au survol avec la date et le nombre
- **Calcul coût impression** — coût filament (g × prix/kg) + coût électricité (W × durée × prix kWh) affichés dans la fiche détail et dans un nouvel onglet "Coûts" des Statistiques
- **Export PDF fiche impression** — photo + paramètres + coûts + notes en PDF A4
- **Consommation électrique imprimante** — champ "Watts" dans la fiche imprimante, utilisé pour le calcul du coût
- **Prix kWh configurable** — dans l'onglet Coûts des Statistiques, bouton ⚙ Modifier
- Onglet "Coûts" dans les Statistiques — total filament, électricité et coût global par période (7/30/90/365 jours), détail par matière et par impression
- Routes API : `POST/GET/DELETE /api/prints/:id/photo`, `GET /api/stats/activity`, `GET /api/stats/costs`
- Colonne SQL `photo_path` dans `prints`, `power_consumption` dans `printers`, clé `electricity_price_kwh` dans `settings`

### Corrigé
- `markMaintenanceDone` dupliqué dans dashboard.js après ajout du graphique activité

---


## [1.8.0] — 2026-04-11

### Ajouté
- **Intégration TigerTag Scale** — balance connectée ESP32 avec lecteur RFID. Quand une bobine est posée et stabilisée, la pesée est créée automatiquement dans PrintFlow via webhook local (sans cloud TigerTag). L'OLED de la balance affiche le poids net retourné par PrintFlow.
- Route `POST /api/tigertag/webhook` — reçoit `uid_hex` + `weight_gross`, trouve le filament, calcule le net, enregistre la pesée, retourne `weight_available` au format compatible TigerTag Scale
- Route `GET /api/tigertag/status` — dernières pesées reçues via TigerTag Scale
- Section Paramètres "TigerTag Scale" — URL du webhook à configurer sur l'ESP32, tableau des dernières pesées reçues
- **Firmware ESP32 patché** (`tigertag-scale-patch.cpp`) — `pushWeightToCloud()` réécrite pour appeler PrintFlow, route `/api/printflow-config` pour configurer l'URL depuis l'interface web de la balance

### Corrigé
- Édition d'un filament efface le lien NFC — `nfc_uid`, `spool_number` et `elegoo_subtype` préservés si absents du body du PUT
- URL webhook TigerTag Scale non affichée dans les Paramètres au chargement de la page
- Onglet "Impressions" ajouté dans Statistiques (durée estimée vs réelle, taux réussite)

---

## [1.7.1] — 2026-04-09

### Ajouté
- **Restauration sauvegarde** — section dédiée dans Paramètres, upload `.sql` ou `.tar.gz`, bouton ↺ sur chaque sauvegarde listée, confirmation avant action, rechargement automatique après succès
- **Graphique évolution stock bobine** — bouton 📈 dans le tableau filaments, courbe Chart.js basée sur l'historique des pesées avec ligne de stock total
- **Stats impressions** — nouvel onglet "Impressions" : durée estimée vs réelle (graphique barres + tableau écarts), taux de réussite par imprimante et par filament

### Corrigé
- logAction manquant dans routes filaments, impressions, imprimantes et bibliothèque
- restoreUpload non défini au démarrage (multer/os déclarés au niveau global)
- node_modules/ et library/ inclus dans le zip GitHub (nettoyage .gitignore)

---

## [1.7.0] — 2026-04-08

### Ajouté
- **PWA** — installable sur mobile/tablette, icônes 192/512px, service worker, cache offline
- **Onglet Historique** — journal des modifications filtrable par entité (filaments, impressions, projets, NFC)
- **Historique NFC** — bouton 📋 dans la fiche filament + filtre NFC dans l'onglet Historique
- **Prévisualisation STL 3D** — rendu Three.js interactif (rotation, zoom) dans la bibliothèque
- **Statistiques objets bibliothèque** — bouton 📊 : impressions, taux de réussite, filament consommé
- **Export PDF fiche objet** — photo + fichiers + matières recommandées + tags en PDF A4
- **Édition maintenance** — bouton ✏, formulaire pré-rempli, routes GET/:id et PUT/:id
- **Alertes maintenance dashboard** — widget code couleur, délai configurable, bouton ✓ Fait
- **HTTPS** — script setup-https.sh (certificat auto-signé 10 ans, Nginx, export client)
- **API REST documentée** — Swagger UI sur /api-docs, fichier openapi.yaml, section Paramètres avec exemple Home Assistant

### Corrigé
- Filtre statut impressions — variable printers hors scope
- Toggle vue galerie/liste bibliothèque — état actif non mis à jour
- Fichier lié à un objet devenant standalone après édition
- Upload bibliothèque — parser multipart remplacé par multer
- Couleurs CSS inline incompatibles Safari

---

## [1.6.0] — 2026-04-06

### Ajouté
- Statistiques de consommation par matière (7/30/90 jours)
- Tri des colonnes filaments par clic sur l'en-tête
- Recherche/filtre rapide dans l'onglet Filaments
- Import CSV de filaments avec mapping automatique
- Filtre par statut dans les impressions (boutons visuels)
- Vue galerie ⊞ / liste ☰ dans la bibliothèque
- Matières recommandées par fichier de bibliothèque

---

## [1.5.0] — 2026-04-05

### Ajouté
- Alertes stock filament sur le dashboard (seuil configurable)
- Historique des écritures NFC par bobine
- Tags bibliothèque avec filtre
- Authentification par mot de passe (optionnelle)
- Script de mise à jour scripts/patch.sh
- Export complet BDD + bibliothèque + config en .tar.gz

---

## [1.2.0] — 2026-04-04

### Ajouté
- Encodage format ELEGOO Centauri Carbon 2 sur NTAG215
- Codes matière et sous-types vérifiés sur puces originales
- Bouton "◈ Écrire ELEGOO" + bouton "🔍 Dump" dans modale NFC

---

## [1.1.0] — 2026-04-03

### Ajouté
- Statistiques filaments : consommation, taux réussite, top 10
- Sauvegarde automatique MariaDB (cron configurable, rétention)
- Archivage des bobines

---

## [1.0.0] — 2026-04-02

### Initial
- Dashboard, imprimantes, impressions, filaments, maintenance, statistiques
- NFC scan rapide, liaison bobine, écriture PrintFlow
- Thèmes couleurs (8), toggle Spoolman, paramètres
- Service systemd, Nginx reverse proxy
