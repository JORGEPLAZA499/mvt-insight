# Plan: barrido preventivo de procesos `mvt-ios.exe` zombie

## Problema

En Windows, el binario PyInstaller de `mvt-ios` arranca múltiples subprocesos hijos que a veces no terminan al acabar el análisis. Se acumulan como zombies (`mvt-ios.exe` "En ejecución" en el Administrador de tareas) y bloquean los siguientes análisis.

En 1.0.33/1.0.34 ya matamos el árbol cuando salta el timeout, pero no cubrimos dos momentos clave: el inicio de un nuevo análisis y el cierre de la app.

## Cambios (solo `desktop/electron/ios-tools.cjs` y `desktop/electron/main.cjs`)

### 1. Helper reutilizable en `ios-tools.cjs`
Extraer un helper `killAllMvtIosProcesses()` (sin PID; barre TODO `mvt-ios.exe` del sistema en Windows con `taskkill /F /IM mvt-ios.exe /T`, no-op en macOS/Linux). Exportarlo.

### 2. Barrido al INICIO del análisis iOS (`runMvtIos` en `ios-tools.cjs`)
Antes de lanzar `decrypt-backup`, llamar a `killAllMvtIosProcesses()` y loggear en el panel: `→ Limpiando procesos mvt-ios.exe previos…`. Así un usuario que abre la app con zombies de una sesión anterior arranca limpio sin tener que ir al Administrador de tareas.

### 3. Barrido al CIERRE de la app (`main.cjs`)
En el handler `before-quit` de `app` (y como red de seguridad en `window-all-closed`), llamar a `killAllMvtIosProcesses()` para que cerrar MvtInsight no deje zombies aunque el análisis estuviera a medias.

### 4. Sin tocar
- Lógica de análisis, timeouts, heartbeat de 1.0.33.
- `mvt_ios_launcher.py` ni el workflow de build.
- Versión en `desktop/package.json` (sigue 1.0.34 hasta que pidas "publica").

## Resultado esperado

- Abrir la app con 25 `mvt-ios.exe` zombies → al pulsar "Analizar iPhone" se barren antes de empezar.
- Cerrar MvtInsight con un análisis en curso → no quedan `mvt-ios.exe` huérfanos.
- En macOS/Linux el helper es no-op, no cambia nada.

## Detalles técnicos

```js
// ios-tools.cjs
function killAllMvtIosProcesses() {
  if (process.platform !== "win32") return;
  try {
    require("child_process").spawnSync(
      "taskkill", ["/F", "/IM", "mvt-ios.exe", "/T"],
      { windowsHide: true }
    );
  } catch {}
}
```

- Es seguro llamarlo aunque no haya procesos (taskkill devuelve código ≠0, lo ignoramos).
- En `before-quit` se llama de forma síncrona (`spawnSync`) para que termine antes de que Electron cierre.
