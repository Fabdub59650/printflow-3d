# PrintFlow 3D

**Logiciel de gestion d'impressions 3D et filaments** — conçu pour tourner sur Raspberry Pi avec une interface web accessible depuis n'importe quel appareil du réseau local.

![Version](https://img.shields.io/badge/version-1.6.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Raspberry%20Pi-red)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## Fonctionnalités

- **Filaments** — inventaire, pesées, calcul longueur, alertes stock, colonnes configurables, export PDF/CSV, import CSV
- **Impressions** — suivi avec statuts, filtres, consommation filament
- **Projets** — organisation par projet avec avancement
- **Imprimantes** — gestion du parc, accès interfaces web
- **Bibliothèque** — objets 3D par thèmes, fichiers STL/3MF/OBJ, vue galerie/liste, matières recommandées
- **NFC/RFID** — lecture/écriture puces ELEGOO NTAG213/215, encodage vérifié sur puces originales
- **Dashboard** — métriques, alertes stock, consommation 30j, dernières impressions
- **Statistiques** — consommation par matière sur 7/30/90 jours
- **Sauvegarde** — automatique (cron) + export complet BDD + bibliothèque + config
- **Authentification** — accès par mot de passe optionnel
- **Thèmes** — 8 couleurs, dark mode automatique

---

## Matériel requis

- Raspberry Pi (3B+ ou supérieur) sous **Raspberry Pi OS Trixie** (Debian 12)
- Lecteur NFC **ACR122U** *(optionnel)*
- Puces **NTAG213** ou **NTAG215** *(optionnel)*

---

## Installation

```bash
git clone https://github.com/Fabdub59650/printflow-3d.git
cd printflow-3d
sudo bash scripts/install.sh
```

L'installateur configure Node.js, MariaDB, Nginx, le service systemd et le blacklist NFC.
Interface accessible sur `http://<ip-du-pi>/`

## Mise à jour

```bash
git pull
sudo bash scripts/patch.sh
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Base de données | MariaDB |
| Frontend | HTML/CSS/JS vanilla, Chart.js, jsPDF |
| Reverse proxy | Nginx |
| Process manager | systemd |
| NFC | nfc-pcsc (ACR122U) |

---

## Encodage ELEGOO NTAG — Codes vérifiés sur puces originales

### Page 18 — Matière
| Matière | Hex |
|---------|-----|
| PLA  | `00 80 76 65` |
| PETG | `80 69 84 71` |
| ABS  | `00 65 66 83` |
| TPU  | `00 84 80 85` |
| ASA  | `00 65 83 65` |

### Page 19 — Sous-type `[famille, index, 00, 00]`
| Sous-type | Page 19 | |
|-----------|---------|--|
| Standard | `00 00 00 00` | ✓ |
| PLA+ | `00 01 00 00` | ✓ |
| PLA Silk | `00 03 00 00` | ✓ |
| PLA-CF | `00 04 00 00` | ✓ |
| PLA Matte | `00 06 00 00` | ✓ |
| Rapid PLA+ | `00 0A 00 00` | ✓ |
| PETG-CF | `01 01 00 00` | ✓ |
| PETG-GF | `01 02 00 00` | ✓ |
| TPU 95A | `03 01 00 00` | ✓ |
| ASA | `08 00 00 00` | ✓ |

> Contributions bienvenues : ouvrez une Issue avec le dump (pages 16-24) d'une puce ELEGOO originale pour compléter la table.

---

## Structure

```
printflow-3d/
├── backend/
│   ├── server.js
│   ├── nfc.js
│   ├── backup.js
│   ├── auth.js
│   └── routes/
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/tabs/
├── sql/schema.sql
├── scripts/
│   ├── install.sh
│   └── patch.sh
└── library/          # gitignore — fichiers STL/3MF
```

---

## Licence

MIT — voir [LICENSE](LICENSE)
