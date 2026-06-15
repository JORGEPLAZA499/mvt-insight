# Manejo del fallo "module bugreport: exit status 0xffffffff"

## Contexto

androidqf ejecuta varios módulos en secuencia (bugreport, settings, packages, processes, files, sms…). El módulo `bugreport` falla en muchos dispositivos (MIUI/EMUI/One UI con permisos de desarrollador restringidos) con `exit status 0xffffffff`. **No es un fallo del análisis**: androidqf continúa con el resto de módulos automáticamente. Pero hoy mostramos el `ERROR:` crudo en el log, lo que asusta al usuario y parece que todo se ha roto.

Queremos un aviso visible pero no bloqueante: una tarjeta amarilla en la UI explicando que el bugreport no se pudo generar por restricciones del dispositivo, sin detener nada.

## Cambios

### 1. `desktop/electron/main.cjs` — detectar el patrón en stdout

En el handler de `pty.spawn` de androidqf (alrededor de la línea 705 donde se hace `send("mvt:log", stripAnsi(text))`), añadir detección por regex sobre cada chunk de stdout:

```js
// dentro del onData del pty, después de stripAnsi
if (/failed to run module (\w+):/i.test(cleanText)) {
  const m = cleanText.match(/failed to run module (\w+):\s*(.+)/i);
  send("mvt:module-failed", { module: m[1], detail: m[2]?.trim() ?? "" });
}
```

Mantener un `Set` por sesión para no emitir el mismo módulo dos veces.

### 2. `desktop/electron/preload.cjs`

Exponer `onModuleFailed(cb)`:

```js
onModuleFailed: (cb) => {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on("mvt:module-failed", listener);
  return () => ipcRenderer.removeListener("mvt:module-failed", listener);
}
```

### 3. `desktop/src/App.tsx`

- Nuevo estado: `const [failedModules, setFailedModules] = useState<Array<{module: string; detail: string}>>([])`
- Subscribirse a `window.mvt.onModuleFailed(...)` junto a `onLog` y `onActivity`, haciendo dedup por nombre de módulo.
- Limpiarlo al iniciar un nuevo análisis y al terminar.
- En la zona donde se muestran los avisos de actividad/inactividad (cerca de línea 818), añadir **encima** una tarjeta amarilla (warning) cuando `failedModules.length > 0`:

  > **Algunos módulos no estaban disponibles en este dispositivo**
  > El módulo `{nombres}` no se pudo ejecutar (suele pasar en dispositivos con MIUI, EMUI o One UI por restricciones del fabricante). **El análisis continúa con normalidad** y el resto de información (apps, ajustes, procesos, SMS, archivos) se está recopilando.

  Usar el mismo estilo de tarjeta que las tarjetas ámbar/azul de actividad existentes, con borde y fondo amber claro, icono de advertencia y sin botón de acción (es informativa).

### 4. `desktop/src/i18n/locales/{es,en}.json`

Añadir claves nuevas:

```
running.moduleFailed.title
running.moduleFailed.description  // con {{modules}}
running.moduleFailed.bugreportHint // texto extra cuando incluye bugreport
```

ES ejemplo:
- title: "Algunos módulos no están disponibles en este dispositivo"
- description: "El módulo {{modules}} no se pudo ejecutar. Suele ocurrir en MIUI, EMUI o One UI por restricciones del fabricante. El análisis continúa con normalidad."

EN equivalente.

## Qué NO toca

- Lógica del parser MVT, generación de ZIP, subida a backend, PDF, detección de actividad por filesystem.
- Versión de la app (no se bumpea — se agrupará con el próximo "saca versión").

## Resultado esperado

Cuando el dispositivo sea un Xiaomi/Samsung/etc. que rechace bugreport, el usuario verá:
1. El log seguirá pasando como hasta ahora (no se oculta), pero
2. Aparecerá una tarjeta amarilla en la cabecera explicando en lenguaje claro que es normal y que el análisis sigue, y
3. El análisis terminará correctamente con los demás módulos.
