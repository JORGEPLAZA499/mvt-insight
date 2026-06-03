Auditoría completa de la app de escritorio (Electron + electron-builder NSIS) y correcciones para que el `.exe` funcione perfectamente en Windows.

## Problemas detectados

### 1. Falta el icono de la app (`desktop/build/` no existe)
`package.json` declara `directories.buildResources: "build"` y `nsis.oneClick: true`, pero la carpeta `desktop/build/` no existe. Sin `build/icon.ico`:
- El instalador NSIS usa el icono genérico de Electron.
- El acceso directo del escritorio y el menú Inicio muestran el icono genérico.
- En la barra de tareas aparece el icono por defecto.
- SmartScreen de Windows es más agresivo con instaladores sin icono propio.

### 2. Carrera de mensajes en el modal de actualización
`sendUpdaterState()` (main.cjs:127) usa `webContents.send` directamente. Si `autoUpdater` emite `error` o `update-available` antes de que el HTML del modal esté listo, los mensajes se pierden y el modal se queda en el estado inicial "Buscando actualizaciones…" para siempre. Actualmente solo se protege la PRIMERA llamada con `did-finish-load`, pero no las siguientes.

### 3. Sin bloqueo de instancia única
Si el usuario hace doble click dos veces, o lanza la app mientras ya está abriéndose, se ejecutan dos procesos en paralelo: dos modales de updater, dos ventanas principales, dos descargas de AndroidQF compitiendo por la misma carpeta. Falta `app.requestSingleInstanceLock()`.

### 4. `quitAndInstall(true, true)` con un timeout puede fallar
Tras `update-downloaded` se hace `setTimeout(... quitAndInstall(true, true), 1200)`. Si el usuario cierra la app en ese intervalo, el reinicio falla y queda la nueva versión a medias. Mejor usar `autoInstallOnAppQuit = true` y llamar a `quitAndInstall` sin forzar.

### 5. `spawn(androidqf.exe)` sin `windowsHide`
En Windows, sin `windowsHide: true` aparece una ventana de consola negra del proceso hijo además de la ventana de Electron. Cosmético pero feo.

### 6. `child.stdin.write` puede provocar `EPIPE` no capturado
Si AndroidQF muere antes de leer un prompt, `child.stdin.write(answers[...])` lanza `EPIPE` sin handler y tumba el proceso de Electron. Falta `child.stdin.on('error', ...)` y `child.on('error', ...)`.

### 7. `win.icon` no se especifica explícitamente en `build.win`
electron-builder *intenta* `build/icon.ico` por convención, pero al añadir el icono lo declaramos también explícitamente como defensa.

### 8. Pequeños endurecimientos del updater
- El handler `error` debe asegurarse de mostrar el botón "Continuar sin actualizar" (`showSecondary: true`) tanto en fallo de red como cuando `checkForUpdates()` rechaza.
- `did-finish-load` se registra DESPUÉS de `loadFile` en el flujo actual — correcto, pero conviene registrar todos los listeners de `autoUpdater` antes de que se invoque `checkForUpdates` (ya lo está; lo verifico).

## Cambios propuestos

### A. Crear `desktop/build/icon.ico`
Generar un `icon.ico` multi-tamaño (16/32/48/64/128/256) a partir de `desktop/src/assets/logo.png` con ImageMagick (vía `nix run nixpkgs#imagemagick`). Guardar también `icon.png` 512×512 para Linux y un `icon.icns` no es necesario porque el target activo es `win`.

### B. `desktop/package.json`
- Bump `version` a `1.0.5`.
- Añadir `"icon": "build/icon.ico"` dentro de `build.win`.
- Añadir `"installerIcon": "build/icon.ico"`, `"uninstallerIcon": "build/icon.ico"`, `"installerHeaderIcon": "build/icon.ico"` dentro de `build.nsis`.
- Añadir `"build/icon.ico"` y `"build/icon.png"` a `build.files` (defensa; buildResources ya los incluye pero explícito > implícito).

### C. `desktop/electron/main.cjs`
1. **Single instance lock** al principio de `app.whenReady` flow:
   ```js
   const gotLock = app.requestSingleInstanceLock();
   if (!gotLock) { app.quit(); return; }
   app.on('second-instance', () => {
     if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
   });
   ```
2. **Buffer de estado del updater**: convertir `sendUpdaterState` en una cola que se vacía cuando `webContents` esté listo. Mantener una flag `updaterReady` y un `pendingState`; en `did-finish-load` se marca `updaterReady=true` y se envía el último estado pendiente.
3. **`update-downloaded` más robusto**: poner `autoUpdater.autoInstallOnAppQuit = true` arriba, y reemplazar el `setTimeout + quitAndInstall(true,true)` por `setTimeout(() => quitAndInstall(false, true), 1500)` (no forzado, reinicia tras cerrar).
4. **`spawn` en Windows**: añadir `windowsHide: true` a las opciones.
5. **Protección de `stdin`**:
   ```js
   child.stdin.on('error', (e) => console.warn('[androidqf stdin]', e.message));
   child.on('error', (e) => send('mvt:log', `[err] spawn: ${e.message}`));
   ```
6. **`error` del updater**: garantizar `showSecondary: true` y `primaryAction: "retry"` (ya está, verificar).

### D. Verificación post-cambios
- Releer `main.cjs` completo después de las ediciones para confirmar sintaxis (try/catch balanceados, sin imports duplicados).
- Releer `package.json` para confirmar JSON válido.
- Confirmar que `desktop/build/icon.ico` existe y pesa >10 KB (señal de que tiene varios tamaños).

## Lo que NO se toca

- El flujo de AndroidQF (descarga + parsing de prompts) — funcional y fuera del alcance del problema del `.exe`.
- La UI React (App.tsx, styles.css) — sin cambios.
- `vite.config.ts` (`base: "./"`) — ya está correcto.
- Los preloads (`preload.cjs`, `preload-updater.cjs`) — correctos.
- `updater.html` — correcto.

## Pasos del usuario tras el cambio

1. En su máquina Windows: `cd desktop && npm install`
2. Definir `GH_TOKEN` con permisos de release en el repo.
3. `npm run dist:win` → genera `release/MvtInsight-Setup-1.0.5.exe` y lo publica en GitHub Releases junto a `latest.yml`.
4. Desinstalar 1.0.4, instalar 1.0.5. A partir de aquí las versiones futuras se auto-actualizan solas.