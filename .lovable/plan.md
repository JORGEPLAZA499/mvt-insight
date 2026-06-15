## El problema

Hoy el aviso "⚠ Sin actividad de androidqf desde hace N min" se calcula con `lastLogAt`, que solo se actualiza cuando androidqf escribe una línea por su pseudo-TTY (`child.onData` en `desktop/electron/main.cjs`). Durante la recolección real (pull de APKs, dumpsys, backup) androidqf puede estar **minutos sin imprimir nada** mientras `adb pull` transfiere gigas de fotos/vídeos. El usuario ve "sin actividad" cuando en realidad el disco está ardiendo.

En el caso de la captura, el móvil tiene miles de archivos y la barra amarilla apareció siendo perfectamente normal — no había forma de saberlo desde la UI.

## Idea

Añadir un **heartbeat real** basado en el sistema, no en el stdout:

1. **Crecimiento del directorio de trabajo de androidqf** (cwd = `workDir()`): cada N segundos sumamos el tamaño de los archivos creados/modificados *después* del arranque del proceso. Si los bytes suben → está trabajando.
2. **Proceso vivo**: `child.pid` sigue presente y `process.kill(pid, 0)` no lanza. Confirma que el binario no ha muerto en silencio.
3. **Subprocesos adb (opcional, best-effort)**: en macOS/Linux `ps --ppid <pid>`; en Windows `wmic` o `tasklist /FI "PARENTID..."`. Solo informativo, no bloqueante.

Con eso, el main envía un nuevo evento IPC `mvt:activity` con `{ bytesWritten, deltaBytes, lastChangeAt, alive }` cada ~5 s. El renderer guarda `lastActivityAt = max(lastLogAt, lastChangeAt)` y muestra un mensaje útil.

## Cambios concretos

### `desktop/electron/main.cjs`
- Tras arrancar el `pty.spawn` de androidqf (línea ~550), registrar `startMs` y arrancar un `setInterval(5000)` que:
  - Recorre `dir` recursivamente (saltando el propio binario `androidqf[.exe]` y carpetas conocidas como `node_modules`), suma bytes de archivos con `mtimeMs >= startMs`.
  - Compara con la medición anterior y emite `send("mvt:activity", { bytesWritten, deltaBytes, lastChangeAt, alive: true })`.
  - Limita el recorrido (máx ~5.000 entradas o profundidad 6) para que no se vuelva caro con miles de fotos: paramos en cuanto detectamos crecimiento.
- Limpiar el interval en `child.onExit` y en `mvt:cancel`.
- Misma lógica reutilizable para iOS (durante `idevicebackup2` y `mvt-ios`): el directorio `backupDir`/`resultsDir` también crece.

### `desktop/electron/preload.cjs`
- Exponer `onActivity(cb)` con `ipcRenderer.on("mvt:activity", (_e, p) => cb(p))` devolviendo un unsub.

### `desktop/src/App.tsx`
- Estado nuevo: `const [activity, setActivity] = useState<{ bytes: number; lastChangeAt: number } | null>(null)`.
- Suscribirse en el `useEffect` que ya engancha `onLog`/`onPhase`.
- Calcular `lastActivityAt = Math.max(lastLogAt ?? 0, activity?.lastChangeAt ?? 0)`.
- Reescribir el bloque de la línea 812:
  - Si `Date.now() - lastActivityAt < threshold` → no mostrar warning.
  - Si hay logs antiguos pero el disco crece → mostrar **caja azul informativa**: "Recolectando archivos del dispositivo… {{mb}} MB transferidos (hace {{s}} s)".
  - Solo si **ni logs ni disco** se movieron en >5 min → la caja ámbar actual.
  - A partir de 15 min sin nada → caja roja "Probablemente colgado, pulsa Cancelar".

### `desktop/src/i18n/locales/{es,en}.json`
- Añadir `running.activity.collecting` ("Recolectando archivos del dispositivo… {{mb}} MB transferidos"), `running.activity.stalled` (warning ámbar actual), `running.activity.frozen` (rojo a partir de 15 min).

## Por qué esto

- Hace la app **honesta**: el aviso aparece cuando *de verdad* no pasa nada, no cuando androidqf simplemente está callado.
- No depende de parsear más stdout de androidqf (que cambia entre versiones).
- Es barato: 1 lectura de directorio cada 5 s, con cortocircuito si ya detectamos crecimiento.
- Reutilizable para el flujo iOS sin tocar `iosTools.createBackup` ni `runMvtIos`.

## Fuera del alcance

- No tocamos el parser MVT, ni el `submit-analysis`, ni el PDF.
- No subimos la versión del desktop (lo haces tú cuando quieras publicar).
