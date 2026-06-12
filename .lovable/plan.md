
## Objetivo

Activar el botón "Pagar con cripto" en el modal `PurchaseCard` (panel autenticado) usando **Plisio** como pasarela. Hoy el botón está deshabilitado (`disabled` + "Soon"). Al pulsarlo se creará una factura en Plisio y se redirigirá al usuario al hosted invoice URL. Al confirmarse el pago, Plisio llamará a un webhook que acreditará los créditos en la cuenta exactamente igual que Stripe.

## Secretos necesarios

Se pedirán por `add_secret` (tú ya tienes la API key):

- `PLISIO_API_KEY` — Secret API key de tu merchant Plisio.
- `PLISIO_CALLBACK_SECRET` *(opcional)* — Si lo quieres, se omite y validamos con HMAC SHA1 usando `PLISIO_API_KEY` (el método que documenta Plisio: `hash = hmac_sha1(api_key, json_sorted_payload)` comparado con `verify_hash` del JSON recibido).

## Cambios

### 1. Backend — nueva server function `createPlisioInvoice`

Archivo nuevo: `src/lib/plisio.functions.ts`

- `createServerFn({ method: "POST" })` + `requireSupabaseAuth`.
- Input validado con zod: `{ credits: number (98..980, múltiplo de 98) }`.
- Calcula `amountEur = credits` (1 crédito = 1 €, igual que Stripe en este proyecto).
- Llama a `https://api.plisio.net/api/v1/invoices/new` con:
  - `source_currency=EUR`, `source_amount=<eur>`,
  - `order_number=<uuid v4 generado en server>`,
  - `order_name="Créditos análisis forense (xN)"`,
  - `callback_url=https://spyware.rpjsoftware.com/api/public/payments/plisio-webhook?json=true`,
  - `success_callback_url` / `cancel_url` → `/dashboard?checkout=success` / `/dashboard?checkout=cancel`,
  - `email=<email del usuario>`,
  - `api_key=PLISIO_API_KEY`.
- Inserta fila `pending` en una nueva tabla `plisio_invoices` (ver migración abajo) con `order_number`, `account_id`, `credits`, `invoice_id` devuelto por Plisio.
- Devuelve `{ invoice_url }` (campo `data.invoice_url` de la respuesta).

### 2. Backend — nueva ruta pública `/api/public/payments/plisio-webhook`

Archivo nuevo: `src/routes/api/public/payments/plisio-webhook.ts`

- `POST`. Lee `request.json()`.
- Valida `verify_hash` con HMAC-SHA1 sobre el payload (estable, sin el campo `verify_hash`) usando `PLISIO_API_KEY`. Si falla → 401.
- Solo procesa `status === "completed"` o `status === "mismatch"` (con `source_amount` recibido ≥ esperado).
- Busca fila en `plisio_invoices` por `order_number`. Si no existe o ya `processed_at != null` → 200 OK idempotente.
- Inserta en `credit_recharges` con `source='plisio'`, `stripe_session_id=plisio_<order_number>` (reutilizamos la columna única para idempotencia) y `amount=credits`.
- Suma `credits` a `accounts.credits` igual que el webhook de Stripe.
- Marca `plisio_invoices.processed_at = now()`.

### 3. Migración SQL

```sql
CREATE TABLE public.plisio_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  invoice_id text,
  credits integer NOT NULL CHECK (credits > 0),
  amount_eur numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT ON public.plisio_invoices TO authenticated;
GRANT ALL ON public.plisio_invoices TO service_role;
ALTER TABLE public.plisio_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plisio invoices"
  ON public.plisio_invoices FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR public.is_admin(auth.uid()));
```

### 4. Frontend — habilitar botón en `PurchaseCard`

`src/components/purchase-card.tsx`:

- Importar `useServerFn` y `createPlisioInvoice`.
- Quitar `disabled` y `title` del botón cripto.
- `onClick`: llama a `createPlisioInvoice({ data: { credits } })`, recibe `invoice_url` y hace `window.location.href = invoice_url` (Plisio renderiza su propio checkout con BTC/ETH/USDT/TRX/BNB).
- Estado local `cryptoLoading` para deshabilitar y mostrar spinner en el botón mientras se crea la factura. Errores → `toast` de error.
- Eliminar el chip "Soon" sólo del botón cripto (las marquitas `cryptoBrands` se mantienen).

### 5. i18n

Añadir cadenas:

- `purchase.cryptoLoading` (es/en) — "Generando factura…" / "Generating invoice…".
- `purchase.cryptoError` (es/en) — "No se pudo iniciar el pago con cripto" / "Could not start crypto payment".
- Eliminar uso de `purchase.cryptoSoon` y `purchase.soon` en este botón (mantener las claves por si se usan en otro sitio).

## Fuera de alcance

- No se toca el flujo Stripe.
- No se cambia el sidebar ni el desktop app.
- No se bumpea `desktop/package.json`.
- No se implementan reintentos automáticos; el webhook ya es idempotente.

## Notas técnicas

- Plisio no expone SDK npm oficial bien mantenido; usamos `fetch` directo desde la server function (Worker-compatible).
- El callback debe llevar `?json=true` para que Plisio envíe JSON en vez de form-urlencoded.
- Verificación HMAC: ordenamos claves del payload alfabéticamente y serializamos con `JSON.stringify` antes del `crypto.createHmac('sha1', PLISIO_API_KEY).update(json).digest('hex')`. Es el método documentado por Plisio.
