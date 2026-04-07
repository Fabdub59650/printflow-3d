# Changelog

## [1.6.0] — 2026-04-06

### Ajouté
- Statistiques de consommation par matière (graphique courbe + donut, 7/30/90 jours)
- Tri des colonnes filaments par clic sur l'en-tête
- Recherche/filtre rapide par nom, marque, matière dans l'onglet Filaments
- Filtre par matière cliquable sur les en-têtes de groupe
- Colonne Couleur séparée dans le tableau filaments
- Import CSV de filaments (mapping automatique des colonnes)
- Filtre par statut dans les impressions (boutons visuels)
- Widget consommation 30j sur le dashboard avec donut Chart.js
- Widget dernières impressions sur le dashboard avec statut coloré
- Modale NFC enrichie : stock, progression, températures buse/plateau, notes
- Vue galerie ⊞ / liste ☰ dans la bibliothèque
- Matières recommandées par fichier de bibliothèque
- Route GET /api/library/files/:id
- Suppression de la photo lors de la suppression d'un objet bibliothèque
- Mise à jour du nom de l'application en temps réel après sauvegarde

### Corrigé
- Filtre statut impressions — erreur `Can't find variable: printers`
- Toggle vue galerie/liste — état actif non mis à jour
- Filtre statut impressions — bouton actif non mis à jour
- Fichier lié à un objet devenant standalone après édition
- Matières recommandées non sauvegardées (PUT écrasait object_id)
- Compteurs des thèmes non actualisés sans refresh manuel

---

## [1.5.0] — 2026-04-05

### Ajouté
- Alertes stock filament sur le dashboard (seuil configurable)
- Historique des écritures NFC par bobine
- Tags bibliothèque avec filtre
- Scan NFC → pré-remplissage filament dans le formulaire impression
- Authentification par mot de passe (optionnelle)
- Script de mise à jour `scripts/patch.sh`
- Export complet BDD + bibliothèque + config en .tar.gz
- Badge NFC en sidebar (comme Spoolman)
- Élément actif plus visible en dark mode

### Corrigé
- Middleware auth bloquant le SSE NFC
- `localStorage` au scope global cassant le chargement
- Apostrophe dans chaîne JS (`l'export`)
- Alertes stock affichées même si paramètre désactivé

---

## [1.2.2] — 2026-04-05

### Ajouté
- Toggle Gestion des prix (champ Prix dans fiches filament)
- Toggle Gestion des emplacements (filaments + imprimantes)

---

## [1.2.1] — 2026-04-05

### Ajouté
- Sauvegarde automatique de la bibliothèque (.tar.gz)
- Badge NFC en bas de sidebar
- Élément actif menu plus visible en dark mode

### Corrigé
- Paramètre `backup_library_enabled` non sauvegardé
- Téléchargement .tar.gz bloqué par validation

---

## [1.2.0] — 2026-04-04

### Ajouté
- Encodage format ELEGOO Centauri Carbon 2 sur NTAG215
- Codes matière et sous-types vérifiés sur puces originales
- Bouton "◈ Écrire ELEGOO" + bouton "🔍 Dump" dans modale NFC
- Champ `elegoo_subtype` dans fiche filament
- Correction encodage températures > 255°C (little-endian 16 bits)

---

## [1.1.1] — 2026-04-04

### Ajouté
- Archivage des bobines (toggle + bouton rapide 📦)
- MariaDB accessible réseau (`bind-address = 0.0.0.0`)

---

## [1.1.0] — 2026-04-03

### Ajouté
- Statistiques filaments : consommation, taux réussite, top 10
- Sauvegarde automatique MariaDB (cron configurable, rétention, téléchargement)

---

## [1.0.0] — 2026-04-02

### Initial
- Tableau de bord, imprimantes, impressions, filaments, maintenance, statistiques
- NFC scan rapide, liaison bobine, écriture PrintFlow
- Thèmes couleurs (8), toggle Spoolman, paramètres
- Service systemd, Nginx reverse proxy
