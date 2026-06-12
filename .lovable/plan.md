# Plan: rescatar al usuario cuando `mvt-ios check-backup` se cuelga en Windows

## Qué está pasando realmente

En la captura del Administrador de tareas hay **22 procesos `mvt-ios.exe` vivos a la vez, todos al 0% de CPU**. El wrapper Node solo lanza un `mvt-ios check-backup`, pero el binario empaquetado con PyInstaller, al hacer ciertos imports/spawn internos en Windows, re-ejecuta el bootstrapper y acaba creando una cascada de procesos hijo inactivos. Resultado: el `child.on("close")` en Node nunca dispara, la UI se queda en "Analizando…" para siempre, y el archivo de backup descifrado deja de crecer.

No es un bug del análisis en sí — es que el proceso queda zombie y nuestra app no se entera.

## Cambios (todos en `desktop/electron/ios-tools.cjs` + UI ya existente)

### 1. Timeout duro por paso de mvt-ios

En `runStep` (línea ~270):
- Aceptar un parámetro `timeoutMs` opcional.
- Arrancar un `setTimeout` al crear el child. Si salta:
  - Marcar `timedOut = true`.
  - Matar el árbol de procesos con `taskkill /F /T /PID <pid>` en Windows (ya se usa este patrón para `androidqf.exe`, líneas 372 y 432).
  - Resolver con `{ code: -1, stdout, stderr, timedOut: true }`.
- En el `close` handler, limpiar el timeout.

Valores por defecto:
- `decrypt-backup`: 30 min (backups grandes tardan).
- `check-backup`: 45 min.

Ambos configurables vía env var por si un usuario tiene un backup enorme.

### 2. Heartbeat de "sin actividad"

En `runStep`:
- Guardar `lastOutputAt = Date.now()` cada vez que entra data por stdout/stderr.
- Un `setInterval` cada 60 s comprueba `Date.now() - lastOutputAt`. Si supera 10 min sin ninguna salida → emite por `onData` una línea tipo `[heartbeat] sin salida de mvt-ios desde hace N min`. Sirve para que el log visible en la UI (las últimas 3 líneas que ya añadimos) muestre que estamos vigilando.
- Limpiar el interval en `close`.

### 3. Error real al usuario en vez de "Analizando…" infinito

En `runMvtIos` (líneas 289-309):
- Si `chk.timedOut` → lanzar `new Error("mvt-ios check-backup se quedó colgado (timeout). Hay procesos mvt-ios.exe que no terminan; suele ser un problema del binario en Windows. Cierra la app, mata cualquier mvt-ios.exe restante en el Administrador de tareas y vuelve a intentarlo.")`.
- Idem para `dec.timedOut` con el mensaje equivalente para descifrado.
- Este error ya llega a `App.tsx` y conmuta la UI a la pantalla `error`, así que el usuario sale del limbo.

### 4. Limpieza al salir / cancelar

Cuando llega un timeout, además de matar el child directo, hacer un barrido final:
```
taskkill /F /IM mvt-ios.exe /T
```
para asegurarnos de no dejar 22 procesos zombie consumiendo RAM. Mismo patrón ya usado para `androidqf.exe`.

### 5. (UI) afinar el aviso de "puede estar lento"

`desktop/src/App.tsx` ya tiene cronómetro + últimas 3 líneas de log + heurística de aviso (return null actualmente). Cambio mínimo: mostrar el aviso amarillo cuando **no haya nuevas líneas de log durante > 5 min** (ya tenemos `lastLogCountRef` y `nowTick`). Texto:

> "Sin actividad de mvt-ios desde hace X min. Si pasa de 10 min, el análisis probablemente esté colgado — la app cortará automáticamente."

## Lo que NO se toca

- Lógica de decrypt/check-backup, orden de pasos, carpetas de salida.
- Flujo de subida de resultados.
- Versionado de `desktop/package.json` (no hay release ahora).
- Cancelación manual desde la UI (sigues sin pedirla).

## Cómo se prueba

1. En tu máquina, con el mismo backup que ahora tienes colgado, reinicia la app con la nueva build.
2. Esperas a que llegue a "Analizando backup descifrado".
3. Si vuelve a colgarse, a los 45 min como mucho saldrá la pantalla de error con el mensaje claro, y los 22 procesos zombie quedarán cerrados.
4. Si termina antes (caso bueno) → flujo normal de subida.
