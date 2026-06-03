
# Cobrar al generar el informe, no al descargar el .exe

## Idea central

El `.exe` se vuelve una utilidad **gratuita** que solo ejecuta AndroidQF y produce un ZIP crudo. El valor (parseo, traducción, IOCs, PDF, historial) lo da la web, y **es ahí donde se descuenta 1 crédito**: solo si el servidor procesa el ZIP con éxito. Esto resuelve a la vez offline, abuso y UX.

## Cambios

### 1. Desktop — quitar el updater bloqueante (`desktop/electron/main.cjs`)

Hoy el `.exe` al arrancar abre una ventana modal que **obliga** a comprobar updates antes de mostrar la app. Si el usuario desconectó internet (recomendación forense), se queda colgado.

- Eliminar `createUpdaterWindow` del arranque. `app.whenReady()` llama directo a `createMainWindow()`.
- Mantener `autoUpdater.checkForUpdates()` en background **30 s después de abrir**, sin bloquear:
  - Si hay update → mostrar un aviso no modal dentro de la app principal (toast / banner "Hay nueva versión, instalar"), con botón "Instalar y reiniciar".
  - Si no hay internet o falla → silencio total. La app sigue funcionando.
- Borrar `updater.html`, `preload-updater.cjs` y todo el estado `updaterWindow / updateMandatory / pendingUpdaterState`.

Resultado: el `.exe` arranca aunque no haya internet y nunca bloquea al usuario.

### 2. Web — descuento atómico de créditos al subir ZIP

**Migración SQL:**
- Nueva tabla `public.analyses` (`id`, `user_id`, `device`, `file_name`, `file_size`, `result jsonb`, `created_at`).
- GRANT SELECT/INSERT a `authenticated`, ALL a `service_role`.
- RLS: `user_id = auth.uid()` para SELECT; INSERT solo vía función `SECURITY DEFINER` (no policy directa).
- Función `public.consume_credit_and_insert_analysis(p_user_id, p_device, p_file_name, p_file_size, p_result)`:
  - `SECURITY DEFINER`, `search_path = public`.
  - Transacción: `SELECT credits FROM accounts WHERE id = p_user_id FOR UPDATE`.
  - Si `credits < 1` → `RAISE EXCEPTION 'INSUFFICIENT_CREDITS'`.
  - `UPDATE accounts SET credits = credits - 1`.
  - `INSERT INTO analyses (...) RETURNING id`.
  - Devuelve `(analysis_id uuid, remaining_credits int)`.

**Server function** (`src/lib/analyses.functions.ts`):
- `processAndStoreAnalysis` con `requireSupabaseAuth`.
- Entrada validada con Zod: `device`, `fileName`, `fileSize`, y el resultado ya parseado del ZIP.
- Llama al RPC anterior.
- Devuelve `{ analysisId, remainingCredits }`. Si falla, no se cobra (rollback automático).
- Función adicional `listMyAnalyses` y `getAnalysis(id)` para reemplazar `mock-store`.

**Frontend** (`src/routes/upload.tsx`, `StepUpload.start()`):
- Tras `parseMvtFiles(files)`:
  - Llamar a `processAndStoreAnalysis({ device, fileName, fileSize, result })`.
  - Si OK → navegar a `/analysis/$id` con el id devuelto.
  - Si error `INSUFFICIENT_CREDITS` → mensaje + link a comprar créditos.
  - Si parser falló antes → no se llama al servidor, no se cobra.
- El check `hasCredits` del frontend se mantiene **solo como UX** (deshabilitar el botón); el guardia real está en BD.

### 3. Dashboard e historial leen de la BD

- `src/routes/dashboard.tsx` y `src/routes/history.tsx` pasan a `useSuspenseQuery(listMyAnalyses())` en vez de leer `mock-store`.
- `src/routes/analysis.$id.tsx` carga vía `getAnalysis(id)` server-side.
- `mock-store` queda como caché opcional o se elimina.

## Lo que el usuario verá

1. Paga → recibe N créditos.
2. Descarga `.exe` (sin coste, sin gastar crédito).
3. Apaga internet, ejecuta `.exe`, obtiene ZIP en `Downloads/mvt-insight/`.
4. Reconecta internet, va a la web, sube el ZIP.
5. La web muestra: "Procesando… Análisis listo. Te quedan N-1 créditos."
6. Si el ZIP estaba corrupto → "Error al procesar. No se ha descontado ningún crédito."

## Lo que esto resuelve

- ✅ Sin internet en el `.exe` ya no bloquea nada.
- ✅ El crédito se cobra solo si el informe se genera correctamente.
- ✅ Aunque alguien clone el `.exe` o el repo sea público, sin tu backend no obtiene informe → tu negocio está protegido.
- ✅ El parser puede seguir corriendo en el navegador igual que ahora; la diferencia es que el **guardado y el descuento** son server-side y atómicos.
- ✅ Stripe + recarga de créditos vía webhook: intactos.

## Limitación honesta

Un usuario muy técnico puede clonar el repo, ejecutar `parseMvtFiles` localmente y ver el JSON crudo en su consola. Pero no obtiene: informe persistente, dashboard, PDF, traducciones, IOCs, ni historial. Es equivalente a "hazlo tú con AndroidQF + Python" → ya es posible hoy con software open source. El valor que vendes es la plataforma.

## Orden de implementación

1. Migración SQL (tabla `analyses` + función `consume_credit_and_insert_analysis`).
2. `src/lib/analyses.functions.ts` con los 3 server functions.
3. Modificar `src/routes/upload.tsx → StepUpload.start()`.
4. Migrar `dashboard.tsx`, `history.tsx`, `analysis.$id.tsx` a leer de BD.
5. Simplificar `desktop/electron/main.cjs` (quitar updater bloqueante, dejarlo en background).
6. Subir versión `desktop/package.json` a `1.0.9` y recompilar `.exe`.
