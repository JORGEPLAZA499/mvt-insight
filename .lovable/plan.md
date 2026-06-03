# Logo arriba-izquierda + botón Cancelar en pantalla "Analyzing…"

## Cambios

### 1. `desktop/src/App.tsx` — pantalla `running`
- TopBar reestructurado: logo pequeño (`<Logo size={36}>`) a la izquierda, selector de idioma a la derecha. Solo afecta a la pantalla "running" (las pantallas welcome/done ya muestran el logo grande de otra forma; mantenerlas como están salvo aplicar también el logo arriba-izquierda en `done` por consistencia).
- Añadir botón **Cancelar** dentro de la card de fases, alineado abajo a la derecha. Estilo `btn btn-secondary`.
- Al pulsar: llamar `window.mvt.cancel()`, limpiar estado y volver a `screen="welcome"`. Mostrar confirm nativo opcional ("¿Cancelar el análisis en curso?").

### 2. `desktop/electron/preload.cjs`
- Exponer `cancel: () => ipcRenderer.invoke("mvt:cancel")`.

### 3. `desktop/src/main.tsx`
- Añadir `cancel: () => Promise<void>` al tipo `window.mvt`.

### 4. `desktop/electron/main.cjs`
- Guardar referencia al `child` del pty actual en una variable de módulo (`currentChild`).
- Nuevo handler `ipcMain.handle("mvt:cancel", ...)`: si hay `currentChild`, llamar `child.kill()` (en Windows también `taskkill /F /IM androidqf.exe /T` por si quedó descolgado). Limpiar `currentChild` en `onExit` y al final del flujo.
- El `mvt:start` actual debe resolver de forma controlada cuando se cancela (devolver `{ ok: false, error: "cancelled" }`) en vez de lanzar excepción ruidosa.

### 5. i18n (`desktop/src/i18n/locales/es.json` y `en.json`)
- Nuevas claves: `running.cancel` ("Cancelar" / "Cancel"), `running.cancelConfirm` ("¿Cancelar el análisis en curso?" / "Cancel the running analysis?").

### 6. Bump versión
- `desktop/package.json`: `1.0.17` → `1.0.18` para que se publique vía workflow y el usuario reciba el update.

## Resultado

- En la pantalla "Analyzing Android…" aparece el logo arriba-izquierda (selector de idioma sigue arriba-derecha).
- Botón "Cancelar" visible. Al pulsarlo se mata AndroidQF y se vuelve al inicio.

## Lo que NO cambia

- Pantalla welcome (logo grande sigue centrado).
- Lógica de auto-update, descarga, parser de prompts, empaquetado del ZIP.
