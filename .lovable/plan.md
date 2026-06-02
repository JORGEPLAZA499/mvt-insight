## Contexto

El sistema Sentinel Scan está diseñado con **privacidad por defecto**: cuentas anónimas, sin email, sin recuperación por correo. Cuando se pierde la contraseña, la única vía es un reset manual desde el backend.

Ya existe una cuenta Admin (`user_code = 'Admin'`, id `e56a6a80-…`). Vamos a resetear su contraseña directamente en la base de datos de autenticación.

## Pasos

1. **Tú me das una contraseña nueva** (mínimo 8 caracteres, con mayúscula, minúscula y número — ej. `MiClaveAdmin2026`). Escríbela en el chat.
2. **Ejecuto una migración** que actualiza el campo `encrypted_password` del usuario admin en `auth.users` usando bcrypt:
   ```sql
   UPDATE auth.users
   SET encrypted_password = crypt('TU_NUEVA_CONTRASEÑA', gen_salt('bf')),
       updated_at = now()
   WHERE id = 'e56a6a80-3e6e-43a7-9907-052e8be73d6f';
   ```
3. **Entras en `/login`**:
   - Código de usuario: `ADMIN`
   - Contraseña: la nueva que me hayas dado
4. Una vez dentro, **cambia la contraseña** desde el panel admin (si existe esa opción) o avísame para añadir esa funcionalidad.

## Recomendación de seguridad

Después del reset, vale la pena añadir al panel admin una sección **"Cambiar contraseña"** para que no dependas de mí la próxima vez. Si quieres, lo añadimos como segundo paso tras recuperar el acceso.

## Alternativa

Si prefieres **no compartir** ni siquiera una contraseña temporal en chat, la opción B es: **borrar el admin actual** (cuenta + usuario auth) y volver a usar `/setup-admin` registrándote desde cero con `/login → Crear cuenta`, copiando el código generado, y luego pulsando "Convertir mi cuenta en Admin". Esa cuenta antigua se perderá completamente.

¿Qué prefieres, opción A (reset, dame contraseña) u opción B (borrar y recrear)?
