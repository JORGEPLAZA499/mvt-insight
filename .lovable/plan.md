## Problema

En la app de escritorio MVT Insight, cuando arrancas sin conexión a internet (o el updater no puede contactar GitHub), aparece el modal "No se pudo comprobar actualizaciones". Al pulsar **Continuar sin actualizar** el modal desaparece pero la ventana principal **no aparece nunca** y la app queda colgada.

## Causa

En `desktop/electron/main.cjs`, el handler de `updater:skip` hace dos cosas seguidas en el mismo tick:

```js
ipcMain.on("updater:skip", () => {
  if (!updateMandatory) {
    closeUpdaterWindow();   // destroy() del modal
    createMainWindow();      // crea la ventana principal
  }
});
```

Con la configuración actual de la ventana principal (sin `show: false` ni `ready-to-show`, e icono apuntando a `build/icon.png` que puede no existir empaquetado), hay varios fallos posibles que la dejan invisible o cerrada:

1. La destrucción síncrona del updater puede disparar `window-all-closed` justo antes de que la nueva ventana esté registrada, cerrando la app en Windows.
2. Si `loadFile(dist/index.html)` o el `preload.cjs` lanzan un error, la ventana se crea pero queda en blanco y, al no haber `show: false` + `ready-to-show`, no hay forma de saberlo.
3. No hay manejadores de `did-fail-load` ni `render-process-gone`, así que un crash silencioso no deja rastro.

## Cambios

**`desktop/electron/main.cjs`** — todas las ediciones contenidas en este archivo:

1. **Diferir la creación de la ventana principal** un tick para que Electron procese el destroy del updater primero:
   ```js
   ipcMain.on("updater:skip", () => {
     if (updateMandatory) return;
     closeUpdaterWindow();
     setImmediate(() => createMainWindow());
   });
   ```
   Aplicar el mismo patrón en `update-not-available`.

2. **Crear la ventana principal con `show: false` y mostrarla en `ready-to-show`** para garantizar que solo aparezca cuando el contenido esté listo:
   ```js
   const win = new BrowserWindow({ ..., show: false, ... });
   win.once("ready-to-show", () => win.show());
   ```

3. **Quitar el `icon:` si el archivo no existe** (verificar con `fs.existsSync`) para evitar errores en arranque empaquetado.

4. **Añadir logging y fallback de errores de carga** para que un fallo no pase desapercibido:
   ```js
   win.webContents.on("did-fail-load", (_e, code, desc) => {
     console.error("[main] did-fail-load:", code, desc);
     dialog.showErrorBox("Error al cargar la app", `${code}: ${desc}`);
   });
   win.webContents.on("render-process-gone", (_e, details) => {
     console.error("[main] render-process-gone:", details);
   });
   ```

5. **Evitar que `window-all-closed` cierre la app durante la transición** updater → main: mantener una referencia y posponer el quit:
   ```js
   let isTransitioning = false;
   // En skip / update-not-available: isTransitioning = true antes de destroy, false tras ready-to-show
   app.on("window-all-closed", () => {
     if (isTransitioning) return;
     if (process.platform !== "darwin") app.quit();
   });
   ```

6. **Bump de versión** en `desktop/package.json` (de `1.0.3` a `1.0.4`) para que la nueva build se publique como release nuevo.

No se tocan `updater.html`, `preload.cjs`, `preload-updater.cjs` ni el flujo MVT (sigue funcionando igual cuando la ventana principal ya está abierta).

## Tras aplicar

Tendrás que **reempaquetar y reinstalar** la app desktop (`npm run dist:win` desde `/desktop`) para que el fix llegue al equipo del usuario, ya que el bug está en el binario instalado, no en algo que el updater pueda parchear (precisamente porque el updater no funciona aún).
