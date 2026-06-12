Cambiar la ventana principal de Electron en `desktop/electron/main.cjs` para que se abra en pantalla completa:

1. En `createMainWindow()`, en las opciones de `BrowserWindow`:
   - Añadir `fullscreen: true`
   - Eliminar `width`, `height`, `minWidth`, `minHeight` (ya no aplican en fullscreen)
   - Conservar `backgroundColor`, `show`, `titleBarStyle` y `webPreferences`

Esto hará que la app de escritorio arranque maximizada a pantalla completa en lugar de en una ventana de 980x720.