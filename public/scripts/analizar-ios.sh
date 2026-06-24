#!/usr/bin/env bash
# Analizador automático iOS con MVT (a partir de un backup ya creado en Finder/iTunes)
# Uso directo:  curl -fsSL <url>/scripts/analizar-ios.sh | bash
# Uso local:    bash analizar-ios.sh
set -e

cat <<'BANNER'
============================================================
  Spyware Forensic Analyzer — Análisis iOS
  Descifra un backup de Finder/iTunes y ejecuta
  mvt-ios check-backup, empaquetando los resultados.
============================================================
BANNER
echo

for cmd in mvt-ios zip; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Falta '$cmd'. Ejecuta primero el instalador."
    exit 1
  fi
done

# Localizar backups
if [[ "$OSTYPE" == "darwin"* ]]; then
  BACKUP_ROOT="$HOME/Library/Application Support/MobileSync/Backup"
else
  BACKUP_ROOT="$HOME/.config/MobileSync/Backup"
fi

if [ ! -d "$BACKUP_ROOT" ]; then
  echo "❌ No se encontró la carpeta de backups: $BACKUP_ROOT"
  echo "   Crea primero un backup CIFRADO desde Finder (macOS) o iTunes."
  exit 1
fi

echo "==> Backups encontrados en: $BACKUP_ROOT"
ls -1 "$BACKUP_ROOT"
echo
read -r -p "Pega el nombre exacto de la carpeta del backup a analizar: " BACKUP_ID
BACKUP_PATH="$BACKUP_ROOT/$BACKUP_ID"

if [ ! -d "$BACKUP_PATH" ]; then
  echo "❌ No existe: $BACKUP_PATH"
  exit 1
fi

read -r -s -p "Contraseña de cifrado del backup: " PASSWORD
echo

TS="$(date +%Y%m%d-%H%M%S)"
DEC_DIR="ios-backup-descifrado-$TS"
OUT_DIR="mvt-resultados-ios-$TS"
ZIP_FILE="${OUT_DIR}.zip"
mkdir -p "$OUT_DIR"

echo ""
echo "============================================================"
echo "  Se va a abrir OTRA ventana titulada 'Estado del analisis'"
echo "  NO LA CIERRES. Te muestra que el proceso sigue trabajando."
echo "  Si esta ventana parece parada, mira la otra."
echo "============================================================"
echo ""

STATUS_SH="$OUT_DIR/_status.sh"
STATUS_PID_FILE="$OUT_DIR/_status.pid"
mkdir -p "$DEC_DIR"
cat > "$STATUS_SH" <<'STATUS_EOF'
#!/usr/bin/env bash
WATCH="$1"; PID_FILE="$2"
echo $$ > "$PID_FILE"
trap 'exit 0' TERM INT
FRAMES='|/-\'
i=0; START=$(date +%s)
while :; do
  NOW=$(date +%s); E=$((NOW-START))
  HH=$((E/3600)); MM=$(((E%3600)/60)); SS=$((E%60))
  COUNT=$(find "$WATCH" -type f 2>/dev/null | wc -l | tr -d ' ')
  SIZE=$(du -sh "$WATCH" 2>/dev/null | awk '{print $1}'); [ -z "$SIZE" ] && SIZE="0"
  C="${FRAMES:i++%4:1}"
  printf '\033[2J\033[H'
  echo
  echo "  $C  Analizando backup iOS... NO CIERRES esta ventana"
  echo
  printf '     Tiempo:    %02d:%02d:%02d\n' "$HH" "$MM" "$SS"
  echo  "     Ficheros:  $COUNT"
  echo  "     Tamano:    $SIZE"
  echo
  echo "  Esto puede tardar varios minutos. Es NORMAL."
  sleep 0.25
done
STATUS_EOF
chmod +x "$STATUS_SH"

STATUS_TERM_PID=""
_open_status_window() {
  local watch="$1"
  if [[ "$OSTYPE" == "darwin"* ]] && command -v osascript >/dev/null 2>&1; then
    osascript -e "tell application \"Terminal\" to do script \"bash '$STATUS_SH' '$watch' '$STATUS_PID_FILE'\"" >/dev/null 2>&1 && return 0
  fi
  for term in x-terminal-emulator gnome-terminal konsole xfce4-terminal xterm; do
    if command -v "$term" >/dev/null 2>&1; then
      case "$term" in
        gnome-terminal) "$term" -- bash "$STATUS_SH" "$watch" "$STATUS_PID_FILE" >/dev/null 2>&1 & ;;
        *)              "$term" -e bash "$STATUS_SH" "$watch" "$STATUS_PID_FILE" >/dev/null 2>&1 & ;;
      esac
      STATUS_TERM_PID=$!
      return 0
    fi
  done
  ( while :; do sleep 30; C=$(find "$watch" -type f 2>/dev/null | wc -l | tr -d ' '); printf '\n[estado] sigue trabajando... %s ficheros\n' "$C" >&2; done ) &
  STATUS_TERM_PID=$!
}
_kill_status() {
  if [ -f "$STATUS_PID_FILE" ]; then
    SPID=$(cat "$STATUS_PID_FILE" 2>/dev/null || true)
    [ -n "$SPID" ] && kill "$SPID" 2>/dev/null || true
  fi
  [ -n "$STATUS_TERM_PID" ] && kill "$STATUS_TERM_PID" 2>/dev/null || true
}
trap '_kill_status' EXIT INT TERM

echo "==> Descifrando backup..."
_open_status_window "$DEC_DIR"
mvt-ios decrypt-backup -p "$PASSWORD" -d "$DEC_DIR" "$BACKUP_PATH"
_kill_status

echo "==> Ejecutando mvt-ios check-backup..."
_open_status_window "$OUT_DIR"
mvt-ios check-backup -o "$OUT_DIR" "$DEC_DIR"
_kill_status

rm -f "$STATUS_SH" "$STATUS_PID_FILE" 2>/dev/null || true

echo "==> Comprimiendo resultados..."
( cd "$OUT_DIR" && zip -r "../$ZIP_FILE" . >/dev/null )

# Limpieza opcional del backup descifrado (contiene datos personales)
read -r -p "¿Borrar el backup descifrado temporal? (s/N): " RM
if [[ "$RM" =~ ^[sS]$ ]]; then rm -rf "$DEC_DIR"; fi

echo
echo "✅ Análisis completado: $(pwd)/$ZIP_FILE"
URL="https://spyware.rpjsoftware.com/upload"
if command -v open >/dev/null 2>&1; then open "$URL";
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL";
fi
