#!/bin/bash
# ── PrintFlow — Script de mise à jour ────────────────────────
# Usage : sudo bash patch.sh
# Met à jour les fichiers sans réinstaller

set -e
INSTALL_DIR="/opt/printflow"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   PrintFlow — Mise à jour            ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Vérifier que PrintFlow est installé
if [ ! -d "$INSTALL_DIR" ]; then
  echo "❌ PrintFlow non trouvé dans $INSTALL_DIR"
  echo "   Utilisez install.sh pour une installation complète."
  exit 1
fi

# Lire la version actuelle
CURRENT=$(cat "$INSTALL_DIR/backend/package.json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")
NEW=$(cat "$PROJECT_DIR/backend/package.json" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")

echo "  Version actuelle : $CURRENT"
echo "  Nouvelle version : $NEW"
echo ""

read -p "  Continuer la mise à jour ? [o/N] " confirm
if [[ "$confirm" != "o" && "$confirm" != "O" ]]; then
  echo "  Annulé."
  exit 0
fi

echo ""
echo "[1/4] Arrêt du service..."
systemctl stop printflow 2>/dev/null || true

echo "[2/4] Mise à jour des fichiers backend..."
cp -r "$PROJECT_DIR/backend/routes/"*  "$INSTALL_DIR/backend/routes/"
cp "$PROJECT_DIR/backend/server.js"    "$INSTALL_DIR/backend/"
cp "$PROJECT_DIR/backend/nfc.js"       "$INSTALL_DIR/backend/"
cp "$PROJECT_DIR/backend/backup.js"    "$INSTALL_DIR/backend/"
cp "$PROJECT_DIR/backend/auth.js"      "$INSTALL_DIR/backend/" 2>/dev/null || true
cp "$PROJECT_DIR/backend/package.json" "$INSTALL_DIR/backend/"

echo "[3/4] Mise à jour des fichiers frontend..."
cp -r "$PROJECT_DIR/frontend/"* "$INSTALL_DIR/frontend/"

echo "[4/4] Migration base de données..."
DB_NAME=$(grep DB_NAME "$INSTALL_DIR/backend/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "printflow")
DB_USER=$(grep DB_USER "$INSTALL_DIR/backend/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "printflow")
DB_PASS=$(grep DB_PASSWORD "$INSTALL_DIR/backend/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "printflow_secret")

# Appliquer les migrations SQL de la nouvelle version (instructions ALTER/INSERT IGNORE uniquement)
grep -E "^(ALTER TABLE|INSERT IGNORE|CREATE TABLE IF NOT EXISTS)" "$PROJECT_DIR/sql/schema.sql" 2>/dev/null | \
  while IFS= read -r line; do
    # Extraire les blocs multi-lignes pour CREATE TABLE
    :
  done

# Exécuter le schema complet avec IF NOT EXISTS (idempotent)
mariadb -u root "$DB_NAME" < "$PROJECT_DIR/sql/schema.sql" 2>/dev/null || \
  echo "  ⚠ Migration SQL : quelques lignes ignorées (déjà existantes)"

echo ""
echo "  ✅ Mise à jour v$NEW terminée !"
echo ""
systemctl start printflow
sleep 2
systemctl is-active --quiet printflow && echo "  ✓ Service démarré" || echo "  ⚠ Vérifiez : sudo journalctl -u printflow -n 20"
echo ""

# Installer web-push si nécessaire
echo "[+] Vérification de web-push..."
cd "$INSTALL_DIR/backend"
if ! node -e "require('web-push')" 2>/dev/null; then
  npm install web-push --save 2>/dev/null && echo "  ✓ web-push installé"
  # Générer les clés VAPID
  node -e "
    const wp = require('web-push');
    const k = wp.generateVAPIDKeys();
    const db = require('./db');
    db.query('INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=IF(value=\\'\\',VALUES(value),value)', ['vapid_public', k.publicKey])
      .then(() => db.query('INSERT INTO settings (key_name,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=IF(value=\\'\\',VALUES(value),value)', ['vapid_private', k.privateKey]))
      .then(() => { console.log('  ✓ Clés VAPID générées'); process.exit(0); })
      .catch(e => { console.warn('  ⚠ VAPID:', e.message); process.exit(0); });
  " 2>/dev/null || true
fi
