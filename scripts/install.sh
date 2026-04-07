#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "========================================"
echo "  PrintFlow v1.0.0 — Installation Raspberry Pi"
echo "========================================"
echo "  Dossier projet : ${PROJECT_DIR}"
echo ""

# ── Variables ─────────────────────────────────────────────
INSTALL_DIR="/opt/printflow"
LIBRARY_DIR="/opt/printflow/library"
DB_NAME="printflow"
DB_USER="printflow"
DB_PASS="printflow_secret"
SERVICE_USER="${SUDO_USER:-pi}"

# ── 1. Dépendances système ────────────────────────────────
echo "[1/8] Mise à jour et installation des dépendances..."
apt-get update -qq
apt-get install -y -qq curl nginx mariadb-server nodejs npm

# Node.js >= 18 requis
NODE_VER=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VER" ] || [ "$NODE_VER" -lt 18 ]; then
  echo "  Node.js 18+ requis. Installation via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  ✓ Dépendances OK (Node.js $(node --version))"

# ── 2. MariaDB ────────────────────────────────────────────
echo "[2/8] Configuration de MariaDB..."
systemctl enable mariadb --quiet
systemctl start mariadb

# Créer la base et l'utilisateur local
mariadb -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mariadb -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mariadb -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';"

# Créer aussi l'utilisateur avec accès réseau (depuis n'importe quelle IP du LAN)
mariadb -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';"
mariadb -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%';"
mariadb -e "FLUSH PRIVILEGES;"

# Configurer MariaDB pour écouter sur toutes les interfaces
# (par défaut bind-address = 127.0.0.1)
MARIADB_CONF=""
for f in /etc/mysql/mariadb.conf.d/50-server.cnf \
          /etc/mysql/my.cnf \
          /etc/mysql/mysql.conf.d/mysqld.cnf; do
  [ -f "$f" ] && MARIADB_CONF="$f" && break
done

if [ -n "$MARIADB_CONF" ]; then
  # Commenter la ligne bind-address existante et en ajouter une nouvelle
  sed -i 's/^bind-address\s*=.*/# bind-address = 127.0.0.1  # modifié par PrintFlow/' "$MARIADB_CONF"
  # Ajouter bind-address = 0.0.0.0 dans la section [mysqld] si pas déjà présent
  if ! grep -q "^bind-address\s*=\s*0\.0\.0\.0" "$MARIADB_CONF"; then
    sed -i '/^\[mysqld\]/a bind-address = 0.0.0.0' "$MARIADB_CONF"
  fi
  echo "  ✓ MariaDB configuré pour écouter sur toutes les interfaces ($MARIADB_CONF)"
else
  # Créer un fichier de configuration dédié
  cat > /etc/mysql/mariadb.conf.d/99-printflow-network.cnf << 'MYCNF'
[mysqld]
bind-address = 0.0.0.0
MYCNF
  echo "  ✓ MariaDB configuré via /etc/mysql/mariadb.conf.d/99-printflow-network.cnf"
fi

# Redémarrer MariaDB pour appliquer la config réseau
systemctl restart mariadb
sleep 2

mariadb ${DB_NAME} < "${PROJECT_DIR}/sql/schema.sql"
echo "  ✓ Base de données prête"
echo "  ✓ Accès réseau MariaDB activé (port 3306)"

# ── 3. pcscd + polkit pour ACR122U ───────────────────────
echo "[3/8] Configuration NFC (pcscd + polkit)..."
apt-get install -y -qq pcscd pcsc-tools libpcsclite-dev build-essential python3

systemctl enable pcscd --quiet
systemctl start pcscd

mkdir -p /etc/polkit-1/rules.d
cat > /etc/polkit-1/rules.d/99-pcscd-printflow.rules << 'POLKIT'
polkit.addRule(function(action, subject) {
    if (action.id == "org.debian.pcsc-lite.access_pcsc" ||
        action.id == "org.debian.pcsc-lite.access_card") {
        if (subject.local) { return polkit.Result.YES; }
    }
});
POLKIT

# Ajouter l'utilisateur au groupe plugdev pour accès USB
usermod -aG plugdev ${SERVICE_USER} 2>/dev/null || true

# Blacklister les modules nfc kernel qui hijackent l'ACR122U
# (indispensable sur Debian Trixie / Ubuntu 24+)
cat > /etc/modprobe.d/blacklist-nfc.conf << 'MODEOF'
blacklist pn533
blacklist pn533_usb
blacklist nfc
MODEOF
modprobe -r pn533_usb pn533 nfc 2>/dev/null || true

echo "  ✓ pcscd démarré"
echo "  ✓ Règle polkit créée"
echo "  ✓ Modules nfc kernel blacklistés"

# ── 4. Copie des fichiers ─────────────────────────────────
echo "[4/8] Installation des fichiers..."
mkdir -p ${INSTALL_DIR}
mkdir -p ${LIBRARY_DIR}
cp -r "${PROJECT_DIR}/backend"  ${INSTALL_DIR}/
cp -r "${PROJECT_DIR}/frontend" ${INSTALL_DIR}/
chown -R ${SERVICE_USER}:${SERVICE_USER} ${INSTALL_DIR}
echo "  ✓ Fichiers copiés"
echo "  ✓ Dossier bibliothèque : ${LIBRARY_DIR}"

# ── 5. Dépendances Node.js ───────────────────────────────
echo "[5/8] Installation des modules Node.js..."
cd ${INSTALL_DIR}/backend
sudo -u ${SERVICE_USER} npm install --omit=dev --quiet
echo "  ✓ Modules installés"

# ── 6. Nginx ─────────────────────────────────────────────
echo "[6/8] Configuration de Nginx..."
cp "${PROJECT_DIR}/nginx/printflow.conf" /etc/nginx/sites-available/printflow
ln -sf /etc/nginx/sites-available/printflow /etc/nginx/sites-enabled/printflow
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>/dev/null && echo "  ✓ Config Nginx valide"
systemctl enable nginx --quiet
systemctl restart nginx
echo "  ✓ Nginx démarré"

# ── 7. Service systemd ───────────────────────────────────
echo "[7/8] Configuration du service systemd..."
cp "${PROJECT_DIR}/systemd/printflow.service" /etc/systemd/system/printflow.service
sed -i "s/User=pi/User=${SERVICE_USER}/" /etc/systemd/system/printflow.service
# Injecter le chemin de la bibliothèque dans le service
sed -i "s|Environment=NODE_ENV=production|Environment=NODE_ENV=production\nEnvironment=LIBRARY_PATH=${LIBRARY_DIR}|" \
  /etc/systemd/system/printflow.service
systemctl daemon-reload
systemctl enable printflow --quiet
systemctl start printflow
echo "  ✓ Service PrintFlow démarré"

# ── 8. Vérification finale ───────────────────────────────
echo "[8/8] Vérification..."
sleep 3

if systemctl is-active --quiet printflow; then
  IP=$(hostname -I | awk '{print $1}')
  echo ""
  echo "========================================"
  echo "  ✅ PrintFlow v1.0.0 installé avec succès !"
  echo "========================================"
  echo ""
  echo "  Accès local      : http://localhost"
  echo "  Accès réseau     : http://${IP}"
  echo "  Spoolman UI      : http://${IP}/spoolman"
  echo "  Bibliothèque     : ${LIBRARY_DIR}"
  echo ""
  echo "  Commandes utiles :"
  echo "    sudo systemctl status printflow"
  echo "    sudo journalctl -u printflow -f"
  echo "    sudo mariadb ${DB_NAME}"
  echo ""
  echo "  Base de données :"
  echo "    Hôte réseau  : ${IP}:3306"
  echo "    Utilisateur  : ${DB_USER}"
  echo "    Mot de passe : ${DB_PASS}"
  echo "    Base         : ${DB_NAME}"
  echo "    (modifiables dans ${INSTALL_DIR}/backend/.env)"
  echo ""
else
  echo "  ⚠ Le service n'a pas démarré."
  echo "  Logs : sudo journalctl -u printflow -n 50"
  exit 1
fi
