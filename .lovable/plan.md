## Panel de administración

Crear una sección de admin accesible solo cuando el `user_code` del usuario logueado es `Admin`. Tres pestañas dentro del panel.

### 1. Acceso
- Nueva ruta `/_authenticated/admin` protegida por un check: si `account.user_code !== "Admin"` → redirect a `/dashboard`.
- Añadir un ítem "Administración" en el sidebar (`app-shell.tsx`) visible solo cuando el usuario actual es Admin.

### 2. Cambios de base de datos (migraciones)

**Tabla `accounts`** — añadir columnas:
- `credits` (int, default 0) — saldo de créditos del usuario.

**Nueva tabla `credit_recharges`** — historial de recargas:
- `account_id` (uuid, FK a accounts)
- `amount` (int) — créditos añadidos
- `token_id` (uuid, nullable) — token usado, si aplica
- `created_at` (timestamptz)

**Nueva tabla `credit_tokens`** — tokens canjeables para comprar créditos:
- `code` (text único) — el token generado
- `credits` (int) — cuántos créditos otorga
- `created_by` (uuid) — admin que lo generó
- `redeemed_by` (uuid, nullable) — usuario que lo canjeó
- `redeemed_at` (timestamptz, nullable)
- `created_at` (timestamptz)

RLS:
- `accounts`: política extra para que Admin pueda leer todos los registros.
- `credit_recharges` / `credit_tokens`: lectura/escritura solo para Admin; los usuarios normales solo ven sus propias recargas y pueden canjear tokens vía server function.

### 3. Pestañas del panel

**a) Clientes**
Tabla con: número de usuario (`user_code`), créditos actuales, total recargado, fecha y hora del último login, fecha de creación. Búsqueda por código.

**b) Tokens**
- Formulario: input "créditos" + botón "Generar token" → server function crea token aleatorio (12 chars) y lo muestra para copiar.
- Tabla de tokens emitidos con estado (Disponible / Canjeado por X el [fecha]).
- En el sidebar de usuarios normales, el botón "Comprar créditos" abrirá un diálogo donde pegan el código → server function lo valida y acredita.

**c) Salud del sistema**
Tarjetas con:
- Estado de la conexión a la base de datos (ping).
- Conteos: nº de cuentas, nº de análisis totales (si hay tabla), tokens activos vs canjeados, créditos en circulación.
- Última actividad (último login registrado, última recarga).
- Versión de la app y timestamp de carga.

### 4. Server functions (nuevas, en `src/lib/admin.functions.ts` y `src/lib/credits.functions.ts`)
- `listAccounts` (Admin) — lista todos con stats agregadas.
- `generateCreditToken({ credits })` (Admin) — crea token.
- `listCreditTokens` (Admin).
- `getSystemHealth` (Admin) — conteos y ping.
- `redeemCreditToken({ code })` (cualquier user autenticado) — canjea token, inserta `credit_recharges`, incrementa `accounts.credits`.

Todas usan `requireSupabaseAuth` y verifican el rol comprobando `user_code === 'Admin'` antes de ejecutar.

### 5. UI
- Componentes shadcn existentes (Tabs, Table, Card, Dialog, Input, Button).
- Diseño coherente con el resto del dashboard (mismos tokens semánticos).

### Notas técnicas
- "Admin" se identifica por el valor literal `user_code = 'Admin'` en la tabla `accounts`. El usuario tendrá que registrarse con ese código (o lo marcamos manualmente tras el registro).
- No se implementa pasarela de pago real: las recargas se hacen exclusivamente vía tokens generados por el admin.
