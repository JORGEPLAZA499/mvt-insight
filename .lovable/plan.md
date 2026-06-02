# Plan: Registro real con código de usuario y auto-eliminación

## Resumen del flujo

1. Usuario pulsa **Crear cuenta** → sistema genera código `XXX-XXX-XXX` (9 alfanuméricos A-Z/0-9, sin O/0/I/1 ambiguos).
2. Usuario define contraseña (mín 8, mayúscula + minúscula + número).
3. Backend crea la cuenta y muestra pantalla de confirmación:
   > "Cuenta activada. Guarda en un lugar seguro tu código de usuario: **K7M-2P9-XQ4**. Si lo pierdes, nadie —ni siquiera la organización— podrá acceder al panel."
4. Login = código de usuario + contraseña (sin email, sin recuperación).
5. Si la cuenta no registra acceso durante **10 días**, se elimina automáticamente.

## Cambios técnicos

### 1. Activar Lovable Cloud
Necesario para base de datos, auth y cron job.

### 2. Esquema de base de datos
- Tabla `accounts`:
  - `id uuid` (PK, = `auth.users.id`)
  - `user_code text unique not null` (formato `XXX-XXX-XXX`)
  - `password_hash text not null` (bcrypt vía pgcrypto)
  - `created_at timestamptz`
  - `last_login_at timestamptz` (se actualiza en cada login exitoso)
- RLS activada; tabla solo accesible vía server functions con `supabaseAdmin`.
- Índice único en `user_code`.

### 3. Server functions (TanStack `createServerFn`)
- `registerAccount()` → genera código único (reintenta si colisiona), valida contraseña, hashea con bcrypt, inserta fila, devuelve el código en texto plano **una sola vez**.
- `loginWithCode({ code, password })` → busca por `user_code`, verifica hash, actualiza `last_login_at`, emite sesión (cookie httpOnly firmada con `SESSION_SECRET`).
- `logout()` → limpia sesión.
- `getCurrentAccount()` → devuelve datos del usuario actual.

### 4. Auto-eliminación a 10 días
- Endpoint público protegido: `/api/public/cron/purge-inactive` que ejecuta `DELETE FROM accounts WHERE last_login_at < now() - interval '10 days'`. Protegido con header secreto `CRON_SECRET`.
- pg_cron diario invocando ese endpoint vía `net.http_post`.

### 5. Cambios de UI
- Reemplazar `src/routes/login.tsx`:
  - Modo **registro**: solo campo contraseña + confirmar. Al éxito → pantalla destacada con el código generado, botón "Copiar" y checkbox "He guardado mi código" para continuar.
  - Modo **login**: campo código (con máscara `___-___-___`) + contraseña.
- Eliminar campo email del flujo.
- Validación cliente con Zod (formato código + política de contraseña con feedback en vivo).
- Actualizar `src/lib/mock-store.ts` `getSession/setSession` para usar la sesión real del servidor (o reemplazar por hook `useAccount`).
- Textos i18n ES/EN para los nuevos mensajes (privacidad, código irrecuperable, aviso de 10 días).

### 6. Aviso visible
Tras login y en el dashboard, banner discreto: "Tu cuenta se eliminará si no inicias sesión durante 10 días."

## Notas de seguridad
- Código generado con `crypto.randomBytes` y alfabeto sin ambigüedades.
- Contraseña hasheada server-side (bcrypt, cost 12), nunca almacenada en claro.
- Sesión en cookie httpOnly + Secure + SameSite=Lax.
- Rate limiting básico en `loginWithCode` (in-memory por IP, advertencia: no apto para producción a gran escala — se puede mejorar después con tabla en DB).
- El código solo se muestra una vez; no existe endpoint para recuperarlo.

## Fuera de alcance
- Recuperación de cuenta (intencionalmente imposible).
- 2FA (se puede añadir después).
- Migración de las cuentas mock existentes en localStorage (se descartan).
