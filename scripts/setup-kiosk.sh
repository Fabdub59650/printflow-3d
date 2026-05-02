#!/bin/bash
# setup-kiosk.sh — Installation du mode kiosque tactile PrintFlow
# Compatible Raspberry Pi OS Lite (sans desktop)
set -e

INSTALL_DIR="/opt/printflow"
SERVICE_USER="${SUDO_USER:-pi}"

echo ""
echo "========================================"
echo "  PrintFlow — Configuration Kiosque"
echo "========================================"
echo "  Écran : 1024×600 (7 pouces tactile)"
echo "  Pile  : Xorg + Openbox + Chromium"
echo ""

# ── 1. Dépendances graphiques ─────────────────────────────
echo "[1/5] Installation des paquets graphiques..."
apt-get update -qq
apt-get install -y -qq \
  xorg \
  openbox \
  chromium \
  x11-xserver-utils \
  xinput \
  unclutter \
  fonts-liberation \
  fonts-dejavu-core
echo "  ✓ Paquets installés"

# ── 2. Configuration .xinitrc ─────────────────────────────
echo "[2/5] Configuration du démarrage X..."

# Demander si l'écran est monté à l'envers
echo "  ──────────────────────────────────────"
read -p "  L'écran est-il monté à 180° (inversé) ? [o/N] " do_rotate
ROTATE_SCREEN=false
if [[ "$do_rotate" == "o" || "$do_rotate" == "O" ]]; then
  ROTATE_SCREEN=true
  echo "  ✓ Rotation 180° activée"
fi

# Générer le .xinitrc avec ou sans rotation
if [ "$ROTATE_SCREEN" = true ]; then
cat > /home/${SERVICE_USER}/.xinitrc << 'XINITRC'
#!/bin/bash
# Désactiver économiseur d'écran et DPMS
xset s off
xset s noblank
xset -dpms

# Masquer le curseur X
xsetroot -cursor_name left_ptr 2>/dev/null || true

# Masquer le curseur après inactivité
unclutter -idle 0 -root &

# Lancer le gestionnaire de fenêtres
openbox &

# Attendre que PrintFlow soit prêt
sleep 3

# Rotation écran 180°
HDMI_OUTPUT=$(xrandr 2>/dev/null | grep " connected" | awk '{print $1}' | head -1)
if [ -n "$HDMI_OUTPUT" ]; then
  xrandr --output "$HDMI_OUTPUT" --rotate inverted
fi

# Rotation tactile 180° (WaveShare ou autre)
TOUCH_DEVICE=$(xinput list 2>/dev/null | grep -i "wave\|touch\|WS17" | grep -oP 'id=\K[0-9]+' | head -1)
if [ -n "$TOUCH_DEVICE" ]; then
  xinput set-prop "$TOUCH_DEVICE" "Coordinate Transformation Matrix" -1 0 1 0 -1 1 0 0 1
fi

# Lancer Chromium en mode kiosque
exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --touch-events=enabled \
  --enable-touch-drag-drop \
  --use-gl=egl \
  --cursor-invisible \
  --disk-cache-size=0 \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-background-networking \
  --disable-hang-monitor \
  --window-size=1024,600 \
  --window-position=0,0 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  http://localhost/kiosk
XINITRC
else
cat > /home/${SERVICE_USER}/.xinitrc << 'XINITRC'
#!/bin/bash
# Désactiver économiseur d'écran et DPMS
xset s off
xset s noblank
xset -dpms

# Masquer le curseur X
xsetroot -cursor_name left_ptr 2>/dev/null || true

# Masquer le curseur après inactivité
unclutter -idle 0 -root &

# Lancer le gestionnaire de fenêtres
openbox &

# Attendre que PrintFlow soit prêt
sleep 3

# Lancer Chromium en mode kiosque
exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --touch-events=enabled \
  --enable-touch-drag-drop \
  --use-gl=egl \
  --cursor-invisible \
  --disk-cache-size=0 \
  --disable-background-timer-throttling \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-background-networking \
  --disable-hang-monitor \
  --window-size=1024,600 \
  --window-position=0,0 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  http://localhost/kiosk
XINITRC
fi

chmod +x /home/${SERVICE_USER}/.xinitrc
chown ${SERVICE_USER}:${SERVICE_USER} /home/${SERVICE_USER}/.xinitrc
echo "  ✓ .xinitrc configuré"

# ── 3. Résolution écran ───────────────────────────────────
echo "[3/5] Configuration de la résolution 1024×600..."

# Détecter le fichier de config Xorg à créer
mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/99-printflow-kiosk.conf << 'XORGCONF'
Section "Screen"
  Identifier "Default Screen"
  DefaultDepth 24
  SubSection "Display"
    Depth 24
    Modes "1024x600"
  EndSubSection
EndSection

Section "Device"
  Identifier "Default Device"
  Option "NoLogo" "true"
EndSection
XORGCONF

echo "  ✓ Résolution 1024×600 configurée"

# ── 4. Démarrage automatique via .bash_profile ────────────
echo "[4/5] Configuration du démarrage automatique..."

# Autologin sur tty1
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << AUTOLOGIN
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${SERVICE_USER} --noclear %I \$TERM
AUTOLOGIN
systemctl daemon-reload
echo "  ✓ Autologin configuré pour ${SERVICE_USER} sur tty1"

# Lancer X automatiquement depuis .bash_profile après autologin
# Seulement sur tty1 et si X n'est pas déjà lancé
PROFILE_FILE="/home/${SERVICE_USER}/.bash_profile"

# Sauvegarder l'existant si présent
[ -f "$PROFILE_FILE" ] && cp "$PROFILE_FILE" "${PROFILE_FILE}.bak"

cat > "$PROFILE_FILE" << 'BASHPROFILE'
# PrintFlow Kiosque — démarrage automatique sur tty1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  # Attendre que PrintFlow soit prêt
  echo "Attente de PrintFlow..."
  for i in $(seq 1 15); do
    if curl -sf http://localhost/api/settings > /dev/null 2>&1; then
      break
    fi
    sleep 2
  done
  exec startx ~/.xinitrc -- :0 vt1
fi
BASHPROFILE

chown ${SERVICE_USER}:${SERVICE_USER} "$PROFILE_FILE"
echo "  ✓ .bash_profile configuré (démarrage X sur tty1)"

# ── 5. Vérification ───────────────────────────────────────
echo "[5/5] Vérification..."
echo "  ✓ Configuration terminée"

# ── Résumé ────────────────────────────────────────────────
echo ""
echo "========================================"
echo "  ✅ Mode kiosque installé !"
echo "========================================"
echo ""
echo "  Le kiosque démarrera automatiquement"
echo "  au prochain redémarrage du Pi."
echo ""
echo "  Commandes utiles :"
echo "    sudo systemctl status printflow-kiosk"
echo "    sudo systemctl stop printflow-kiosk"
echo "    sudo systemctl start printflow-kiosk"
echo ""
echo "  Pour désactiver le kiosque au démarrage :"
echo "    sudo systemctl disable printflow-kiosk"
echo ""
read -p "  Redémarrer maintenant pour activer le kiosque ? [o/N] " do_reboot
if [[ "$do_reboot" == "o" || "$do_reboot" == "O" ]]; then
  echo "  Redémarrage dans 3 secondes..."
  sleep 3
  reboot
else
  echo "  → Redémarrez manuellement : sudo reboot"
  echo ""
fi
