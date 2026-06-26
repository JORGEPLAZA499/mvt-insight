# Proteger el endpoint cron de purga con un secreto server-only

## Problema
`src/routes/api/public/cron/purge-inactive.ts` valida con el anon key, que está publicado en el bundle del navegador. Cualquiera puede invocarlo y borrar todas las cuentas inactivas >10 días.

## Pasos

1. Generar un secreto aleatorio `CRON_SECRET` (64 chars), server-only.
2. Modificar `purge-inactive.ts`: leer `process.env.CRON_SECRET` dentro del handler y comparar contra el header `x-cron-secret` con `timingSafeEqual`. Si falta o no coincide → 401.
3. Reprogramar el job de `pg_cron` (unschedule + schedule) para enviar `x-cron-secret: <valor>` en lugar de `apikey`.
4. Marcar el finding como resuelto y actualizar `@security-memory`.

## Sin impacto al usuario
Cambio puramente interno. Si la reprogramación fallara, en el peor caso el cron devuelve 401 y la purga no corre hasta arreglarlo — nadie pierde datos de usuario.
