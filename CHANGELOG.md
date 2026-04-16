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
