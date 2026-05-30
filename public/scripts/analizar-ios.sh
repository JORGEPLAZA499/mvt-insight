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

echo "==> Descifrando backup..."
mvt-ios decrypt-backup -p "$PASSWORD" -d "$DEC_DIR" "$BACKUP_PATH"

echo "==> Ejecutando mvt-ios check-backup..."
mvt-ios check-backup -o "$OUT_DIR" "$DEC_DIR"

echo "==> Comprimiendo resultados..."
( cd "$OUT_DIR" && zip -r "../$ZIP_FILE" . >/dev/null )

# Limpieza opcional del backup descifrado (contiene datos personales)
read -r -p "¿Borrar el backup descifrado temporal? (s/N): " RM
if [[ "$RM" =~ ^[sS]$ ]]; then rm -rf "$DEC_DIR"; fi

echo
echo "✅ Análisis completado: $(pwd)/$ZIP_FILE"
URL="https://id-preview--9a02aa66-84b2-4251-8832-d9d10e4c30cb.lovable.app/upload"
if command -v open >/dev/null 2>&1; then open "$URL";
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL";
fi
