# Ventana de la app: dejar de arrancar en pantalla completa

## Causa

En `desktop/electron/main.cjs` (línea 58) la ventana se crea con `fullscreen: true`. Esto fuerza el modo pantalla completa real del sistema operativo, que oculta la barra de título y por tanto los botones de minimizar/maximizar/cerrar. El usuario no puede mandar la app al fondo mientras corre el análisis (que puede durar muchos minutos en dispositivos con miles de archivos).

## Cambio

En `createMainWindow()` reemplazar `fullscreen: true` por una ventana normal **maximizada** (ocupa toda la pantalla, pero CON barra de título y botones nativos):

```js
const opts = {
  width: 1400,
  height: 900,
  minWidth: 900,
  minHeight: 600,
  backgroundColor: "#0b0b12",
  show: false,
  titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  webPreferences: { ... }   // sin cambios
};
```

Y en el handler `ready-to-show`, antes de `win.show()`:

```js
win.maximize();   // arranca ocupando toda la pantalla pero NO en fullscreen real
win.show();
win.focus();
```

Con esto:
- En **Windows/Linux**: aparecen los botones nativos minimizar / maximizar / cerrar arriba a la derecha, y la app arranca maximizada igual que ahora visualmente.
- En **macOS**: aparecen los semáforos rojo/amarillo/verde (gracias a `titleBarStyle: "hiddenInset"` que ya estaba) y la app arranca maximizada. El usuario puede pulsar el botón amarillo para minimizar al Dock.
- El usuario puede minimizar y seguir usando otras apps mientras el análisis continúa en segundo plano.

## Qué NO toca

- Lógica de análisis, IPC, parser, subida, PDF, traducciones.
- Versión de la app (no se bumpea — se agrupará con el próximo "saca versión").

## Resultado esperado

Al abrir la app, sigue ocupando toda la pantalla como hasta ahora, pero ya se ve la barra de título del sistema con los botones de minimizar/maximizar/cerrar, y el usuario puede mandarla al fondo durante el análisis.
