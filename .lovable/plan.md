# Rotar credencial Admin y limpiar migración

## Problema
La migración `supabase/migrations/20260602043809_b5726ae1-db21-4ccd-88dc-6f250faa901b.sql` contiene la contraseña en claro `Junior88322512.` del usuario admin (`e56a6a80-3e6e-43a7-9907-052e8be73d6f`). Cualquiera con acceso al repo la ve.

## Pasos

1. **Rotar la contraseña en la base de datos** mediante una nueva migración que use un valor aleatorio fuerte generado al vuelo (`gen_random_bytes` + `encode`) y lo descarte. La nueva contraseña no quedará registrada en ningún sitio — tendrás que restablecerla desde la app con "Olvidé mi contraseña" o pedirme que te genere una nueva conocida vía `secrets`.
   
   Alternativa si prefieres seguir entrando con una contraseña conocida: la genero con `generate_secret` (queda guardada como secret server-only, nunca en el repo) y la aplico en la migración leyéndola desde una variable temporal. Dime cuál opción prefieres.

2. **Neutralizar la migración antigua**: editar `supabase/migrations/20260602043809_*.sql` para eliminar la línea con la contraseña en claro, sustituyéndola por un comentario `-- password rotated on 2026-06-26, see migration <new>`. No se puede borrar el archivo (rompería el historial), pero sí vaciar el contenido sensible.

3. **Marcar el finding como resuelto** en el escáner con explicación.

4. **Actualizar `@security-memory`** con la regla: nunca incluir contraseñas en migraciones; usar Auth Admin API o secrets.

## Pregunta para ti
¿Opción A (contraseña aleatoria descartada, recuperas vía email reset) u opción B (te genero una contraseña nueva conocida vía secret y te la entrego)?
