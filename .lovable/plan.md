# Actualización obligatoria al abrir la app de escritorio

## Comportamiento actual
- En producción, el updater consulta GitHub **30 s después** de abrir la app
  (`scheduleBackgroundUpdateCheck` en `desktop/electron/main.cjs`).
- Si hay versión nueva muestra un diálogo nativo con dos botones:
  «Instalar ahora» / «Más tarde». El usuario puede ignorarlo y seguir usando
  una versión antigua indefinidamente.
- Tras descargar la actualización, otro diálogo permite posponer la instalación
  hasta el siguiente cierre.

## Comportamiento deseado
Al abrir la app:
1. Comprobar inmediatamente si hay una versión nueva.
2. Si la hay, **bloquear toda la interfaz** con una pantalla a pantalla
   completa que descarga e instala la actualización.
3. El usuario no puede analizar, vincular, ni cerrar el aviso: la única acción
   posible cuando la descarga termina es «Reiniciar e instalar ahora».
4. Si no hay internet (o GitHub está caído), no atrapamos al usuario: se
   muestra un aviso discreto y la app continúa con normalidad — sin
   conectividad no podríamos descargar de todas formas.

## Cambios

### 1) `desktop/electron/main.cjs`
- `autoUpdater.autoDownload = true` (ahora `false`). Descargar en cuanto se
  detecta versión nueva, sin esperar al click del usuario.
- Sustituir `scheduleBackgroundUpdateCheck()` por `runStartupUpdateCheck()`:
  se ejecuta **al instante** al crear la ventana, justo después de
  `createMainWindow()`. Reintenta en 60 s si la primera petición falla por
  red.
- Eliminar el diálogo nativo de `update-available` (ya no hay «Más tarde»).
  El estado se sigue emitiendo por `updater:status` para que el frontend
  pinte el bloqueo.
- Eliminar el diálogo nativo de `update-downloaded`. Seguimos emitiendo
  `{ state: "downloaded", version }`; la decisión de reiniciar la toma el
  usuario desde la UI bloqueante del frontend.
- Mantener `autoInstallOnAppQuit = true` por si el usuario cierra la
  ventana sin pulsar el botón.

### 2) `desktop/src/App.tsx`
- Nuevo componente `<MandatoryUpdateGate />` que se renderiza **antes** de
  cualquier otra pantalla (welcome / running / link / done…) cuando
  `updateState.state ∈ { "available", "downloading", "downloaded" }`.
- Estilo coherente con el resto: card centrada, logo arriba, sin top-bar ni
  selector de idioma para que el usuario no pueda navegar a ninguna parte.
- Contenido según el estado:
  - `available` / `downloading`: título «Actualización obligatoria», cuerpo
    explicando que se está descargando, barra de progreso con `percent`,
    spinner si aún no llegó el primer evento.
  - `downloaded`: título «Actualización lista», cuerpo «Debes reiniciar la
    app para usar la última versión», único botón «Reiniciar e instalar
    ahora» → `window.mvt.quitAndInstall()`.
- Sin botón cerrar, sin enlace para saltarse. El selector de idioma global
  sigue visible solo en este gate para poder cambiar la traducción del
  propio mensaje.
- Mientras dura el `state === "checking"` inicial (primer arranque, antes de
  saber si hay versión), mostrar la misma pantalla de carga que se usa
  cuando `!authChecked` para evitar parpadeos.
- Si el updater responde `error`, NO bloqueamos: se muestra un banner
  discreto («No se pudo comprobar actualizaciones — comprueba tu conexión»)
  en la pantalla normal y la app sigue funcionando.

### 3) i18n (`desktop/src/i18n/locales/{es,en}.json`)
Nuevas claves bajo `update.gate.*`:
- `title.required` — «Actualización obligatoria»
- `title.ready` — «Actualización lista para instalar»
- `body.downloading` — «Estamos descargando la última versión de la app. No cierres esta ventana.»
- `body.ready` — «Pulsa el botón para reiniciar e instalar la nueva versión. La app no puede usarse hasta entonces.»
- `progress` — «{{percent}}% descargado»
- `installNow` — «Reiniciar e instalar ahora»
- `versionLabel` — «Nueva versión: {{version}}»
- `offlineBanner` — «No se pudo comprobar si hay actualizaciones. Revisa tu conexión a Internet.»

## Detalles técnicos

```text
+----------------------------+        +----------------------------+
| App abre (createMainWindow)| -----> | runStartupUpdateCheck()    |
+----------------------------+        |  autoUpdater.checkForUpdates|
                                      +-------------+--------------+
                                                    |
                              update-available      | (autoDownload=true)
                                                    v
+----------------------------+        +----------------------------+
| MandatoryUpdateGate        | <----- | autoUpdater.downloadUpdate |
|   - spinner / progress     |        +-------------+--------------+
|   - sin botón "más tarde"  |                      | download-progress
+----------------------------+ <--------------------+
              ^                                     | update-downloaded
              |                                     v
              |                       +----------------------------+
              +---------------------- | botón: quitAndInstall      |
                                      +----------------------------+
```

- Sin cambios en la lógica de análisis ni de subida.
- Sin bump de versión en este turno (no lo has pedido).

## Riesgo / consideraciones
- Un usuario sin internet al abrir verá el banner pero podrá seguir
  trabajando localmente; cuando recupere conexión, el siguiente arranque
  forzará la actualización.
- `electron-updater` requiere que la app esté firmada/empacada (no aplica en
  `npm run dev`); ya estamos así en producción vía GitHub Actions.
