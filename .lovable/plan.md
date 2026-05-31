## Objetivo
Reemplazar la descarga del lanzador `.ps1`/`.sh` por una **app de escritorio Electron** (Windows, macOS, Linux) con ventana, botones y barras de progreso, que hace exactamente lo mismo por debajo: descarga AndroidQF/MVT, ejecuta el flujo, y deja el ZIP listo para subir a la web.

La web sigue siendo responsable del informe — el usuario subirá el ZIP generado por la app igual que hoy.

## Arquitectura

```text
mvt-insight-desktop/   (repo nuevo, fuera de /dev-server)
├── package.json
├── electron/
│   ├── main.cjs            ventana, IPC, lanzar procesos
│   └── preload.cjs         puente seguro renderer↔main
├── src/                    React + Tailwind (mismo design system)
│   ├── App.tsx             pantalla principal
│   ├── screens/
│   │   ├── Welcome.tsx     elegir Android/iOS
│   │   ├── Prereqs.tsx     comprobar adb / iOS deps
│   │   ├── Connect.tsx     misma ilustración USB animada de la web
│   │   ├── Collect.tsx     progreso en vivo (logs + barra)
│   │   └── Done.tsx        muestra ruta del ZIP + botón "Subir al informe"
│   └── styles.css          tokens copiados de la web
└── vite.config.ts          base: './'
```

### Pantalla "Collect" — el corazón de la app
- Botón grande **Iniciar análisis**.
- Tres pasos con barra de progreso individual:
  1. Descargando AndroidQF / instalando MVT
  2. Conectando con el dispositivo (espera autorización USB)
  3. Recolectando datos (con sub-barra para "backup", "apks", "logs")
- Panel colapsable **Ver detalles técnicos** con el stdout en vivo (los `Failed to pull log file` se muestran aquí, en gris, no en rojo).
- Al terminar: ZIP guardado en `~/Downloads/mvt-resultados-AAAAMMDD.zip` + botón **Abrir carpeta** y **Subir a mvt-insight.lovable.app**.

### Cómo se ejecuta el flujo de AndroidQF/MVT
El proceso principal (`electron/main.cjs`) usa `child_process.spawn` para:
- **Windows / Linux**: descargar el binario AndroidQF de GitHub releases y ejecutarlo.
- **macOS**: ejecutar el flujo iOS (libimobiledevice + MVT).
- Las preguntas interactivas de AndroidQF (`Would you like to take a backup?`, `Download: All`, `Upload to VirusTotal?`, `Remove?`) se responden **automáticamente** escribiendo en `stdin` del proceso — el usuario nunca las ve. Esto resuelve el problema actual de tener que explicarle al usuario qué pulsar en la ventana negra.
- El stdout se parsea con regex para alimentar las barras de progreso.

### IPC seguro
- `contextIsolation: true`, `nodeIntegration: false`.
- `preload.cjs` expone solo `window.mvt.start(device)`, `window.mvt.onProgress(cb)`, `window.mvt.openFolder(path)`.

## Empaquetado

Usaremos `@electron/packager` (electron-builder no funciona en este sandbox):
- Windows: `.zip` con `MvtInsight.exe` dentro (el usuario descomprime y ejecuta).
- macOS: `.zip` con `MvtInsight.app` (sin firmar — el usuario hará clic derecho > Abrir la primera vez).
- Linux: `.tar.gz` con el binario.

Los tres archivos se publicarán como assets descargables — no caben en el bundle de la web, así que se subirán a un release público (GitHub releases o similar) y la web enlazará a esas URLs.

## Cambios en la web (`mvt-insight`)
En `src/routes/upload.tsx`, reemplazar el bloque actual "Descargar lanzador / Copiar comando" por **tres botones de descarga** (Windows / macOS / Linux) que apuntan a los binarios publicados. Los sub-pasos "Abre la terminal", "Responde a las preguntas de AndroidQF" y el aviso de `Failed to pull log file` se eliminan porque ya no aplican — la app lo hace todo.

Se mantiene intacto:
- `StepUpload` (subida del ZIP).
- Endpoint `/api/...` que parsea el ZIP.
- Pantalla del informe.
- Ilustración USB animada (se mueve también a la app).

Los scripts `.ps1`/`.sh` actuales se conservan en `public/scripts/` por compatibilidad, pero ya no se enlazan desde la UI.

## Trabajo en dos fases

**Fase 1 — esta tanda:** Andamiaje del repo Electron + pantalla "Collect" funcional para Android en Windows + reemplazar UI de `/upload` con los tres botones de descarga (apuntando a URLs placeholder hasta tener el primer release).

**Fase 2 — siguiente tanda:** Flujo iOS en macOS, parsing fino de progreso, instalador firmado, telemetría opcional de errores.

## Limitaciones honestas
- **SmartScreen / Gatekeeper:** sin certificado de firma de código (~300 €/año en Windows, cuenta de Apple Developer ~99 €/año en macOS), la primera ejecución mostrará un aviso de "editor desconocido". Se documentará en la web cómo aceptarlo.
- **Tamaño:** cada binario pesa ~120 MB (Electron embebe Chromium).
- **macOS sin firmar:** el usuario tendrá que hacer clic derecho > Abrir la primera vez, o ejecutar `xattr -d com.apple.quarantine MvtInsight.app`.
- **Este sandbox** no puede generar `.exe` instaladores ni `.dmg` — solo `.zip`/`.tar.gz`. Para instaladores nativos se necesitaría un pipeline CI externo (GitHub Actions con runners de cada SO).
