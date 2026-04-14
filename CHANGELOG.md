# Changelog PrintFlow-3D

## [2.2.0] — 2026-04-14

### Ajouté
- **Moonraker temps réel** — suivi live des imprimantes Klipper/Fluidd (Neptune 4 Plus)
  - Températures buse et plateau (actuelle / cible)
  - Progression de l'impression en cours avec temps restant
  - Polling toutes les 10 secondes, arrêt automatique hors onglet
- **Export CSV** — Impressions, Filaments, Stats depuis l'onglet Statistiques
- **Rapport hebdomadaire enrichi** — sections Devis et Planning à venir
- **Statistiques Activité** — courbe d'impressions par mois/trimestre sur 12 mois
  - Volume total, réussies, échouées, heures
  - Toggle Par mois / Par trimestre
- **Statistiques Historique filament** — courbe de consommation par matière sur 12 mois
- **Duplication d'impression** — bouton ⎘ pour copier une impression avec tous ses paramètres
- **Recherche globale** — barre de recherche dans la topbar (⌘K / Ctrl+K)
  - Impressions, filaments, projets, bibliothèque, devis
  - Navigation directe vers la fiche en un clic
- **Alertes bobines anticipées** — avertissement si stock insuffisant pour une impression planifiée
  - Badge 🟡/🔴 sur les cartes du Planning
  - Widget sur le tableau de bord
  - Calcul automatique depuis l'historique de consommation (g/h)
- **Galerie photos** — nouvel onglet avec grille de toutes les photos d'impressions
  - Filtres par note, matière, imprimante, tri
  - Bouton ↺ Réinitialiser les filtres
  - Lightbox plein écran avec navigation clavier ← →
  - Lien vers la fiche impression depuis la lightbox
  - Activable/désactivable dans Paramètres → Interface
- **Aide en ligne** — panneau latéral avec 15 sections contextuelles
  - S'ouvre sur la section de l'onglet actif
  - Recherche plein texte avec surlignage
  - Raccourci F1
- **Réorganisation fiche filament** — formulaire en sections compactes, plus besoin de scroller
- **Responsive tablette** — ajustements CSS pour écrans ≤ 1024px et ≤ 768px
  - Sidebar masquée sur mobile avec bouton hamburger ☰
  - Grilles adaptées, modales responsives
- **Purge par date** — nouvelle section dans Paramètres → Données
  - Supprime les données antérieures à une date choisie
  - Impressions, Maintenances, Devis, Historique
  - Compteur d'entrées avant confirmation
- **Historique enrichi** — Devis et Maintenance dans l'onglet Historique
- **Planning** — retour automatique sur le Planning après modification/suppression d'une impression
- **Galerie** — retour automatique sur la Galerie après fermeture d'une fiche impression
- **Champ date planifiée** — simplifié en sélecteur de date (sans heure)

### Corrigé
- Colonnes SQL ambiguës dans les requêtes stats (created_at, status)
- Format ISO datetime rejeté par MariaDB pour planned_at (T et Z supprimés côté backend)
- Alertes bobines : prise en compte du multi-filaments (print_filaments.quantity_estimated)
- Recherche globale : nom de fonction openFilamentForm, openObjectDetail corrigés
- Polling Moonraker arrêté au changement d'onglet

---

## [2.1.0] — 2026-04-13

### Ajouté
- **Devis client** — calcul coût matière + électricité + marge %, statuts, stats globales
- **Planning d'impression** — vue filtrée sur les impressions planifiées (statut "Planifié")
- **Toggle devis** et **toggle galerie** dans Paramètres → Interface
- **Purge des données** — ajout Devis

### Corrigé
- Toggle devis : id `nav-quotes` manquant, variable `currentTab` mal référencée
- Planning : table `print_schedule` supprimée, intégration directe dans `prints`
- Bordures rouges incohérentes dans la purge des données

---

## [2.0.0] — 2026-04-13

### Ajouté
- **Intégration Tapo P100** — contrôle prises connectées par imprimante
- **Toggle AMS**, **Favicon SVG**, **Version OS**

---

## [1.9.0] — 2026-04-13

### Ajouté
- Paramètres 5 onglets, multi-filaments, photo impression, versioning bibliothèque
- Rapport hebdomadaire SMTP AES-256, thème sombre auto
- QR Code, notation étoiles, consommables, fiabilité imprimante
- Vider données sélectives, NFC ACR122U, format ELEGOO
