# PrintFlow-3D

**Logiciel de gestion d'impressions 3D** — conçu pour tourner sur Raspberry Pi avec une interface web accessible depuis n'importe quel appareil du réseau local.

![Version](https://img.shields.io/badge/version-2.4.0-blue)
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

### 📄 Devis client *(optionnel)*
- Calcul automatique : coût matière + électricité + marge %
- Statuts : Brouillon / Envoyé / Accepté / Refusé

### 📁 Projets *(optionnel)*
- Organisation d'impressions par projet avec avancement automatique

### 📚 Bibliothèque
- Stockage fichiers STL/3MF/OBJ avec versioning
- Lien impression ↔ objet bibliothèque

### 🖼 Galerie *(optionnel)*
- Vue grille de toutes les photos d'impressions
- Filtres par note, matière, imprimante
- Lightbox plein écran avec navigation clavier

### 📊 Statistiques
- Activité par mois/trimestre sur 12 mois glissants
- Historique consommation filament par matière
- **Export CSV** impressions, filaments, stats (compatible Excel)

### 🔍 Recherche globale
- Barre de recherche (⌘K / Ctrl+K) dans toute l'application
- Navigation directe vers la fiche

### 📧 Rapport hebdomadaire
- Email automatique SMTP (chiffrement AES-256)
- Activité, filaments, devis, planning à venir, alertes

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
| **2.4.0** | 16/04/2026 | Générateur d'étiquettes, comparaison imprimantes, rapport PDF, calendrier planning, toggle thème |
| 2.3.0 | 15/04/2026 | Bobines partielles, raccourcis clavier, validation poids filament |
| 2.2.0 | 14/04/2026 | Moonraker temps réel, galerie photos, recherche globale, alertes bobines, aide en ligne, export CSV, responsive tablette |
| 2.1.0 | 13/04/2026 | Devis client, planning intégré, purge par date |
| 2.0.0 | 13/04/2026 | Intégration Tapo P100 |
| 1.9.0 | 13/04/2026 | NFC ELEGOO, rapport SMTP, thème auto, multi-filaments |

Voir [CHANGELOG.md](CHANGELOG.md) pour le détail complet.

---

## Licence

MIT — Fabrice Dubois
