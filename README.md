# PrintFlow-3D

**Logiciel de gestion d'impressions 3D** — conçu pour tourner sur Raspberry Pi avec une interface web accessible depuis n'importe quel appareil du réseau local.

![Version](https://img.shields.io/badge/version-2.9.5-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Raspberry%20Pi-red)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![MariaDB](https://img.shields.io/badge/MariaDB-10.x-orange)

---

## Fonctionnalités

### 🖨 Imprimantes
- Gestion du parc avec statistiques (heures, filament, taux de réussite)
- **Suivi temps réel Moonraker/Klipper** — températures buse/plateau, progression, temps restant
- Accès direct aux interfaces web (Fluidd, Mainsail, OctoPrint)
- Consommables avec alertes d'usure
- Intégration prises connectées **TP-Link Tapo P100**

### 📋 Impressions
- Suivi complet avec statuts (Planifié, En attente, En cours, Terminé, Échec, Annulé)
- **Multi-filaments** par impression
- **Multi-fichiers** par impression avec quantités (1 par défaut)
- Photo + notation étoiles
- Duplication d'impression en un clic
- Association projet et bibliothèque
- **Coût réel automatique** — calculé à la fin de chaque impression (matière + électricité)
- **Modèles d'impression** — templates réutilisables

### 📅 Planning
- Vue chronologique des impressions planifiées
- Groupes : ⚠ En retard / 🔄 En cours / 📅 À venir / 📋 Sans date
- **Alertes de stock bobine anticipées** calculées depuis l'historique de consommation

### 🧵 Filaments
- Inventaire complet avec pesées et calcul du stock restant
- Alertes de stock configurables
- Export/Import CSV
- **NFC/RFID** — lecture/écriture puces ELEGOO NTAG213/215/216 (ACR122U)
- Format ELEGOO natif supporté
- Fournisseur et date d'achat par bobine
- **Base de référence poids bobines vides** — tare automatique
- Duplication de fiche filament en un clic
- **Prédiction de stock** — estimation d'épuisement basée sur la consommation

### 📄 Devis client *(optionnel)*
- Multi-lignes — plusieurs articles par devis avec calcul par ligne
- Calcul automatique : coût matière + électricité + marge %
- Statuts : Brouillon / Envoyé / Accepté / Refusé
- **Association devis → impression** — lien avec l'impression réalisée, calcul de marge réelle
- Vue Rentabilité : estimé vs coût réel, marge en € et %

### 📁 Projets *(optionnel)*
- Organisation d'impressions par projet avec avancement automatique

### 📚 Bibliothèque
- Stockage fichiers STL/3MF/OBJ avec versioning
- Prévisualisation 3D interactive
- Thèmes et sous-thèmes, QR code par objet
- Lien vers la source (Thingiverse, Printables, MakerWorld, Cults3D…)
- Document joint (PDF/image)
- Export/Import ZIP de la bibliothèque complète
- Lien impression ↔ objet bibliothèque

### 🖼 Galerie *(optionnel)*
- Vue grille de toutes les photos d'impressions
- Filtres par note, matière, imprimante, période
- Lightbox plein écran avec panneau d'infos et navigation clavier

### 📊 Statistiques
- Activité par mois/trimestre sur 12 mois glissants
- Historique consommation filament par matière
- **Rentabilité réelle** — coût réel par imprimante/matière, marge vs devis, évolution mensuelle
- **Radar de performance** par imprimante
- Export CSV impressions (avec coût réel), filaments, stats
- **Rapport mensuel PDF** — métriques, comparaison imprimantes, galerie photos

### 🖥 Kiosque tactile *(optionnel)*
- Interface dédiée `/kiosk` pour écran tactile 1024×600
- Lecture NFC automatique (ACR122U) — pesée directe à l'approche d'une bobine
- Clavier virtuel intégré
- Suivi Moonraker en temps réel pour 3 imprimantes
- Écran de veille avec horloge animée, anti-gel via `requestAnimationFrame`
- Watchdog de rechargement automatique

### 🎨 PixelIt *(optionnel)*
- Affichage pixel art sur matrice LED
- Rotation automatique : horloge, stats d'impression, météo (Open-Meteo, sans clé API)
- Notifications : impression terminée/échouée, stock faible
- Configurateur complet dans Paramètres → Intégrations

### 🔍 Recherche globale
- Barre de recherche (⌘K / Ctrl+K) dans toute l'application
- Navigation directe vers la fiche

### 🔔 Notifications Telegram
- Alertes en temps réel : impression terminée/échouée, stock faible
- Bot Telegram configurable depuis les Paramètres
- Polling Moonraker 30s, vérification stock 1h

### 📧 Rapport hebdomadaire
- Email automatique SMTP (chiffrement AES-256)
- Activité, filaments, devis, planning à venir, alertes
- Activité par imprimante, consommation par matière
- Marge réelle des devis liés à des impressions
- Maintenance à venir dans les 7 prochains jours

### 💾 Sauvegardes
- **Sauvegarde NAS** — export chiffré AES-256-GCM vers partage réseau
- Sauvegarde automatique MariaDB (cron configurable)
- Streaming direct `tar` vers HTTP sans copie en RAM

### 💡 Autres
- 8 thèmes couleur, dark mode automatique ou programmé
- Authentification par token (cookie `pf_auth` 1 an)
- **Mise à jour automatique** depuis GitHub
- Aide en ligne contextuelle (F1) avec recherche plein texte
- Interface responsive desktop + tablette
- PWA installable
- Santé système : température Pi, espace disque, uptime

---

## Matériel requis

- **Raspberry Pi** 3B+ ou supérieur sous Raspberry Pi OS (Debian 12+)
- **Node.js** ≥ 18
- **MariaDB** 10.x
- Lecteur NFC **ACR122U** *(optionnel)*
- Prises **TP-Link Tapo P100** *(optionnel — firmware ≤ 1.3.x)*
- Matrice LED **PixelIt** *(optionnel)*

---

## Installation

Un script d'installation automatique est fourni pour Raspberry Pi OS (Debian 12+) :

```bash
# Cloner le dépôt
git clone https://github.com/Fabdub59650/printflow-3d.git
cd printflow-3d

# Lancer l'installation automatique (en root)
sudo bash scripts/install.sh
```

Le script installe automatiquement : Node.js 20, MariaDB, Nginx, les dépendances npm, crée la base de données, configure le service systemd et le reverse proxy.

Interface accessible sur **`http://[IP-du-Pi]`** (port 80, proxifié depuis Node.js sur le port 3000 en interne).

---

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | Node.js + Express |
| Base de données | MariaDB (`dateStrings: true`) |
| Frontend | Vanilla JS (sans framework) |
| Charts | Chart.js |
| NFC | nfc-pcsc (ACR122U) |
| Chiffrement | AES-256-GCM |
| Reverse proxy | Nginx |
| Déploiement | Raspberry Pi OS + systemd |

---

## Versions

| Version | Date | Highlights |
|---------|------|-----------|
| **2.9.5** | 25/05/2026 | Intégration PixelIt, multi-fichiers par impression, fiche réorganisée, stats corrigées |
| 2.9.4 | 04/05/2026 | Modèles d'impression, mode compact, logs erreurs, écran de veille kiosque |
| 2.9.3 | 03/05/2026 | Telegram enrichi, radar imprimantes, rapport mensuel PDF, dashboard 7 jours |
| 2.9.2 | 03/05/2026 | Sauvegarde NAS corrigée, stats groupées, prédiction stock |
| 2.9.1 | 02/05/2026 | Corrections export Excel et updater |
| 2.9.0 | 02/05/2026 | Export/import bibliothèque ZIP, traçabilité, santé système, mise à jour auto |
| 2.8.0 | 03/05/2026 | Base référence bobines, duplication filament, doc joint bibliothèque, token auth, anti-gel kiosque |
| 2.7.0 | 21/04/2026 | Stats rentabilité, clavier kiosque, fournisseur filament, corrections bugs |
| 2.6.0 | 20/04/2026 | Devis multi-lignes, coût réel impressions, galerie améliorée, rapport enrichi, sauvegarde NAS |
| 2.5.0 | 19/04/2026 | Mode kiosque tactile 1024×600, 3 imprimantes, pesée avec pavé numérique |
| 2.4.0 | 16/04/2026 | Générateur d'étiquettes, comparaison imprimantes, rapport PDF, toggle thème |
| 2.3.0 | 15/04/2026 | Bobines partielles, raccourcis clavier, validation poids filament |
| 2.2.0 | 14/04/2026 | Moonraker temps réel, galerie photos, recherche globale, alertes bobines, aide en ligne |
| 2.1.0 | 13/04/2026 | Devis client, planning intégré, purge par date |
| 2.0.0 | 13/04/2026 | Intégration Tapo P100 |
| 1.9.0 | 13/04/2026 | NFC ELEGOO, rapport SMTP, thème auto, multi-filaments |

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail complet.

---

## Licence

MIT — Fabrice Dubois
