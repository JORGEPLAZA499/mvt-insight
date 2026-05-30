# Migrar análisis Android de `check-adb` (eliminado) a AndroidQF + `check-androidqf`

## Contexto

MVT 2026.5.x eliminó el subcomando `mvt-android check-adb`. Los scripts actuales (`analizar-android.ps1` y `analizar-android.sh`) lo invocan directamente y fallarán. El flujo oficial recomendado ahora es:

1. Ejecutar la herramienta **AndroidQF** (binario Go publicado por mvt-project) sobre el dispositivo conectado por USB.
2. AndroidQF genera una carpeta con la adquisición forense.
3. `mvt-android check-androidqf <carpeta>` analiza esa carpeta contra los indicadores STIX2.

AndroidQF se distribuye como binarios en https://github.com/mvt-project/androidqf/releases (Windows: `androidqf_*_windows_amd64.exe`; Linux: `androidqf_*_linux_amd64`; macOS: `androidqf_*_darwin_amd64` / `_arm64`).

## Cambios

### 1. `public/scripts/analizar-android.ps1` (reescribir)

Flujo nuevo:
1. Verificar que existen `adb` y `mvt-android` (igual que ahora).
2. Crear carpeta de trabajo `mvt-resultados-android-<timestamp>/` y dentro `acquisition/`.
3. Descargar la última release de AndroidQF para Windows desde la API de GitHub (`/repos/mvt-project/androidqf/releases/latest`), filtrando el asset que termine en `_windows_amd64.exe`. Guardarlo como `androidqf.exe` en la carpeta de trabajo.
4. Verificar el dispositivo con `adb devices`.
5. Ejecutar `.\androidqf.exe` con CWD = `acquisition/`. AndroidQF es interactivo: el usuario verá sus prompts (qué módulos correr, etc.). Mostrar instrucción clara al usuario antes de lanzarlo.
6. Cuando termina, ejecutar `mvt-android download-iocs` (best-effort, no bloqueante) y luego `mvt-android check-androidqf -o <outDir>\report acquisition`.
7. Comprimir todo `<outDir>` en `.zip` y abrir la página `/upload` (manteniendo el comportamiento actual).

Manejo de errores: si la descarga de AndroidQF falla, mostrar mensaje claro con URL manual de releases.

### 2. `public/scripts/analizar-android.sh` (reescribir)

Mismo flujo equivalente para Linux/macOS:
- Detectar OS y arquitectura (`uname -s` / `uname -m`) → elegir asset `_linux_amd64`, `_darwin_amd64` o `_darwin_arm64`.
- Descargar con `curl -L` desde el endpoint `releases/latest` (parseando con `grep`/`sed`, sin requerir `jq`).
- `chmod +x androidqf`.
- Ejecutar interactivo, luego `mvt-android check-androidqf -o <outDir>/report acquisition`.
- Empaquetar con `zip -r` o `tar -czf` si `zip` no está disponible.

### 3. `src/routes/guia.tsx`

- Línea 339: reemplazar el snippet de ejemplo `mvt-android check-adb -o ./resultados` por la nueva secuencia (descargar AndroidQF → ejecutar → `mvt-android check-androidqf -o ./report acquisition`).
- Actualizar cualquier texto descriptivo cercano que mencione "check-adb" para reflejar el nuevo flujo (AndroidQF realiza la adquisición; MVT solo analiza).
- Mencionar brevemente que AndroidQF es interactivo y pide consentimiento en el dispositivo.

### 4. Sin cambios

- `analizar-ios.sh` (iOS no se ve afectado).
- `instalar-mvt-*` (la instalación de MVT sigue siendo correcta; AndroidQF se descarga *bajo demanda* desde el script de análisis para no inflar el instalador y mantener siempre la última versión).

## Detalles técnicos

- **Endpoint GitHub releases**: `https://api.github.com/repos/mvt-project/androidqf/releases/latest`. Devuelve JSON con `assets[].browser_download_url`. Sin token, hay rate limit de 60 req/hora por IP, suficiente para este caso.
- **PowerShell**: usar `Invoke-RestMethod` (devuelve objeto ya parseado) y filtrar `$_.assets | Where-Object { $_.name -like "*windows_amd64.exe" }`.
- **Bash**: usar `curl -fsSL <api> | grep browser_download_url | grep <pattern> | head -1 | cut -d '"' -f4`.
- AndroidQF requiere `adb` accesible en PATH (ya garantizado por el instalador).
- La carpeta de adquisición de AndroidQF queda con nombre tipo `YYYY-MM-DD-HH-MM-SS/` dentro de CWD; en el script pasamos el padre `acquisition/` a `check-androidqf`, que descenderá automáticamente.

## Verificación

- Releer los 3 archivos modificados tras editarlos.
- No se puede ejecutar `adb`/`mvt-android` desde el sandbox; la prueba funcional final la hará el usuario tras republicar el sitio (recordatorio: los scripts se sirven desde el dominio publicado).

## Fuera de alcance

- Otros flujos (`check-bugreport`, `check-backup`): se podrían añadir más adelante como alternativas si el usuario las pide.
- Verificación de firma/checksum de AndroidQF: no se publican checksums oficiales fáciles de consumir desde script; queda como mejora futura.
