# Plan: Activar análisis iOS en la app de escritorio

Basado en tus respuestas:
- **Plataformas:** macOS + Windows + Linux
- **Motor:** Python + mvt-ios bundleado dentro del instalador
- **Backups cifrados:** Sí
- **Origen del backup:** USB automático (mismo flujo "un clic" que Android)

## Cómo funcionará para el usuario

1. Pulsa el botón **iPhone** (igual que ya hace con Android).
2. La app comprueba que el iPhone esté conectado por USB y desbloqueado.
3. Si el backup va a estar cifrado por primera vez, le pide al usuario una **contraseña de backup** (y le explica que Apple solo guarda SMS, llamadas, Salud y Llavero cuando el backup está cifrado).
4. La app crea el backup vía USB usando `idevicebackup2` (libimobiledevice) en una carpeta temporal.
5. Ejecuta `mvt-ios check-backup` sobre esa carpeta, con la contraseña.
6. Lee los JSON de salida con el parser que **ya existe** (`desktop/src/lib/mvt-parser.ts` ya entiende los outputs de mvt-ios) y muestra los resultados en la misma UI de resultados que Android.
7. Borra el backup temporal al cerrar.

## Qué hay que construir

### 1. Binarios nativos por plataforma (descarga al primer uso)
Mismo patrón que ya usamos para AndroidQF: la app **no** trae los binarios dentro del instalador (mantiene el .dmg/.exe/.AppImage ligeros), sino que los descarga la primera vez que el usuario pulsa iPhone, los verifica por hash y los cachea.

Binarios necesarios por SO:
- **macOS** (arm64 + x64): `idevice_id`, `idevicebackup2`, `ideviceinfo`, `idevicepair` desde libimobiledevice (build de `libimobiledevice-glue` + `libplist`).
- **Windows** (x64): los mismos binarios + DLLs + **drivers de Apple Mobile Device Support**. Si los drivers no están, la app detecta el caso y abre una pantalla de ayuda con un botón "Instalar drivers de Apple" que descarga el instalador oficial.
- **Linux** (x64): `libimobiledevice` empaquetado como AppImage interno o vía detección del paquete del sistema con instrucciones si falta.

### 2. mvt-ios bundleado
Crear un job de GitHub Actions que:
- Compile `mvt-ios` con **PyInstaller** en macOS, Windows y Linux.
- Publique los tres binarios (`mvt-ios-darwin-arm64`, `mvt-ios-darwin-x64`, `mvt-ios-win-x64.exe`, `mvt-ios-linux-x64`) como assets de una GitHub Release.
- La app descarga el binario correcto al primer uso (igual que AndroidQF) y lo guarda en `~/.spyware-detector/bin/`.

> Nota: aunque tu respuesta fue "bundlear dentro del instalador", recomiendo descargar al primer uso porque ahorra ~120 MB al instalador y permite actualizar mvt-ios sin sacar nueva versión de la app. Si prefieres bundlear de verdad, lo cambiamos.

### 3. Flujo iOS en Electron (`desktop/electron/main.cjs`)
Nuevos handlers IPC, simétricos a los de Android:
- `ios:check-device` → corre `idevice_id -l`, devuelve si hay iPhone, su nombre y si está pareado.
- `ios:request-pair` → corre `idevicepair pair`, devuelve "confía en el ordenador desde el iPhone".
- `ios:start-backup` → recibe `{ password }`, corre `idevicebackup2 backup --full <tmp>` con la contraseña, devuelve progreso por stream.
- `ios:run-mvt` → corre el binario de mvt-ios sobre la carpeta del backup con la contraseña, escribe los JSON en `<tmp>/results/`.
- `ios:cleanup` → borra la carpeta temporal.

### 4. UI en `desktop/src/`
- Reusar `mvt-parser.ts` tal cual (ya soporta los módulos de iOS).
- Nuevo componente `IosAnalysisFlow.tsx` que envuelve los 4 pasos (detectar → parear → contraseña → backup → análisis → resultados) en la misma UI visual que el flujo Android.
- Una sola pantalla de progreso que muestra: "Creando backup… 23%", "Analizando con MVT… módulo 4/18", etc.
- Pantalla de error específica si:
  - No hay iPhone conectado.
  - Hay que aceptar "Confiar" en el iPhone.
  - Contraseña incorrecta.
  - Faltan drivers de Apple (solo Windows).

### 5. Pantalla de "Activar análisis iOS"
La UI actual dice "Próximamente (solo macOS)". Hay que:
- Quitar el badge "Próximamente".
- Quitar la restricción de "solo macOS".
- Cuando el usuario pulse iPhone por primera vez, mostrar un wizard breve: "Vamos a descargar las herramientas necesarias (≈ 60 MB). Esto solo pasa una vez."

## Detalles técnicos

```text
Carpeta de cache:
  ~/.spyware-detector/
    bin/
      idevicebackup2(.exe)
      idevice_id(.exe)
      mvt-ios(.exe)
      libplist.dll        (solo Windows)
      ...
    tmp/
      backup-<timestamp>/   (se borra al terminar)
      results-<timestamp>/  (JSON de mvt-ios, alimenta el parser)
```

Endpoints / archivos nuevos o tocados:
- `desktop/electron/main.cjs` — añadir handlers IPC `ios:*` y descarga/verificación de binarios.
- `desktop/electron/ios-tools.cjs` (nuevo) — wrapper de libimobiledevice + mvt-ios + descarga + checksums.
- `desktop/src/lib/ios-flow.ts` (nuevo) — orquestación del flujo en el renderer.
- `desktop/src/components/IosAnalysisFlow.tsx` (nuevo) — UI del wizard.
- `desktop/src/App.tsx` — sustituir el botón iPhone "Próximamente" por el botón real que abre `IosAnalysisFlow`.
- `.github/workflows/build-mvt-ios.yml` (nuevo) — compila mvt-ios con PyInstaller en macOS/Win/Linux y publica los binarios.
- `.github/workflows/build-libimobiledevice.yml` (nuevo) — empaqueta los binarios de libimobiledevice por plataforma.
- `src/i18n/locales/{es,en}.json` — strings nuevos del wizard.

## Qué NO incluye este plan

- Análisis de iPhones **sin cable** (vía iCloud backup) → fuera de alcance, requiere credenciales de Apple ID y 2FA.
- Soporte de iOS < 14 → mvt-ios oficialmente solo cubre versiones modernas.
- Jailbreak / FFS dump → no es el flujo que queremos para el usuario final.

## Riesgos

- **Windows + drivers de Apple:** si el usuario no tiene iTunes ni Apple Mobile Device Support instalados, libimobiledevice no ve el iPhone. Lo mitigamos con la pantalla de ayuda + descarga del instalador oficial.
- **Tamaño de mvt-ios con PyInstaller:** ~40-60 MB por plataforma. Aceptable con descarga al primer uso.
- **Firma de código:** los binarios de libimobiledevice y mvt-ios deberían firmarse para evitar avisos de Gatekeeper (macOS) y SmartScreen (Windows). Esto es un paso adicional de release que conviene planificar.

¿Apruebas este plan para empezar a implementarlo?
