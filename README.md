# PrintFlow-3D

**Logiciel de gestion d'impressions 3D** — conçu pour tourner sur Raspberry Pi avec une interface web accessible depuis n'importe quel appareil du réseau local.

![Version](https://img.shields.io/badge/version-2.8.0-blue)
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
- Multi-filaments par impression
- Photo + notation étoiles
- Duplication d'impression en un clic
- Association projet et bibliothèque
- **Coût réel automatique** — calculé à la fin de chaque impression (matière + électricité)

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
- **Fournisseur et date d'achat** par bobine
- **Base de référence poids bobines vides** — onglet dédié, sélection automatique de la tare
- **Duplication** — copier une fiche filament en un clic

### 📄 Devis client *(optionnel)*
- **Multi-lignes** — plusieurs articles par devis avec calcul par ligne
- Calcul automatique : coût matière + électricité + marge %
- Statuts : Brouillon / Envoyé / Accepté / Refusé
- **Association devis → impression** — lien avec l'impression réalisée, calcul de marge réelle
- Vue Rentabilité : estimé vs coût réel, marge en € et %

### 📁 Projets *(optionnel)*
- Organisation d'impressions par projet avec avancement automatique

### 📚 Bibliothèque
- Stockage fichiers STL/3MF/OBJ avec versioning
- Lien impression ↔ objet bibliothèque

### 🖼 Galerie *(optionnel)*
- Vue grille de toutes les photos d'impressions
- Filtres par note, matière, imprimante, **période**
- Lightbox plein écran avec panneau d'infos et navigation clavier

### 📊 Statistiques
- Activité par mois/trimestre sur 12 mois glissants
- Historique consommation filament par matière
- **Rentabilité réelle** — coût réel par imprimante/matière, marge vs devis, évolution mensuelle
- **Export CSV** impressions (avec coût réel), filaments, stats (compatible Excel)

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
- **Activité par imprimante**, consommation par matière
- **Marge réelle** des devis liés à des impressions
- Maintenance à venir dans les 7 prochains jours

### 🗑 Gestion des données
- Purge sélective par catégorie
- **Purge par date** — supprime les données antérieures à une date choisie

### 💡 Autres
- 8 thèmes couleur, dark mode automatique ou programmé
- Authentification par mot de passe (optionnel)
- Sauvegarde automatique (cron)
- **Aide en ligne contextuelle** (F1) avec recherche plein texte
- Interface responsive desktop + tablette
- PWA installable

---

## Matériel requis

- **Raspberry Pi** 3B+ ou supérieur sous Raspberry Pi OS (Debian 12+)
- **Node.js** ≥ 18
- **MariaDB** 10.x
- Lecteur NFC **ACR122U** *(optionnel)*
- Prises **TP-Link Tapo P100** *(optionnel — firmware ≤ 1.3.x)*

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
| Base de données | MariaDB |
| Frontend | Vanilla JS (sans framework) |
| Charts | Chart.js |
| NFC | nfc-pcsc (ACR122U) |
| Chiffrement | AES-256-CBC |
| Déploiement | Raspberry Pi OS + systemd |

---

## Versions

| Version | Date | Highlights |
|---------|------|-----------|
| **2.8.0** | 24/04/2026 | Base référence bobines, duplication filament, doc joint bibliothèque, anti-gel kiosque |
| 2.7.0 | 21/04/2026 | Stats rentabilité, clavier kiosque, fournisseur filament, corrections bugs, rotation écran |
| 2.6.0 | 20/04/2026 | Devis multi-lignes, coût réel impressions, galerie améliorée, rapport enrichi, notifications Telegram, sauvegarde NAS |
| 2.5.0 | 19/04/2026 | Mode kiosque tactile 1024×600, 3 imprimantes, pesée avec pavé numérique, bypass auth localhost |
| 2.4.0 | 16/04/2026 | Générateur d'étiquettes, comparaison imprimantes, rapport PDF, calendrier planning, toggle thème |
| 2.3.0 | 15/04/2026 | Bobines partielles, raccourcis clavier, validation poids filament |
| 2.2.0 | 14/04/2026 | Moonraker temps réel, galerie photos, recherche globale, alertes bobines, aide en ligne, export CSV, responsive tablette |
| 2.1.0 | 13/04/2026 | Devis client, planning intégré, purge par date |
| 2.0.0 | 13/04/2026 | Intégration Tapo P100 |
| 1.9.0 | 13/04/2026 | NFC ELEGOO, rapport SMTP, thème auto, multi-filaments |

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail complet.

---

## Licence

MIT — Fabrice Dubois
