## Problema detectado

El error ya no parece ser “no existe ADB”, sino que AndroidQF encuentra/ejecuta un `adb` que falla con `exit status 1` al inicializar. En el flujo actual hay tres puntos débiles:

1. `ensureAdb()` devuelve inmediatamente si existe `adb.exe`, pero no comprueba si ese ADB cacheado funciona.
2. AndroidQF se lanza con `env: process.env`, sin priorizar la carpeta de trabajo donde la app descarga `adb.exe`; si hay otro `adb` roto/incompatible en el PATH del PC, AndroidQF puede usar ese.
3. En Windows se mata `androidqf.exe`, pero no `adb.exe`; un servidor/proceso ADB viejo puede quedar bloqueando el siguiente intento.

## Plan de implementación

1. En `desktop/electron/main.cjs`, reforzar `ensureAdb(dir, send)` para:
   - validar `adb version` antes de reutilizar un `adb` cacheado;
   - si falla, borrar `adb.exe` y DLLs de Platform Tools y descargarlos de nuevo;
   - verificar también que las DLLs necesarias de Windows existan.

2. Añadir preparación robusta de ADB antes de lanzar AndroidQF:
   - esperar a que `adb.exe`, `AdbWinApi.dll` y `AdbWinUsbApi.dll` estén legibles tras la descarga;
   - ejecutar una prueba controlada (`adb version` / `adb devices`) y registrar la salida útil en el log de la app sin exponer datos sensibles.

3. Forzar que AndroidQF use el ADB gestionado por la app:
   - construir un `env` específico para AndroidQF;
   - anteponer `Downloads/mvt-insight` al `PATH`/`Path`;
   - usar ese `env` en `pty.spawn(...)`.

4. Limpiar procesos ADB colgados en Windows:
   - en cancelación y antes de cada ejecución Android, matar también `adb.exe` además de `androidqf.exe`;
   - hacerlo de forma tolerante para no fallar si no hay procesos.

5. Añadir logs diagnósticos mínimos para saber qué ADB se está usando:
   - ruta esperada del ADB gestionado;
   - resultado de validación;
   - mensaje claro si el ADB cacheado estaba corrupto y se redescargó.

6. Después de implementar, revisar el archivo modificado y confirmar que no hay bump de versión todavía. Si quieres publicar el arreglo, haría falta un nuevo bump posterior, agrupado en una release nueva según tu regla.