Implementar subida automática del ZIP al servidor desde la app de escritorio, reutilizando la sesión web mediante un código de vinculación de un solo uso. Sin contraseñas en el desktop, sin storage de ZIPs (el `result` parseado va a `public.analyses` como ya hace la web).

---

## Visión general del flujo

```
┌──────────────────────────┐    ┌────────────────────────────┐
│  Web (ya autenticado)    │    │  Desktop (sin sesión)      │
│                          │    │                            │
│  /settings/desktop       │    │  Pantalla "Vincular"       │
│  → "Generar código"      │    │  → pegar código            │
│  ── pairing_code ───────►│    │  → POST /pair → token      │
│                          │    │  → safeStorage             │
└──────────────────────────┘    └────────────────────────────┘
                                              │
                                              ▼
                                  Análisis termina (AndroidQF)
                                              │
                                              ▼
                                  Parseo local del ZIP
                                  → POST /submit-analysis
                                  → BD descuenta 1 crédito
                                  → analysisId
                                              │
                                              ▼
                                  Abrir /analysis/<id> en navegador
```

---

## Cambios

### 1. Base de datos (migración nueva)

Dos tablas + RLS:

**`public.desktop_pairing_codes`**
- `code text primary key` (8 chars, base32 sin caracteres ambiguos)
- `user_id uuid not null`
- `expires_at timestamptz not null` (now + 10 min)
- `used_at timestamptz nullable`
- `created_at timestamptz default now()`

RLS: SELECT/INSERT/UPDATE solo para el dueño. Las server routes públicas usan `supabaseAdmin` (bypassa RLS).

**`public.desktop_tokens`**
- `token text primary key` (`dt_` + uuid hex, 36+ chars)
- `user_id uuid not null`
- `label text default 'Desktop'`
- `created_at timestamptz default now()`
- `last_used_at timestamptz nullable`
- `revoked_at timestamptz nullable`

RLS: SELECT/UPDATE (para revocar) solo dueño. Sin INSERT desde cliente (solo server route con admin).

GRANTs estándar para `authenticated` + `service_role`.

### 2. Web — generación del código

**`src/lib/desktop-pairing.functions.ts`** (nuevo)
- `createPairingCode` (server fn, `requireSupabaseAuth`): inserta fila con código aleatorio, devuelve `{ code, expiresAt }`.
- `listDesktopTokens` (server fn): lista tokens no revocados del usuario para la pantalla de gestión.
- `revokeDesktopToken` (server fn): marca `revoked_at`.

**`src/routes/_authenticated/settings.desktop.tsx`** (nuevo)
- Sección "Vincular app de escritorio":
  - Botón "Generar código" → muestra el código grande, monoespaciado, con countdown de 10 min y botón "Copiar".
  - Lista de dispositivos vinculados (label + created_at + último uso + botón "Revocar").
- Enlazar desde el sidebar/menú existente (un único enlace en el shell).

### 3. Server routes públicas (consumidas por desktop)

**`src/routes/api/public/desktop/pair.ts`** — POST
- Body Zod: `{ code: string(8) }`.
- `supabaseAdmin`: busca código no usado y no expirado, lo marca `used_at = now()`, crea fila en `desktop_tokens`, devuelve `{ token, userEmail, label }`.

**`src/routes/api/public/desktop/submit-analysis.ts`** — POST
- Header `Authorization: Bearer dt_...`.
- Body Zod: `{ device, fileName, fileSize, result }` (mismo shape que `processAndStoreAnalysis`).
- Valida token (no revocado), actualiza `last_used_at`, llama a RPC `consume_credit_and_insert_analysis(user_id, ...)`, devuelve `{ ok, analysisId, remainingCredits }` o `{ ok:false, error:'INSUFFICIENT_CREDITS' }`.

**`src/routes/api/public/desktop/whoami.ts`** — GET
- Header bearer, devuelve `{ email, label, remainingCredits }`. Útil para que el desktop muestre quién está vinculado y los créditos restantes.

Validación de input con Zod en todas (tamaños max, regex del token). Sin CORS porque el desktop hace fetch directo a la URL pública.

### 4. Desktop — parser y subida

**`desktop/src/lib/mvt-parser.ts`** y **`desktop/src/lib/mvt-modules.ts`** (nuevos, copia inicial de `src/lib/`)
- `bun add jszip` en `desktop/`.
- Mismo código que la web. Asumimos divergencia mínima; si el web evoluciona, se actualiza manualmente. Nota en cabecera: "Copia de src/lib/mvt-parser.ts (web). Mantener sincronizado".

**`desktop/electron/main.cjs`**
- Nuevos handlers IPC:
  - `auth:get` → lee token desde `safeStorage` (archivo `userData/desktop-token.enc`).
  - `auth:save({ token })` → cifra con `safeStorage` y guarda.
  - `auth:clear` → borra.
  - `mvt:readZip(zipPath)` → devuelve el contenido binario del ZIP como `Uint8Array` al renderer (para que pueda parsearlo con jszip sin pasar por `File`).
- Usa `app.getPath('userData')` para el archivo del token.

**`desktop/electron/preload.cjs`** — expone los 4 métodos nuevos.

**`desktop/src/App.tsx`**
- Estado nuevo: `account: { email, label, credits } | null`.
- Al arrancar: si hay token, llama a `/api/public/desktop/whoami` para hidratar `account`. Si 401, borra token.
- **Pantalla "link"** (nueva, se muestra cuando no hay token):
  - Texto: "Para subir resultados automáticamente, vincula esta app con tu cuenta web. Entra en spyware.rpjsoftware.com → Ajustes → App de escritorio, genera un código y pégalo aquí."
  - Input para el código de 8 chars.
  - Botón "Vincular" → POST a `/pair` → guarda token via IPC → carga `whoami` → pasa a `welcome`.
  - Botón "Abrir página de vinculación" → `openExternal('https://spyware.rpjsoftware.com/settings/desktop')`.
- **TopBar** (en todas las pantallas): si `account` → muestra `email · N créditos · [Cerrar sesión]`. Si no → enlace pequeño "Vincular".
- **Pantalla "done"** (tras análisis):
  - Si hay token: automáticamente, sin pulsar nada, llama a `/api/public/desktop/submit-analysis` con `result` ya parseado. Muestra estados: `uploading` (con spinner) → `uploaded` → muestra link al informe → o `error` con botón "Reintentar".
  - Botones finales: **"Ver informe →"** (abre `https://spyware.rpjsoftware.com/analysis/<id>` externo), "Abrir carpeta del ZIP", "Nuevo análisis".
  - Si no hay token: comportamiento actual (subida manual arrastrando al navegador).
- Manejo de errores:
  - `INSUFFICIENT_CREDITS` → mensaje claro + botón "Recargar créditos" (abre `/dashboard` externo).
  - Token revocado / inválido → borra token, vuelve a pantalla "link".

**`desktop/src/i18n/locales/{es,en}.json`** — claves nuevas: `link.*`, `done.uploading`, `done.uploaded`, `done.viewReport`, `account.*`, `done.errors.*`.

### 5. Versión

No se bumpea. Sigue en `1.0.21` hasta que digas "publica".

---

## Lo que NO entra en esta fase
- Storage del ZIP en servidor (no es necesario; el `result` parseado basta).
- Subida por arrastre dentro del desktop.
- Múltiples tokens con labels personalizables al vincular (label fijo "Desktop").
- Notificaciones de sistema.
- Auto-revincular sin código si caduca el token.

---

## Detalles técnicos

- **Generación de código**: `crypto.randomBytes(5)` → base32 sin `0/O/1/I/L` → 8 chars legibles. Colisiones despreciables a 10 min de TTL.
- **Token**: `'dt_' + crypto.randomUUID().replace(/-/g,'')` → 35 chars. No hace falta hashear porque la BD vive en Supabase (no leak por SELECT) y RLS impide listar tokens ajenos.
- **safeStorage** está disponible solo tras `app.whenReady()`. En Linux sin keyring usa cifrado básico (acceptable para esto, alternativa sería pedir contraseña).
- **CORS**: las rutas son llamadas por el desktop con `fetch`, no por navegador cross-origin. No es necesario añadir headers CORS, pero las añado por si en el futuro hay UI web que las consume.
- **URL base**: el desktop usa `https://spyware.rpjsoftware.com` hardcodeado en una constante `WEB_BASE_URL` para `openExternal` y `fetch`. Sin variables de entorno; es producción.

---

## Orden de implementación recomendado (un solo bloque, pero por orden)
1. Migración BD + GRANTs + RLS.
2. Server routes públicas + server fns web.
3. Página `/_authenticated/settings/desktop`.
4. Copia del parser al desktop + `jszip`.
5. IPC handlers + safeStorage en main.cjs/preload.cjs.
6. UI desktop: pantalla link, topbar de cuenta, lógica de subida en pantalla done, i18n.