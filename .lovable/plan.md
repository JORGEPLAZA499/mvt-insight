## Vincular desktop con el user_code de la cuenta

Sustituir el código generado de 8 caracteres por el **user_code** permanente de cada cuenta (ej. `AN3-E9T-EV8`). La app desktop lo introduce y queda vinculada al instante, sin pasar por la web ni aprobar nada.

### Cambios

**1. Backend — `src/routes/api/public/desktop/pair.ts`**
- Cambiar el schema de validación: aceptar `user_code` con formato `XXX-XXX-XXX` (3 grupos de 3 alfanuméricos separados por guiones), normalizando a mayúsculas y quitando espacios.
- Reemplazar la lógica que consulta `desktop_pairing_codes` por una consulta a `accounts` con `.eq('user_code', code)` para obtener el `id` (= `user_id`).
- Eliminar el paso de "marcar como usado" (el user_code es reutilizable).
- Mantener la creación del registro en `desktop_tokens` y la devolución de `{ token, email, label }`.
- Códigos de error: `INVALID_CODE` si el formato no cuadra, `CODE_INVALID_OR_EXPIRED` → renombrar a `USER_CODE_NOT_FOUND` si no existe en `accounts`.

**2. Web — `src/routes/settings/desktop.tsx`** (pantalla "App de escritorio")
- Eliminar el botón "Generar código" y el contador regresivo.
- Mostrar el **user_code actual del usuario** (leído de `accounts`) de forma destacada, con botón "Copiar".
- Texto explicativo: "Introduce este código en la app de escritorio para vincularla. Puedes usarlo en varios dispositivos."
- Mantener la lista de tokens activos y la opción de revocarlos.

**3. Server fn — `src/lib/desktop-pairing.functions.ts`**
- Eliminar `createPairingCode` (ya no se genera nada).
- Añadir `getMyUserCode` que devuelve el `user_code` del usuario autenticado leyendo de `accounts`.
- Mantener `listDesktopTokens` y `revokeDesktopToken`.

**4. App desktop — `desktop/src/App.tsx`**
- Actualizar el regex de validación del input al formato `^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$` (11 chars con guiones).
- Cambiar el placeholder a algo tipo `ABC-123-XYZ`.
- Auto-formatear mientras se teclea: insertar guiones cada 3 caracteres y forzar mayúsculas.
- Actualizar el texto de ayuda: "Encuentra tu código de usuario en la web, sección App de escritorio".

**5. Base de datos**
- La tabla `desktop_pairing_codes` queda sin uso. Propuesta: dejarla por ahora (no romper nada), o borrarla en una migración aparte si lo confirmas.

### Implicaciones de seguridad (a tener claras)

- El `user_code` es **permanente**: cualquiera que lo vea (captura, soporte, hombro) puede vincular un desktop a tu cuenta hasta que revoques el token desde la web.
- Mitigación existente: el usuario puede revocar tokens desde Settings → App de escritorio.
- Mitigación recomendada (opcional, no incluida por defecto en este plan): rate-limit del endpoint `/api/public/desktop/pair` por IP para evitar fuerza bruta sobre el formato `XXX-XXX-XXX` (~46.000M combinaciones, ya muy difícil de adivinar).

### Detalles técnicos

- Formato user_code confirmado en BD: `^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$` (excepto `Admin` que es un caso especial — el endpoint debería rechazarlo para que la cuenta admin no se pueda vincular vía este flujo, o aceptarlo según prefieras).
- El endpoint sigue siendo público (`/api/public/...`) y no requiere sesión web — la "autenticación" es conocer el user_code.
