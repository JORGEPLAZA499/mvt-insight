#!/usr/bin/env bash
# Analizador automatico Android con MVT (Linux/macOS) - AndroidQF + check-androidqf
# Uso directo:  curl -fsSL <url>/scripts/analizar-android.sh | bash
# Uso local:    bash analizar-android.sh
set -euo pipefail

echo ""
echo "============================================================"
echo "  Spyware Forensic Analyzer - Analisis Android"
echo "  1) AndroidQF realiza la adquisicion forense del dispositivo"
echo "  2) mvt-android check-androidqf analiza la adquisicion"
echo "============================================================"
echo ""

# Verificar binarios
for cmd in adb mvt-android curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Falta '$cmd'. Ejecuta primero el instalador de MVT y reabre la terminal." >&2
    exit 1
  fi
done

# Verificar dispositivo
echo "==> Verificando conexion USB..."
DEVICES=$(adb devices | awk 'NR>1 && $2=="device"' | wc -l | tr -d ' ')
if [ "$DEVICES" -eq 0 ]; then
  echo "No se detecta ningun dispositivo. Activa 'Depuracion USB' y acepta el RSA en el telefono." >&2
  exit 1
fi
echo "Dispositivo detectado."

# Detectar OS y arquitectura
OS_RAW=$(uname -s)
ARCH_RAW=$(uname -m)
case "$OS_RAW" in
  Linux)  OS_TAG="linux" ;;
  Darwin) OS_TAG="macos" ;;
  *) echo "SO no soportado: $OS_RAW" >&2; exit 1 ;;
esac
if [ "$OS_TAG" = "macos" ]; then
  AQF_PATTERN="androidqf_macos_universal"
else
  case "$ARCH_RAW" in
    x86_64|amd64) AQF_PATTERN="androidqf_linux_amd64" ;;
    aarch64|arm64) AQF_PATTERN="androidqf_linux_arm64" ;;
    *) echo "Arquitectura no soportada: $ARCH_RAW" >&2; exit 1 ;;
  esac
fi

# Carpeta de trabajo
TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$(pwd)/mvt-resultados-android-$TS"
ACQ_DIR="$OUT_DIR/acquisition"
REPORT_DIR="$OUT_DIR/report"
ZIP_FILE="$OUT_DIR.zip"
mkdir -p "$ACQ_DIR" "$REPORT_DIR"

# Descargar AndroidQF
echo "==> Descargando AndroidQF (ultima release, $AQF_PATTERN)..."
AQF_URL=$(curl -fsSL "https://api.github.com/repos/mvt-project/androidqf/releases/latest" \
  | grep '"browser_download_url"' \
  | grep "$AQF_PATTERN" \
  | head -1 \
  | cut -d '"' -f4)
if [ -z "$AQF_URL" ]; then
  echo "No se encontro asset $AQF_PATTERN en la release." >&2
  echo "Descarga manual: https://github.com/mvt-project/androidqf/releases/latest" >&2
  exit 1
fi
echo "    $AQF_URL"
AQF_BIN="$OUT_DIR/androidqf"
curl -fSL "$AQF_URL" -o "$AQF_BIN"
chmod +x "$AQF_BIN"

# Ejecutar AndroidQF (interactivo) dentro de acquisition/
echo ""
echo "==> Lanzando AndroidQF..."
echo "    Es interactivo: responde en la consola."
echo "    Acepta cualquier prompt que aparezca en el movil."
echo ""
( cd "$ACQ_DIR" && "$AQF_BIN" )

# IOCs (best-effort) + analisis
echo ""
echo "==> Actualizando indicadores (IOCs)..."
mvt-android download-iocs || true

echo "==> Analizando adquisicion con mvt-android check-androidqf..."
if ! mvt-android check-androidqf -o "$REPORT_DIR" "$ACQ_DIR"; then
  echo "check-androidqf termino con codigo distinto de 0 (puede haber detecciones; continuamos)."
fi

# Empaquetar
echo "==> Comprimiendo resultados..."
if command -v zip >/dev/null 2>&1; then
  ( cd "$(dirname "$OUT_DIR")" && zip -rq "$ZIP_FILE" "$(basename "$OUT_DIR")" )
else
  ZIP_FILE="${OUT_DIR}.tar.gz"
  tar -czf "$ZIP_FILE" -C "$(dirname "$OUT_DIR")" "$(basename "$OUT_DIR")"
fi

echo ""
echo "Listo. Archivo: $ZIP_FILE"
echo "Subelo en la plataforma: https://mvt-insight.lovable.app/upload"

# Intentar abrir el navegador
if command -v open >/dev/null 2>&1; then
  open "https://mvt-insight.lovable.app/upload" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "https://mvt-insight.lovable.app/upload" >/dev/null 2>&1 || true
fi
