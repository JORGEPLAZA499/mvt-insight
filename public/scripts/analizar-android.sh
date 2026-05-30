#!/usr/bin/env bash
# Analizador automatico Android con MVT (Linux/macOS) - AndroidQF + check-androidqf
# Uso directo:  curl -fsSL <url>/scripts/analizar-android.sh | bash
# Uso local:    bash analizar-android.sh

# Carpeta de trabajo (creada YA para poder loguear desde el principio)
TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$(pwd)/mvt-resultados-android-$TS"
ACQ_DIR="$OUT_DIR/acquisition"
REPORT_DIR="$OUT_DIR/report"
LOG_FILE="$OUT_DIR/run.log"
mkdir -p "$ACQ_DIR" "$REPORT_DIR"

# Duplicar toda la salida (stdout+stderr) tambien al log
exec > >(tee -a "$LOG_FILE") 2>&1

# Mantener la terminal abierta al salir (exito o error) para que el usuario pueda leer
_pause_on_exit() {
  local rc=$?
  echo ""
  if [ $rc -ne 0 ]; then
    echo "ERROR: el script termino con codigo $rc. Detalle en: $LOG_FILE"
  fi
  # Solo pausa si estamos en una terminal interactiva
  if [ -t 0 ]; then
    read -r -p "Pulsa Enter para cerrar..." _
  fi
}
trap _pause_on_exit EXIT

set -uo pipefail

echo ""
echo "============================================================"
echo "  Spyware Forensic Analyzer - Analisis Android"
echo "  1) AndroidQF realiza la adquisicion forense del dispositivo"
echo "  2) mvt-android check-androidqf analiza la adquisicion"
echo "============================================================"
echo ""
echo "Carpeta de trabajo: $OUT_DIR"
echo "Log:                $LOG_FILE"
echo ""

# Verificar binarios
for cmd in adb mvt-android curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Falta '$cmd'. Ejecuta primero el instalador de MVT y reabre la terminal." >&2
    exit 1
  fi
done

# Verificar dispositivo + estado
echo "==> Verificando conexion USB..."
ADB_OUT=$(adb devices)
echo "$ADB_OUT"
DEV_LINES=$(echo "$ADB_OUT" | awk 'NR>1 && NF>=2')
if [ -z "$DEV_LINES" ]; then
  echo "No se detecta ningun dispositivo. Activa 'Depuracion USB' y conecta el cable de datos." >&2
  exit 1
fi
if echo "$DEV_LINES" | awk '{print $2}' | grep -Eq '^(unauthorized|offline)$'; then
  echo "El dispositivo aparece como 'unauthorized' u 'offline'." >&2
  echo "Desbloquea el movil, acepta el RSA (Permitir siempre) y vuelve a lanzar el comando." >&2
  exit 1
fi
echo "Dispositivo autorizado."

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

ZIP_FILE="$OUT_DIR.zip"

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
echo "============================================================"
echo "  Se va a abrir OTRA ventana titulada 'Estado del analisis'"
echo "  NO LA CIERRES. Te muestra que el proceso sigue trabajando."
echo "  Si esta ventana parece parada, mira la otra."
echo "============================================================"
echo ""

# Mini-script de estado (segunda ventana con spinner + contador)
STATUS_SH="$OUT_DIR/_status.sh"
STATUS_PID_FILE="$OUT_DIR/_status.pid"
cat > "$STATUS_SH" <<'STATUS_EOF'
#!/usr/bin/env bash
WATCH="$1"
PID_FILE="$2"
echo $$ > "$PID_FILE"
trap 'exit 0' TERM INT
FRAMES='|/-\'
i=0
START=$(date +%s)
while :; do
  NOW=$(date +%s); E=$((NOW-START))
  HH=$((E/3600)); MM=$(((E%3600)/60)); SS=$((E%60))
  COUNT=$(find "$WATCH" -type f 2>/dev/null | wc -l | tr -d ' ')
  SIZE=$(du -sh "$WATCH" 2>/dev/null | awk '{print $1}')
  [ -z "$SIZE" ] && SIZE="0"
  LAST=$(ls -t "$WATCH" 2>/dev/null | head -1)
  [ -z "$LAST" ] && LAST="(aun nada)"
  C="${FRAMES:i++%4:1}"
  printf '\033[2J\033[H'
  echo
  echo "  $C  Analizando movil... NO CIERRES esta ventana"
  echo
  printf '     Tiempo:    %02d:%02d:%02d\n' "$HH" "$MM" "$SS"
  echo  "     Ficheros:  $COUNT"
  echo  "     Tamano:    $SIZE"
  echo  "     Ultimo:    $LAST"
  echo
  echo "  Responde a las preguntas en la OTRA ventana."
  echo "  Esto puede tardar 5-15 minutos. Es NORMAL."
  sleep 0.25
done
STATUS_EOF
chmod +x "$STATUS_SH"

# Abrir la segunda ventana segun la plataforma
STATUS_TERM_PID=""
_open_status_window() {
  if [ "$OS_TAG" = "macos" ] && command -v osascript >/dev/null 2>&1; then
    osascript -e "tell application \"Terminal\" to do script \"bash '$STATUS_SH' '$ACQ_DIR' '$STATUS_PID_FILE'\"" >/dev/null 2>&1 && return 0
  fi
  for term in x-terminal-emulator gnome-terminal konsole xfce4-terminal xterm; do
    if command -v "$term" >/dev/null 2>&1; then
      case "$term" in
        gnome-terminal) "$term" -- bash "$STATUS_SH" "$ACQ_DIR" "$STATUS_PID_FILE" >/dev/null 2>&1 & ;;
        *)              "$term" -e bash "$STATUS_SH" "$ACQ_DIR" "$STATUS_PID_FILE" >/dev/null 2>&1 & ;;
      esac
      STATUS_TERM_PID=$!
      return 0
    fi
  done
  # Fallback: heartbeat ligero a stderr cada 30s (no rompe tanto la TUI)
  ( while :; do
      sleep 30
      C=$(find "$ACQ_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
      printf '\n[estado] sigue trabajando... %s ficheros recolectados\n' "$C" >&2
    done ) &
  STATUS_TERM_PID=$!
  return 0
}
_open_status_window || true

_kill_status() {
  if [ -f "$STATUS_PID_FILE" ]; then
    SPID=$(cat "$STATUS_PID_FILE" 2>/dev/null || true)
    [ -n "$SPID" ] && kill "$SPID" 2>/dev/null || true
  fi
  [ -n "$STATUS_TERM_PID" ] && kill "$STATUS_TERM_PID" 2>/dev/null || true
  rm -f "$STATUS_SH" "$STATUS_PID_FILE" 2>/dev/null || true
}
trap '_kill_status; _pause_on_exit' EXIT

AQF_EXIT=0
( cd "$ACQ_DIR" && "$AQF_BIN" ) || AQF_EXIT=$?
_kill_status
trap _pause_on_exit EXIT

ACQ_COUNT=$(find "$ACQ_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "AndroidQF exit code: $AQF_EXIT ; ficheros en acquisition/: $ACQ_COUNT"

if [ "$ACQ_COUNT" -eq 0 ]; then
  echo "AVISO: AndroidQF no genero ficheros. Posibles causas:"
  echo "  - Saliste del menu sin elegir modulos."
  echo "  - El movil quedo bloqueado o se rechazo un permiso."
  echo "  - El RSA caduco o el cable se desconecto."
  echo "Revisa run.log y vuelve a lanzar el comando."
else
  echo "==> Actualizando indicadores (IOCs)..."
  mvt-android download-iocs || true

  echo "==> Analizando adquisicion con mvt-android check-androidqf..."
  if ! mvt-android check-androidqf -o "$REPORT_DIR" "$ACQ_DIR"; then
    echo "check-androidqf termino con codigo distinto de 0 (puede haber detecciones; continuamos)."
  fi
fi

# Empaquetar (siempre)
echo "==> Comprimiendo resultados..."
if command -v zip >/dev/null 2>&1; then
  ( cd "$(dirname "$OUT_DIR")" && zip -rq "$ZIP_FILE" "$(basename "$OUT_DIR")" )
else
  ZIP_FILE="${OUT_DIR}.tar.gz"
  tar -czf "$ZIP_FILE" -C "$(dirname "$OUT_DIR")" "$(basename "$OUT_DIR")"
fi

echo ""
echo "Listo. Archivo:  $ZIP_FILE"
echo "Log completo:    $LOG_FILE"
echo "Subelo en: https://mvt-insight.lovable.app/upload"

if command -v open >/dev/null 2>&1; then
  open "https://mvt-insight.lovable.app/upload" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "https://mvt-insight.lovable.app/upload" >/dev/null 2>&1 || true
fi
