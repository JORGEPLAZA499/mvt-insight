# Plan: Stripe checkout para los 10 paquetes de créditos

## Datos confirmados
- **Proveedor**: Stripe Payments gestionado por Lovable (ya habilitado en el turno anterior).
- **IVA**: Compliance total (+3,5%) — `managed_payments: { enabled: true }` en cada sesión, `tax_code = txcd_10103001` (SaaS / servicios electrónicos forenses).
- **Moneda**: EUR.
- **Catálogo** (extraído del selector `CREDIT_OPTIONS` y del i18n `{{credits}} €`):

| ID Stripe | Créditos | Análisis | Precio |
|---|---|---|---|
| `credits_98`  | 98  | 1  | 98 € |
| `credits_196` | 196 | 2  | 196 € |
| `credits_294` | 294 | 3  | 294 € |
| `credits_392` | 392 | 4  | 392 € |
| `credits_490` | 490 | 5  | 490 € |
| `credits_588` | 588 | 6  | 588 € |
| `credits_686` | 686 | 7  | 686 € |
| `credits_784` | 784 | 8  | 784 € |
| `credits_882` | 882 | 9  | 882 € |
| `credits_980` | 980 | 10 | 980 € |

Cada producto guarda `metadata.credits` con el número exacto, para que el webhook sepa cuánto sumar.

## Qué construyo

### 1. Productos en Stripe
Una llamada a `batch_create_product` con los 10 productos, todos con:
- `currency: "eur"`, `amount` en céntimos (9800, 19600, …, 98000)
- `quantity_min/max = 1` (paquete único, no por unidades)
- `tax_code: "txcd_10103001"`

Después, un setup único que añade `metadata.credits` a cada producto vía `stripe.products.update` (la herramienta `batch_create_product` no acepta metadata).

### 2. Migración DB
Añadir a `credit_recharges`:
- columna `stripe_session_id text unique` (idempotencia del webhook)
- columna `source text default 'token'` (`'token'` vs `'stripe'`)
- GRANT correcto a `service_role` (ya lo tiene por defecto en este proyecto, verifico).

### 3. Server functions (`src/lib/payments.functions.ts`)
- `createCreditsCheckout({ priceId, environment })` con `requireSupabaseAuth`:
  - Resuelve el `lookup_key` → `price.id` real.
  - `resolveOrCreateCustomer` con `metadata.userId = auth.uid()`.
  - Crea sesión Stripe Embedded: `mode: "payment"`, `ui_mode: "embedded_page"`, `managed_payments: { enabled: true }`, `metadata: { userId, credits, accountId }`, `payment_intent_data: { description: product.name }`, `return_url` → `/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
  - Devuelve `{ clientSecret }` o `{ error }` con `getStripeErrorMessage`.

### 4. Webhook (`src/routes/api/public/payments/webhook.ts`)
Ruta EXACTA exigida por Lovable. Verifica firma con `verifyWebhook(req, env)`. En `checkout.session.completed`:
1. Lee `session.metadata.userId`, `session.metadata.credits`, `session.id`.
2. `INSERT` idempotente en `credit_recharges` (`ON CONFLICT (stripe_session_id) DO NOTHING`); si ya existe, salir.
3. `UPDATE accounts SET credits = credits + N WHERE id = userId` con `supabaseAdmin`.
4. Responder 200.

### 5. Cableado en la tarjeta de compra
`src/components/purchase-card.tsx`:
- Mantener todo el diseño actual (selector desplegable, glow, branding de cards/crypto).
- Botón **"Pagar con tarjeta"** → abre overlay con `<StripeEmbeddedCheckout priceId={\`credits_${credits}\`} />` usando `useStripeCheckout` hook.
- Botón **"Pagar con cripto"** → por ahora deshabilitado con tooltip "Próximamente" (no incluido en este alcance, lo añadimos después con BTCPay/NowPayments si quieres).

### 6. Página de retorno
Ya existe `/dashboard`. Detectar `?checkout=success` y mostrar toast traducido + invalidar la query de créditos del shell para que el contador se actualice automáticamente.

### 7. Utilitarios obligatorios
- `src/lib/stripe.server.ts` con `createStripeClient`, `getConnectionApiKey`, `getStripeErrorMessage`, `verifyWebhook` (copy literal del knowledge — pasa por gateway, NO usa Stripe SDK directo).
- `src/lib/stripe.ts` cliente con `getStripe()` y `getStripeEnvironment()` derivando entorno de `VITE_PAYMENTS_CLIENT_TOKEN`.
- `<PaymentTestModeBanner />` en `__root.tsx` para avisar en preview que estás en modo test.
- Instalar `stripe@22.0.2`, `@stripe/stripe-js@9.2.0`, `@stripe/react-stripe-js@6.2.0`.

### 8. i18n
Añadir al namespace `purchase.*` y nuevo `checkout.*` en `es.json` / `en.json`:
- mensajes de éxito ("Pago confirmado — {{credits}} créditos añadidos"),
- errores (genérico + el mensaje crudo de Stripe),
- estados de carga del overlay,
- aviso de "Cripto próximamente".

## Lo que NO toco
- Diseño visual de `purchase-card.tsx` (mismo selector desplegable, mismas marcas, mismas dimensiones).
- Sistema de tokens manuales (canje de códigos en admin) — sigue funcionando en paralelo a Stripe.
- Lógica de "página /upload bloqueada si créditos < 98" — sigue igual; al sumar créditos por Stripe el bloqueo se desbloquea automáticamente.

## Tras aprobar
1. `batch_create_product` (10 productos EUR).
2. `stripe.products.update` con `metadata.credits` para cada uno.
3. Migración SQL (`stripe_session_id`, `source`).
4. Instalar deps + crear `stripe.server.ts`, `stripe.ts`, `payments.functions.ts`, webhook, `PaymentTestModeBanner`, hook `useStripeCheckout`.
5. Cablear `purchase-card.tsx` y `/dashboard`.
6. i18n.
7. Test en preview con `4242 4242 4242 4242` y verificación del webhook con `server-function-logs`.

¿Apruebas?
