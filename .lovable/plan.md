
## Objetivo

1. Que el número de versión de la app sea visible en pantalla.
2. Añadir un botón "Buscar actualizaciones" para no depender del chequeo automático de 30 s y para ver feedback claro ("no hay actualizaciones", "hay v1.0.X disponible", "descargando…").

## Sobre por qué "no aparece ninguna actualización"

Tres causas probables (sin tocar nada todavía):

- La versión instalada ya es la **última publicada en GitHub Releases**. El auto-updater compara `app.version` contra el último release; si coinciden, no avisa.
- El workflow de GitHub Actions del último bump **aún no ha terminado** de publicar los instaladores (Windows + macOS + Linux tardan ~10-15 min).
- El release quedó como **draft / pre-release**: `electron-updater` por defecto ignora drafts y pre-releases.

El botón "Buscar actualizaciones" hará obvio cuál de las tres es: te dirá la versión instalada, la última disponible, y el motivo si no encuentra nada.

## Cambios

### 1. `desktop/electron/main.cjs`
- Nuevo handler `ipcMain.handle("app:getVersion", () => app.getVersion())`.
- Nuevo handler `ipcMain.handle("updater:check", ...)` que llama `autoUpdater.checkForUpdates()` y devuelve `{ currentVersion, latestVersion, updateAvailable, error? }`.
- Emitir eventos `updater:status` al renderer en los listeners ya existentes (`checking-for-update`, `update-available`, `update-not-available`, `download-progress`, `update-downloaded`, `error`) para que la UI muestre estado en vivo.

### 2. `desktop/electron/preload.cjs`
- Exponer `getVersion()`, `checkForUpdates()`, `onUpdaterStatus(cb)`.

### 3. `desktop/src/main.tsx` (tipos)
- Añadir esos tres métodos al tipo `window.mvt`.

### 4. `desktop/src/App.tsx`
- Al montar: `window.mvt.getVersion()` → estado `appVersion`.
- En `TopBar` y `TopBarWithLogo`, mostrar a la izquierda (o junto al logo en welcome) un texto pequeño tipo `v1.0.18`.
- En pantalla `welcome`, abajo del todo, un botón discreto **"Buscar actualizaciones"** + línea de estado:
  - "Comprobando…"
  - "Ya tienes la última versión (v1.0.18)"
  - "Hay una nueva versión disponible: v1.0.19 — Instalar"
  - "Descargando… 42%"
  - "Listo para instalar — Reiniciar"
  - "Error: <mensaje>"
- El botón "Instalar" del estado disponible llama a `autoUpdater.downloadUpdate()` vía un nuevo IPC `updater:download`, y "Reiniciar" llama a `updater:quitAndInstall`.

### 5. `desktop/src/i18n/locales/es.json` y `en.json`
- Nuevas claves: `update.check`, `update.checking`, `update.upToDate`, `update.available`, `update.downloading`, `update.readyToInstall`, `update.restart`, `update.install`, `update.error`, `app.version`.

### 6. `desktop/package.json`
- Bump `1.0.18` → `1.0.19` para que, una vez publicada, el botón sirva como prueba (los usuarios con 1.0.18 verán que sí detecta 1.0.19).

## Lo que NO cambia
- Lógica de AndroidQF, descarga, ZIP, cancel.
- Flujo de auto-update en background (sigue activo, solo añadimos el botón manual).
- Workflow de GitHub Actions.

## Resultado esperado
- En cualquier pantalla de la app verás `v1.0.19` arriba.
- En welcome, un botón "Buscar actualizaciones" te dice en el momento si hay update y por qué no, sin esperar 30 s ni reiniciar.
