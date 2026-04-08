# Changelog

## [1.7.0] — 2026-04-08

### Ajouté
- **PWA** — installable sur mobile/tablette, icônes 192/512px, service worker, cache offline, bouton d'installation en sidebar et dans Paramètres
- **Onglet Historique** — journal des modifications filtrable par entité (filaments, impressions, projets, NFC), compatible Safari
- **Historique NFC** — bouton 📋 dans la fiche filament + filtre NFC dans l'onglet Historique, alimenté automatiquement à chaque écriture
- **Prévisualisation STL 3D** — rendu Three.js interactif (rotation, zoom) pour les fichiers STL/3MF/OBJ dans la bibliothèque
- **Statistiques objets bibliothèque** — bouton 📊 : nombre d'impressions, taux de réussite, filament consommé, dernière impression
- **Export PDF fiche objet** — photo + fichiers + matières recommandées + tags en PDF A4
- **Édition maintenance** — bouton ✏, formulaire pré-rempli, routes GET/:id et PUT/:id
- **Alertes maintenance dashboard** — widget avec code couleur (rouge/orange/bleu), délai configurable, bouton ✓ Fait
- **Paramètres alertes maintenance** — toggle on/off + nombre de jours, dans le card alertes stock
- **HTTPS** — script setup-https.sh (certificat auto-signé 10 ans, Nginx HTTPS, export certificat client)
- **API REST documentée** — Swagger UI sur /api-docs, fichier openapi.yaml téléchargeable, section Paramètres avec URL dynamique et exemple Home Assistant
- Routes API : GET/PUT /maintenance/:id, PATCH /maintenance/:id/done, GET /stats/maintenance-alerts, GET /library/objects/:id/stats, GET /library/files/:id, GET /api/history?entity=nfc

### Corrigé
- Filtre statut impressions — variable printers hors scope → window._allPrinters
- Toggle vue galerie/liste bibliothèque — état actif non mis à jour → setLibraryView()
- Boutons filtre statut impressions — classe active non mise à jour → data-val + classList.toggle
- Filtre matière filaments — cliquable sur les en-têtes de groupe
- Fichier lié à un objet devenant standalone après édition — PUT préserve object_id si absent du body
- Matières recommandées non sauvegardées — déplacées de l'objet vers les fichiers
- Compteurs thèmes non actualisés — libraryThemes rechargé dans loadLibraryContent()
- Dashboard impressions récentes — widget masqué si prints vide
- Nom application mis à jour en temps réel après sauvegarde (sidebar + title)
- Suppression photo lors de la suppression d'un objet bibliothèque
- Upload bibliothèque — parser multipart remplacé par multer, barre de progression simulée
- Encodage base64url clés NFC (p256dh/auth)
- Couleurs CSS inline incompatibles Safari (var(--x)22 → hex direct)
- logProjectEvent → logAction dans routes/projects.js
- renderHistory manquant dans TAB_RENDERERS

---

## [1.6.0] — 2026-04-06

### Ajouté
- Statistiques de consommation par matière (graphique courbe + donut, 7/30/90 jours)
- Tri des colonnes filaments par clic sur l'en-tête
- Recherche/filtre rapide dans l'onglet Filaments
- Filtre matière cliquable sur les en-têtes de groupe
- Colonne Couleur séparée dans le tableau filaments
- Import CSV de filaments avec mapping automatique des colonnes
- Filtre par statut dans les impressions (boutons visuels)
- Widget consommation 30j sur le dashboard
- Widget dernières impressions sur le dashboard
- Modale NFC enrichie : stock, progression, températures, notes
- Vue galerie ⊞ / liste ☰ dans la bibliothèque
- Matières recommandées par fichier de bibliothèque
- Route GET /api/library/files/:id
- Mise à jour nom de l'application en temps réel

---

## [1.5.0] — 2026-04-05

### Ajouté
- Alertes stock filament sur le dashboard (seuil configurable)
- Historique des écritures NFC par bobine (table nfc_write_history)
- Tags bibliothèque avec filtre
- Authentification par mot de passe (optionnelle)
- Script de mise à jour scripts/patch.sh
- Export complet BDD + bibliothèque + config en .tar.gz
- Badge NFC en sidebar

---

## [1.2.0] — 2026-04-04

### Ajouté
- Encodage format ELEGOO Centauri Carbon 2 sur NTAG215
- Codes matière et sous-types vérifiés sur puces originales
- Bouton "◈ Écrire ELEGOO" + bouton "🔍 Dump" dans modale NFC
- Champ elegoo_subtype dans fiche filament
- Correction encodage températures >255°C (little-endian 16 bits)

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
