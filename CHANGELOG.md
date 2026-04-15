# Changelog PrintFlow-3D

## [2.3.0] — 2026-04-15

### Ajouté
- **Bobines partielles** — gestion de plusieurs bobines du même filament avec suivi individuel du stock
  - Bouton **+½** sur chaque filament pour créer une bobine partielle rattachée
  - Section dédiée dans le formulaire filament avec sélection du parent et étiquette libre
  - Affichage indenté (↳) dans la liste avec badge orange "Partielle · étiquette"
  - Badge **Σ stock total** sur le parent (toutes bobines du groupe confondues)
  - Alertes de stock calculées sur le stock cumulé du groupe entier
  - Tri automatique : les partielles apparaissent juste après leur parent
  - Pré-remplissage automatique matière/couleur depuis le parent à la création
- **Raccourcis clavier** — navigation rapide entre les onglets
  - `d` Dashboard · `i` Imprimantes · `p` Impressions · `l` Planning
  - `f` Filaments · `r` Projets · `b` Bibliothèque · `m` Maintenance
  - `s` Statistiques · `q` Devis · `g` Galerie · `h` Historique · `,` Paramètres
  - `F1` Aide · `⌘K` Recherche · `?` Cheatsheet des raccourcis
  - Flash de confirmation discret à chaque navigation
  - Badge ⌨ sur le bouton ? pour accéder à la cheatsheet
  - Ignorés si focus dans un champ ou modale ouverte
- **Validation poids filament** — le poids restant ne peut pas dépasser le poids total
  - Bordure rouge en temps réel sur le champ si invalide
  - Blocage de la sauvegarde avec message d'erreur explicite
- **Aide en ligne enrichie** — sections Bobines partielles et Galerie ajoutées

### Corrigé
- Comparaison de types int/string pour `parent_filament_id` (String() des deux côtés)
- Calcul du stock total du groupe utilise `allFilaments` complet (pas la liste filtrée)

---

## [2.2.0] — 2026-04-14

### Ajouté
- **Moonraker temps réel** — suivi live des imprimantes Klipper/Fluidd
- **Export CSV** — Impressions, Filaments, Stats
- **Rapport hebdomadaire enrichi** — sections Devis et Planning
- **Statistiques Activité** — courbe d'impressions par mois/trimestre sur 12 mois
- **Statistiques Historique filament** — courbe de consommation par matière
- **Duplication d'impression** — bouton ⎘
- **Recherche globale** — barre de recherche (⌘K / Ctrl+K)
- **Alertes bobines anticipées** — stock insuffisant pour impressions planifiées
- **Galerie photos** — grille, filtres, lightbox, activable dans Paramètres
- **Aide en ligne** — panneau latéral contextuel (F1), 15 sections, recherche plein texte
- **Réorganisation fiche filament** — sections compactes sans scroll
- **Responsive tablette** — sidebar hamburger, grilles adaptées
- **Purge par date** — données antérieures à une date choisie
- **Historique enrichi** — Devis et Maintenance dans l'onglet Historique
- **Retour onglet intelligent** — Planning et Galerie conservés après modification

### Corrigé
- Colonnes SQL ambiguës (created_at, status) dans les stats
- Format ISO datetime pour planned_at (MariaDB)
- Alertes bobines multi-filaments (print_filaments.quantity_estimated)
- Noms de fonctions recherche globale (openFilamentForm, openObjectDetail)

---

## [2.1.0] — 2026-04-13

### Ajouté
- Devis client, Planning intégré, Purge par date, Toggle modules

---

## [2.0.0] — 2026-04-13

### Ajouté
- Intégration Tapo P100

---

## [1.9.0] — 2026-04-13

### Ajouté
- NFC ELEGOO, rapport SMTP AES-256, thème auto, multi-filaments, photo impression
