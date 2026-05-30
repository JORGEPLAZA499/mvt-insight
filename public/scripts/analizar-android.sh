#!/usr/bin/env bash
# Analizador automático Android con MVT
# Uso directo:  curl -fsSL <url>/scripts/analizar-android.sh | bash
# Uso local:    bash analizar-android.sh
set -e

cat <<'BANNER'
============================================================
  Spyware Forensic Analyzer — Análisis Android
  Ejecuta mvt-android check-adb sobre el dispositivo
  conectado por USB y empaqueta los resultados en ZIP.
============================================================
BANNER

OUT_DIR="mvt-resultados-android-$(date +%Y%m%d-%H%M%S)"
ZIP_FILE="${OUT_DIR}.zip"
echo

# Verificar comandos
for cmd in adb mvt-android zip; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "❌ Falta '$cmd'. Ejecuta primero el instalador (instalar-mvt-*.sh)."
    exit 1
  fi
done

# Verificar dispositivo
echo "==> Verificando conexión USB..."
DEVICES=$(adb devices | tail -n +2 | grep -w "device" | wc -l | tr -d ' ')
if [ "$DEVICES" -eq 0 ]; then
  echo "❌ No se detecta ningún dispositivo Android."
  echo "   - Conecta el cable USB (con datos, no solo carga)"
  echo "   - Activa 'Depuración USB' en Opciones de desarrollador"
  echo "   - Acepta el diálogo RSA en el teléfono"
  exit 1
fi
echo "✅ Dispositivo detectado."

# Ejecutar MVT
mkdir -p "$OUT_DIR"
echo "==> Ejecutando mvt-android check-adb (puede tardar varios minutos)..."
mvt-android check-adb -o "$OUT_DIR" || true

# Comprimir
echo "==> Comprimiendo resultados..."
( cd "$OUT_DIR" && zip -r "../$ZIP_FILE" . >/dev/null )

echo
echo "✅ Análisis completado."
echo "   Archivo generado: $(pwd)/$ZIP_FILE"
echo
echo "👉 Súbelo en la plataforma: sección 'Nuevo análisis'"

# Abrir navegador (opcional)
URL="https://id-preview--9a02aa66-84b2-4251-8832-d9d10e4c30cb.lovable.app/upload"
if command -v open >/dev/null 2>&1; then open "$URL";
elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL";
fi
