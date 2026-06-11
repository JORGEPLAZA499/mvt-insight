## Problema

Cuando eliges **iPhone** en la app de escritorio pasan dos cosas:

1. La pantalla de progreso muestra etiquetas de Android ("Descargando AndroidQF", "Recolectando datos"). El backend sí ejecuta el flujo iOS, pero la UI miente.
2. `idevice_id -l` no detecta tu iPhone porque en Windows hacen falta los **drivers USB de Apple Mobile Device** (los que instala iTunes o la app gratis "Apple Devices" de Microsoft Store). No es legal incluirlos en nuestro instalador (Apple no permite redistribuirlos), así que la solución estándar es **detectar que faltan y guiar al usuario al instalador oficial**.

## Qué se va a hacer

### 1. Detectar drivers de Apple en Windows antes de empezar el flujo iOS
En `desktop/electron/ios-tools.cjs` añadir `checkAppleDriversWindows()`:
- Solo se ejecuta en `process.platform === "win32"`.
- Consulta el registro / servicios buscando `Apple Mobile Device Service` (`sc query "Apple Mobile Device Service"`) y/o la clave `HKLM\SOFTWARE\Apple Inc.\Apple Mobile Device Support`.
- Devuelve `{ installed: boolean }`.

En `desktop/electron/main.cjs`, dentro de la rama `device === "ios"`, **antes** de entrar al bucle de polling de `listIosDevices`, llamar a la comprobación. Si faltan los drivers:
- Emitir un nuevo evento `mvt:phase` con `statusKey: "phaseStatus.iosDriversMissing"`.
- Lanzar un error con código identificable (`IOS_DRIVERS_MISSING`) que la UI pueda reconocer.

### 2. Diálogo en la UI con acción "Instalar drivers"
En `desktop/src/App.tsx`, cuando `start("ios", …)` devuelve `error: "IOS_DRIVERS_MISSING"`, mostrar un panel con:
- Explicación corta: "Tu Windows necesita los drivers de Apple Mobile Device para reconocer el iPhone. No podemos incluirlos en nuestra app por motivos de licencia de Apple."
- Botón **"Instalar Apple Devices (Microsoft Store)"** → `window.mvt.openExternal("ms-windows-store://pdp/?productid=9NP83LWLPZ9K")` (Apple Devices oficial, gratis, sin necesidad de iTunes completo).
- Botón secundario "Descargar iTunes desde apple.com" → `https://www.apple.com/itunes/download/win64`.
- Botón "Ya lo he instalado — reintentar" que vuelve a lanzar `start("ios", { password })` con la contraseña ya introducida.

Añadir las claves nuevas a `desktop/src/i18n/locales/es.json` y `en.json`.

### 3. Arreglar etiquetas de las fases para iOS
En `desktop/src/App.tsx` (línea ~67), el array `phases` está hardcodeado para Android. Hacerlo dependiente de `device`:

```text
phases = device === "ios"
  ? [ "Preparando herramientas iOS",
      "Conectando con el iPhone",
      "Analizando backup" ]
  : [ "Descargando AndroidQF",
      "Conectando con el dispositivo",
      "Recolectando datos" ]
```

Añadir las claves correspondientes a `es.json` / `en.json` bajo `phases.*`.

### 4. Mensaje del bucle de espera más útil
En la rama iOS de `main.cjs`, cuando el polling lleve más de ~15s sin detectar dispositivo, emitir `mvt:log` recordando: cable de datos (no solo carga), iPhone desbloqueado, pulsar "Confiar". Esto ya no es bloqueante: si los drivers están bien, normalmente aparece en <5s.

## Lo que NO se toca

- `desktop/package.json > version` queda en `1.0.29`. No publicamos versión nueva ahora; cuando me digas "publica" agrupo todos los cambios pendientes en un solo bump.
- El flujo Android no se modifica.
- El workflow `build-ios-tools.yml` y los binarios de la release `ios-tools-v1` no cambian.

## Cómo probarlo cuando publiquemos

1. En Windows sin iTunes/Apple Devices → al pulsar iPhone debe aparecer el diálogo con los dos botones de instalación, sin colgarse.
2. Instalar "Apple Devices" desde la Store → pulsar "Reintentar" → debe pasar al paso de "Conectando con el iPhone" y detectar el UDID.
3. En macOS el check se salta (los drivers vienen de serie).
