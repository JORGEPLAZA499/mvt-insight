#!/usr/bin/env bash
# Instalador automático de MVT (Mobile Verification Toolkit) para macOS
# Uso directo:  curl -fsSL <url>/scripts/instalar-mvt-macos.sh | bash
# Uso local:    bash instalar-mvt-macos.sh
set -e

cat <<'BANNER'
============================================================
  Spyware Forensic Analyzer — Instalador MVT (macOS)
  Se instalará: Homebrew, Python 3.11, libusb,
  android-platform-tools y mvt (vía pip --user).
============================================================
BANNER

if [ -t 0 ]; then TTY=/dev/stdin; else TTY=/dev/tty; fi
printf "¿Continuar? [s/N]: "
read -r ANSWER < "$TTY" || ANSWER=""
case "$ANSWER" in
  s|S|si|SI|Si|y|Y|yes|YES) ;;
  *) echo "Cancelado."; exit 0 ;;
esac
echo


# 1. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  echo "==> Instalando Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "==> Homebrew ya instalado."
fi

# 2. Dependencias del sistema
echo "==> Instalando python, libusb y android-platform-tools..."
brew install python@3.11 libusb android-platform-tools || true

# 3. MVT
echo "==> Instalando mvt vía pip..."
python3 -m pip install --user --upgrade pip
python3 -m pip install --user mvt

# 4. PATH
USER_BIN="$(python3 -m site --user-base)/bin"
case ":$PATH:" in
  *":$USER_BIN:"*) ;;
  *) echo "export PATH=\"$USER_BIN:\$PATH\"" >> ~/.zshrc ;;
esac
export PATH="$USER_BIN:$PATH"

# 5. Verificación
echo
echo "==> Verificando instalación..."
adb version | head -n1 || echo "adb no encontrado"
mvt-ios version 2>/dev/null || true
mvt-android version 2>/dev/null || true

echo
echo "✅ Listo. Reinicia la terminal y ejecuta:"
echo "   bash analizar-android.sh    # para Android"
echo "   bash analizar-ios.sh        # para iOS"
