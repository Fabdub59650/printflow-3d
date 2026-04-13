# Changelog

## [2.1.0] — 2026-04-13

### Ajouté
- **Devis client** — Nouvel onglet avec calcul coût matière + électricité + marge %
  - Formulaire avec client, filament, imprimante, durée, marge configurable
  - Calcul en temps réel, statuts (Brouillon/Envoyé/Accepté/Refusé)
  - Stats globales (total devis, montant total HT, montant accepté)
  - Toggle d'activation dans Paramètres → Interface
  - Inclus dans la purge des données
- **Planning d'impression** — Nouvel onglet (vue filtrée sur les impressions planifiées)
  - Statut "Planifié" ajouté aux impressions avec champ date/heure
  - Vue groupée : En retard / En cours / À venir / Sans date
  - Boutons ▶ Démarrer et ✓ Terminer depuis le planning
  - Synchronisé avec l'onglet Impressions (une seule source de vérité)
- **Paramètre `planned_at`** — Champ date/heure dans le formulaire d'impression
- **Paramètre `quotes_enabled`** — Toggle activation devis dans Paramètres → Interface

### Corrigé
- Planning : suppression de la table `print_schedule` redondante avec `prints`
- Purge données : ajout Devis + suppression bordures rouges incohérentes
- Toggle devis : id `nav-quotes` manquant dans le DOM
- Variable `currentTab` mal référencée (`window._currentTab`) dans settings.js

---

## [2.0.0] — 2026-04-13

### Ajouté
- **Intégration Tapo P100** — Contrôle prises connectées par imprimante
  - Champ IP Prise Tapo dans la fiche imprimante
  - Badge ⏻ cliquable dans la carte imprimante (état on/off)
  - Boutons Allumer/Éteindre dans la fiche détail
  - Association par sélection manuelle depuis la liste du compte Tapo
  - Credentials chiffrés AES-256 dans Paramètres → Intégrations
  - Toggle d'activation (firmware 1.4.0+ : limitation protocole KLAP)
- **Toggle AMS** — Indicateur système multi-filaments dans fiche imprimante
- **Favicon SVG** — Icône dans l'onglet navigateur
- **Nom par défaut "PrintFlow-3D"**
- **Version OS** — Affichée dans Paramètres → Système

### Corrigé
- Modal formulaire imprimante trop courte → `min-height` + classe `modal-wide`
- Multiples corrections de routage Express (conflits `/:id` vs routes nommées)

---

## [1.9.0] — 2026-04-13

### Ajouté
- Paramètres en 5 onglets, multi-filaments, photo impression, versioning bibliothèque
- Rapport hebdomadaire email (SMTP + AES-256), thème sombre automatique
- QR Code, notation étoiles, consommables imprimantes, fiabilité imprimante
- Vider des données sélectives, favicon SVG, toggle AMS
