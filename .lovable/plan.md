## Problema

AndroidQF aborta con:

> Error trying to connect over ADB: multiple devices connected, please stop AndroidQF and provide a serial number

Esto ocurre cuando `adb devices` ve más de una entrada (móvil real + emulador, móvil + dispositivo "offline" colgado de un intento anterior, varios cables, Wi-Fi ADB, etc.). Hoy lanzamos `androidqf.exe` sin argumentos, así que no podemos desambiguar.

## Solución (en `desktop/electron/main.cjs`)

1. **Nueva función `listAdbDevices(adbBin)`** que devuelva `[{ serial, state }]` parseando `adb devices` (ya tenemos `adbDeviceState`, la ampliamos en vez de duplicar). `adbDeviceState` puede reescribirse encima de ella para no duplicar lógica.

2. **En la espera de dispositivo** (bloque `phaseStatus.waitingDevice`, ~líneas 748-784): seguir esperando hasta que haya **al menos un** dispositivo en estado `device`. Guardar la lista de serials autorizados al salir del bucle.

3. **Antes de `pty.spawn`**:
   - Si hay **exactamente 1** serial autorizado → guardarlo en `selectedSerial`.
   - Si hay **>1** serial autorizado → lanzar un error claro y traducible al usuario: "Hay varios dispositivos conectados (`<lista de serials>`). Desconecta los que no quieras analizar y reintenta." (Mantenemos esto simple; no añadimos UI de selección en esta iteración.)
   - Sugerencia añadida: detectar y avisar de dispositivos en estado `offline`/`unauthorized` presentes a la vez, ya que también disparan el error.

4. **Pasar el serial a AndroidQF**: cambiar
   ```js
   const child = pty.spawn(binPath, [], { ... });
   ```
   por
   ```js
   const args = selectedSerial ? ["--serial", selectedSerial] : [];
   const child = pty.spawn(binPath, args, { ... });
   ```
   AndroidQF acepta `--serial <id>` (flag estándar de su CLI Go) y eso elimina la ambigüedad incluso si más adelante aparece otro dispositivo.

5. **Log de diagnóstico** (sin datos sensibles): `🎯 Usando dispositivo <serial>` antes del spawn. El serial USB no es información sensible.

6. **Sin bump de versión** en este turno (regla de memoria: solo bumpear cuando el usuario diga "publica"). Si el usuario quiere distribuirlo, en un turno posterior agrupamos el fix en una sola release nueva.

## Cambios

- `desktop/electron/main.cjs` — único archivo tocado.

## Verificación

- Releer el archivo modificado para confirmar sintaxis y que el `pty.spawn` recibe los args correctos.
- No se puede probar el flujo USB en el sandbox; el cambio es contenido y revertible.
