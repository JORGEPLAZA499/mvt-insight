# Cobrar al generar el informe, no al descargar el .exe (implementado v1.0.9)

## Resumen del cambio

El `.exe` pasa a ser una utilidad **gratuita** que solo genera un ZIP crudo. El descuento de crédito ocurre **en el servidor** cuando se sube el ZIP a la web y se procesa con éxito. Si falla, no se cobra. Aunque el repo sea público o alguien clone el `.exe`, sin el backend no obtiene informe.

## Cambios aplicados

### Backend (Lovable Cloud)
- Nueva tabla `public.analyses` (user_id, device, file_name, file_size, result jsonb).
- RLS: SELECT solo dueño o admin. Sin policy INSERT directa.
- Función SQL `consume_credit_and_insert_analysis` (`SECURITY DEFINER`, transaccional):
  - `SELECT credits FOR UPDATE` → si <1, `RAISE EXCEPTION 'INSUFFICIENT_CREDITS'`.
  - Decrementa `accounts.credits` y `INSERT INTO analyses` en la misma TX.
  - GRANT EXECUTE solo a `service_role`.

### Web
- `src/lib/analyses.functions.ts` — `processAndStoreAnalysis` (server fn protegido con `requireSupabaseAuth`) que llama al RPC.
- `src/routes/upload.tsx` (StepUpload) y `src/components/app-shell.tsx` (quick upload): tras parsear localmente, llaman al server fn antes de guardar en mock-store. Si el server devuelve `INSUFFICIENT_CREDITS` o error, no se navega ni se cachea nada.
- i18n: añadidas claves `shell.quick.noCredits` y `upload.step4.errors.noCredits` en ES y EN.

### Desktop
- `desktop/electron/main.cjs`: eliminada la ventana modal de actualización que bloqueaba el arranque sin internet. La app arranca de inmediato; el updater corre 30 s después en background y, si encuentra una versión, muestra un diálogo no bloqueante ("Instalar ahora" / "Más tarde"). Sin internet, silencio total.
- Borrados `desktop/electron/updater.html` y `desktop/electron/preload-updater.cjs`.
- `desktop/package.json`: versión `1.0.8` → `1.0.9`.
- `src/routes/upload.tsx`: `APP_VERSION` → `1.0.9`.

## Siguiente paso

Compilar y publicar `MvtInsight-Setup-1.0.9.exe` desde el workflow `release.yml` (Actions → Run workflow). La versión instalada actual recibirá el aviso al abrirse con internet.
