# Mensajes veraces de progreso + marca del dispositivo en el informe

Dos arreglos independientes, ambos en la app de escritorio y el parser.

## 1) Detectar realmente si hay dispositivo antes de "analizar"

Hoy `desktop/electron/main.cjs` salta directo de "Conectando" a "Recolectando datos → Iniciando análisis en el dispositivo" sin comprobar si hay un móvil enchufado. Si AndroidQF se queda esperando, la UI sigue diciendo que está analizando, que es falso.

Cambios en `desktop/electron/main.cjs` (handler `mvt:start`, rama `android`):

- **Asegurar ADB**: AndroidQF ya incluye/descarga `adb`. Si no, usar `adb` del PATH; si tampoco existe, mostrar error claro ("ADB no disponible — instala Android Platform Tools").
- **Sondeo previo a la fase 3**: tras "AndroidQF listo", entrar en fase 2 ("Esperando dispositivo") y ejecutar `adb devices` en bucle (cada 1.5 s, hasta ~60 s, cancelable):
  - 0 dispositivos → status `phaseStatus.waitingDevice` = "Conecta el móvil por USB. No se detecta ningún dispositivo." (no avanzar a fase 3).
  - 1+ con estado `unauthorized` → status `phaseStatus.waitingUsbAuth` = "Acepta «Permitir depuración USB» en la pantalla del móvil."
  - 1+ con estado `device` → marcar fase 2 como completa (✓) y recién entonces lanzar AndroidQF (fase 3).
  - Timeout → terminar el flujo con error "Dispositivo no detectado. Conéctalo por USB con depuración activada y vuelve a intentarlo." (en lugar de quedarse colgado).
- **Cancelable**: si `cancelled = true` durante el sondeo, salir limpio sin spawnear AndroidQF.
- En iOS hacer el equivalente con `idevice_id -l` (si está disponible) o, si no, dejar la espera con timeout y mensaje veraz "Esperando dispositivo iOS…" en vez de "Iniciando análisis".

Cambios en `desktop/src/App.tsx`:

- Renombrar/ajustar las claves de status para que el texto **coincida con la realidad**:
  - Fase 2 mientras no haya dispositivo: "Esperando a que conectes el móvil…" (no "Conectando con el dispositivo" en verde ✓).
  - Fase 3 sólo se marca como activa **después** de que el sondeo confirme el dispositivo; su sub-texto inicial pasa a "Ejecutando AndroidQF en el dispositivo…" en lugar de "Iniciando análisis en el dispositivo…".
- Añadir traducciones en `desktop/src/i18n/locales/{es,en}.json` para las nuevas claves (`phaseStatus.waitingDevice`, `phaseStatus.deviceDetected`, mensaje de error de timeout).

## 2) Mostrar la marca del teléfono en el informe

El parser ya tiene `extractAndroidGetprop` y `extractIosInfo` (`src/lib/mvt-parser.ts` y su gemelo `desktop/src/lib/mvt-parser.ts`), pero sólo se ejecutan si encuentra un fichero **JSON** con clave `getprop` o `info`. AndroidQF actualmente guarda `getprop.txt` (texto plano), por eso `deviceInfo` queda vacío y la UI/PDF no muestran nada.

Cambios en `desktop/src/lib/mvt-parser.ts` y `src/lib/mvt-parser.ts` (mantener ambos sincronizados):

- Ampliar `readFileEntries` para aceptar también `.txt` de los módulos conocidos (`getprop.txt`, `settings.txt`, etc.), no sólo `.json`.
- Añadir `parseGetpropText(text)` que parsee líneas `[ro.product.brand]: [Samsung]` a un objeto, y enchufarlo en la rama Android cuando el fichero sea `getprop.txt`.
- Para iOS, si AndroidQF/MVT-iOS produce `Info.plist` en XML, parsear las claves mínimas (`ProductType`, `ProductVersion`, `BuildVersion`, `DeviceName`); si no está disponible, dejarlo como mejor-esfuerzo (no romper el flujo).
- Verificar que `deviceInfo` llega al backend: ya viaja dentro de `result` en `processAndStoreAnalysis` / `submit-analysis`, así que no hace falta tocar el servidor.

Las páginas `src/routes/analysis.$id.tsx` y `src/lib/pdf-report.ts` ya consumen `r.deviceInfo` con `formatDeviceLine`, así que en cuanto el parser lo rellene, aparecerá automáticamente en el informe web y en el PDF.

## Detalles técnicos

- `adb devices` se parsea ignorando la primera línea ("List of devices attached") y filtrando líneas vacías; columnas separadas por tabulador: `serial<TAB>state`.
- Sondeo con backoff fijo de 1500 ms; timeout configurable por constante `WAIT_DEVICE_TIMEOUT_MS = 60_000`.
- Reutilizar el patrón `spawn` existente; capturar stdout, no usar `node-pty` para `adb`.
- Estado `cancelled` ya existe; respetarlo en cada iteración del sondeo.
- No tocar `desktop/package.json > version` (se versiona al publicar).

## Fuera de alcance

- No se cambia la lógica de AndroidQF ni sus prompts.
- No se modifica el esquema de BD ni RPC `consume_credit_and_insert_analysis`.
- No se redibuja la UI; sólo cambian textos y el orden de transición de fases.
