#!/usr/bin/env bash
# Instalador automático de MVT (Mobile Verification Toolkit) para Linux (Debian/Ubuntu)
# Uso: bash instalar-mvt-linux.sh
set -e

echo "==> Instalador MVT para Linux (Debian/Ubuntu)"
echo

if ! command -v apt >/dev/null 2>&1; then
  echo "❌ Este script asume Debian/Ubuntu (apt). Para otras distros instala manualmente: python3-pip, libusb-1.0-0, adb."
  exit 1
fi

echo "==> Instalando dependencias del sistema (requiere sudo)..."
sudo apt update
sudo apt install -y python3-pip python3-venv libusb-1.0-0 adb sqlite3 zip

echo "==> Instalando mvt vía pip..."
python3 -m pip install --user --upgrade pip
python3 -m pip install --user mvt

USER_BIN="$(python3 -m site --user-base)/bin"
case ":$PATH:" in
  *":$USER_BIN:"*) ;;
  *) echo "export PATH=\"$USER_BIN:\$PATH\"" >> ~/.bashrc ;;
esac
export PATH="$USER_BIN:$PATH"

echo
echo "==> Verificando..."
adb version | head -n1 || true
mvt-android version 2>/dev/null || true
mvt-ios version 2>/dev/null || true

echo
echo "✅ Listo. Reinicia la terminal y ejecuta:"
echo "   bash analizar-android.sh"
echo "   bash analizar-ios.sh"
