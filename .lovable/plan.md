## Problema

AndroidQF falla con `Impossible to initialize ADB: failed to use the adb executable: exit status 1`. Significa que AndroidQF intentó invocar `adb` pero el binario no estaba disponible (o estaba pero no se pudo ejecutar) en el entorno del usuario. Hoy `desktop/electron/main.cjs` sólo intenta *localizar* un `adb` existente en PATH/ANDROID_HOME; si el usuario no lo tiene instalado, AndroidQF se cae.

## Solución

Descargar automáticamente las **platform-tools oficiales de Google** (que incluyen `adb`) y dejarlas junto al binario de AndroidQF en `~/Downloads/mvt-insight/`. AndroidQF resuelve `adb` desde su propio directorio, así que con eso queda autocontenido — el usuario no necesita instalar nada.

URLs oficiales (estables):
- Windows: `https://dl.google.com/android/repository/platform-tools-latest-windows.zip`
- macOS: `https://dl.google.com/android/repository/platform-tools-latest-darwin.zip`
- Linux: `https://dl.google.com/android/repository/platform-tools-latest-linux.zip`

## Cambios en `desktop/electron/main.cjs`

1. Nueva función `ensureAdb(dir)`:
   - Si ya existe `dir/adb(.exe)`, no hace nada.
   - Si no, descarga el zip de platform-tools, lo extrae con JSZip (ya usado en el proyecto), copia `adb`, `AdbWinApi.dll`, `AdbWinUsbApi.dll` (Windows) o `adb` + libs (`.so`/`.dylib` si las hubiera) al `dir` raíz, y hace `chmod 0o755` en Linux/macOS.
   - Usa una variante de `download()` que no aplica el filtro de `MIN_BINARY_BYTES` (el zip de platform-tools pesa ~13 MB pero la función actual ya lo aceptaría; aun así se añade flag `skipMinSize` para futuros assets).

2. Llamar a `ensureAdb(dir)` **antes** del bloque de espera de dispositivo (línea ~568), reportando una nueva sub-fase de descarga (`phaseStatus.preparingAdb`) y log:
   - `🔧 Preparando herramientas ADB…`
   - `✅ ADB listo.`

3. `resolveAdbPath(workDir)` ya prioriza `workDir`, así que detectará el `adb` recién descargado y el polling de dispositivo funcionará igual que antes.

4. Mensaje de error mejorado en caso de fallo de descarga ADB, indicando que se pueden instalar manualmente las platform-tools como fallback.

## i18n

Añadir claves nuevas en `desktop/src/i18n/locales/{es,en}.json`:
- `phaseStatus.preparingAdb`: "Preparando herramientas ADB" / "Preparing ADB tools"

## Versionado

No bumpear `desktop/package.json > version` (regla de memoria). Quedará agrupado para la próxima release cuando el usuario diga "publica".
