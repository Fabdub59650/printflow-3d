#!/bin/bash
# ============================================================
#  PrintFlow — Installation Kiosque standalone
#  Pour Raspberry Pi 3 / Debian Trixie (13)
#  Pointe vers PrintFlow sur 192.168.1.145
# ============================================================

set -e

PRINTFLOW_URL="http://192.168.1.145/kiosk"
SERVICE_USER="pi"
RESOLUTION="1024x600"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; }
info() { echo -e "${YELLOW}  → $1${NC}"; }
err()  { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

# Vérifier root
if [[ $EUID -ne 0 ]]; then
  err "Ce script doit être lancé en root : sudo bash $0"
fi

echo ""
echo "============================================"
echo "  PrintFlow Kiosque — Installation Pi 3"
echo "============================================"
echo "  URL cible  : $PRINTFLOW_URL"
echo "  Utilisateur: $SERVICE_USER"
echo "  Résolution : $RESOLUTION"
echo ""
read -p "Continuer ? [o/N] " confirm
[[ "$confirm" == "o" || "$confirm" == "O" ]] || exit 0
echo ""

# ── 1. Paquets graphiques ─────────────────────────────────
info "Installation des paquets graphiques..."
apt-get update -qq
apt-get install -y -qq \
  xorg \
  openbox \
  chromium \
  x11-xserver-utils \
  unclutter \
  fonts-liberation \
  fonts-dejavu-core
ok "Paquets installés"

# ── 2. Configuration .xinitrc ─────────────────────────────
info "Configuration du démarrage X..."
cat > /home/${SERVICE_USER}/.xinitrc << XINITRC
#!/bin/bash
# Désactiver économiseur d'écran et DPMS
xset s off
xset s noblank
xset -dpms

# Masquer le curseur après 1 seconde d'inactivité
unclutter -idle 1 -root &

# Lancer le gestionnaire de fenêtres
openbox &

# Attendre que le réseau et PrintFlow soient prêts
sleep 8

# Lancer Chromium en mode kiosque
exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --touch-events=enabled \
  --enable-touch-drag-drop \
  --window-size=1024,600 \
  --window-position=0,0 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  $PRINTFLOW_URL
XINITRC

chmod +x /home/${SERVICE_USER}/.xinitrc
chown ${SERVICE_USER}:${SERVICE_USER} /home/${SERVICE_USER}/.xinitrc
ok ".xinitrc configuré"

# ── 3. Résolution écran ───────────────────────────────────
info "Configuration de la résolution ${RESOLUTION}..."
mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/99-kiosk.conf << XORGCONF
Section "Screen"
  Identifier "Default Screen"
  DefaultDepth 24
  SubSection "Display"
    Depth 24
    Modes "${RESOLUTION}"
  EndSubSection
EndSection

Section "Device"
  Identifier "Default Device"
  Option "NoLogo" "true"
EndSection
XORGCONF
ok "Résolution configurée"

# ── 4. Autologin console ──────────────────────────────────
info "Configuration de l'autologin..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << AUTOLOGIN
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${SERVICE_USER} --noclear %I \$TERM
AUTOLOGIN
ok "Autologin configuré"

# ── 5. Démarrage X automatique ────────────────────────────
info "Configuration du démarrage X automatique..."
BASH_PROFILE="/home/${SERVICE_USER}/.bash_profile"
if ! grep -q "startx" "$BASH_PROFILE" 2>/dev/null; then
  cat >> "$BASH_PROFILE" << 'BASHPROFILE'

# Démarrer X automatiquement sur tty1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx
fi
BASHPROFILE
  chown ${SERVICE_USER}:${SERVICE_USER} "$BASH_PROFILE"
fi
ok "Démarrage X configuré"

# ── 6. Script de rechargement kiosque ────────────────────
info "Création du script de rechargement..."
cat > /usr/local/bin/kiosk-reload << 'RELOAD'
#!/bin/bash
# Recharge la page du kiosque
DISPLAY=:0 xdotool key F5 2>/dev/null || true
RELOAD
chmod +x /usr/local/bin/kiosk-reload
ok "Script de rechargement créé"

echo ""
echo "============================================"
echo -e "  ${GREEN}✅ Installation kiosque terminée !${NC}"
echo "============================================"
echo ""
echo "  Prochaine étape : sudo reboot"
echo "  Le kiosque pointera vers : $PRINTFLOW_URL"
echo ""
echo "  En cas de problème :"
echo "  • Vérifier réseau : ping 192.168.1.145"
echo "  • Relancer X manuellement : startx"
echo ""
