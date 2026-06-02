## Objetivo

Que cada vez que el usuario abra la app desktop:
1. Consulte automáticamente si hay una nueva versión en GitHub Releases.
2. Si existe, muestre una ventana modal **bloqueante** que no se puede cerrar.
3. El único botón ("Actualizar ahora") descarga e instala la nueva versión, luego reinicia la app.
4. Si no hay update, la app arranca normal.

## Cambios

### 1. `desktop/package.json`
- Añadir dependencia `electron-updater`.
- Añadir bloque `publish` apuntando a GitHub Releases:
  ```json
  "build": {
    ...
    "publish": [{
      "provider": "github",
      "owner": "<usuario-github>",
      "repo": "<nombre-repo>"
    }]
  }
  ```
- Añadir script `release:win`: `vite build && electron-builder --win --publish always` (sube artefactos + `latest.yml` al release).

### 2. `desktop/electron/main.cjs`
- Importar `autoUpdater` de `electron-updater` y configurar logging.
- Al `app.whenReady()`, **antes** de crear la ventana principal:
  - Crear ventana de "buscando actualización" pequeña (400x200, sin botones de cerrar).
  - Llamar `autoUpdater.checkForUpdates()`.
  - Si `update-not-available` → cerrar esa ventana y arrancar la app normal (`createWindow()`).
  - Si `update-available` → cambiar el contenido del modal a "Hay una actualización vX.Y.Z disponible" + botón único "Actualizar ahora". Bloquear `close` con `e.preventDefault()` para que no se pueda cerrar con Alt+F4 ni la X.
  - Al pulsar el botón → `autoUpdater.downloadUpdate()`, mostrar progreso (`download-progress` event).
  - En `update-downloaded` → `autoUpdater.quitAndInstall()` (reinicia con la nueva versión instalada).
  - Si hay error de red al consultar → mostrar "No se pudo verificar actualizaciones" con botón "Reintentar" y "Continuar sin actualizar" (única excepción permitida para no dejar la app inservible offline).

### 3. `desktop/electron/updater.html` (nuevo)
- HTML simple cargado por la ventana modal, con estados: "Buscando…", "Actualización disponible", "Descargando X%", "Instalando…".
- Comunica con el main vía `ipcRenderer` (preload mínimo).

### 4. `desktop/electron/preload-updater.cjs` (nuevo)
- Expone al updater.html: `onState`, `onProgress`, `startUpdate`.

### 5. `.github/workflows/release.yml`
- Verificar que ya existe (aparece en el árbol del proyecto). Ajustar/confirmar:
  - Se ejecuta en `push` de tag `v*`.
  - Corre `cd desktop && npm ci && npm run release:win` con `GH_TOKEN` (token automático de GitHub Actions) para que `electron-builder` publique el `.exe` + `latest.yml` en el Release.

### 6. Flujo de release (documentar en `desktop/README.md`)
1. Cambiar `version` en `desktop/package.json` (ej. `1.0.1`).
2. Commit + tag `v1.0.1` + push.
3. GitHub Actions construye y publica automáticamente el instalador.
4. Los usuarios al abrir su app instalada verán el modal de actualización.

## Detalles técnicos

- **Comparación de versiones**: `electron-updater` lo hace solo, leyendo `version` de `package.json` vs. `latest.yml` del release.
- **Modal verdaderamente bloqueante**: `BrowserWindow` con `closable: false`, `minimizable: false`, `resizable: false`, `frame: false` (sin barra de título con X), y handler `window.on('close', e => e.preventDefault())` como cinturón y tirantes.
- **Sin firma de código**: el `.exe` no estará firmado → Windows SmartScreen mostrará warning "Aplicación no reconocida" la primera vez. Las auto-actualizaciones siguientes funcionan igual (es el mismo publisher hash). Se puede añadir firma más adelante sin cambiar el código.
- **Primera instalación**: los usuarios actuales necesitan descargar manualmente la primera versión que incluya `electron-updater` (1.0.1). A partir de ahí, todas las siguientes se actualizan solas.
- **Offline**: si no hay conexión, no podemos verificar updates. Permitimos "Continuar sin actualizar" solo en ese caso (error de red), no cuando hay update confirmado.

## Fuera de alcance

- Firma de código (certificado Windows).
- Builds para macOS / Linux con auto-update (solo Windows en esta iteración; se puede añadir luego con el mismo patrón).
- Cambios en la web pública.
- UI custom muy elaborada del modal (será funcional y limpia, no animada).

## Lo que necesito confirmar antes de implementar

1. **Owner y repo de GitHub** donde están las releases (ej. `jorgeplaza/mvt-insight`). Lo necesito exacto para `package.json` → `publish`.
2. Si el workflow `.github/workflows/release.yml` ya existente cubre el build del desktop, lo ajusto; si no, lo creo desde cero.
