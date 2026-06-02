# Plan: Pagos con Stripe (paquetes de créditos)

## Aclaración previa importante
No puedo "copiar" las cuentas de pago del proyecto externo `rpjsoftware.com/eSIM` — cada proyecto en Lovable tiene sus propias conexiones aisladas y no tengo acceso a las credenciales de ese otro proyecto. Lo que sí puedo hacer es **dejar este proyecto listo para cobrar con Stripe**, usando la integración nativa de Lovable (sin necesidad de pegar API keys). Si después quieres unificar contabilidad con tu otra cuenta Stripe, lo gestionas desde el dashboard de Stripe (mismo email comercial, mismas cuentas bancarias).

Además, el `recommend_payment_provider` confirma que para "Spyware Forensic Analyzer" el proveedor correcto es **Stripe** (Paddle no es elegible automáticamente para este tipo de servicio forense). Por eso descartamos Paddle.

## Qué se va a construir

### 1. Habilitar Stripe Payments
Activar la integración nativa `enable_stripe_payments`. Esto crea automáticamente un entorno **test** (sandbox) para probar sin dinero real. Para cobrar en **live** necesitarás reclamar la cuenta Stripe que se crea (verificación KYC y datos bancarios). Tú rellenas un formulario corto (email, nombre, negocio) cuando se ejecute.

### 2. Política de impuestos
Antes de crear productos preguntaré qué nivel de gestión fiscal quieres:
- **Compliance total** (+3,5% por transacción): Stripe calcula, recauda, declara y paga IVA/VAT en ~80 países por ti. Recomendado para servicio digital vendido internacionalmente.
- **Solo cálculo** (+0,5%): Stripe calcula y cobra el IVA correcto; tú declaras.
- **Sin automatización**: tú te encargas de todo.

### 3. Catálogo de paquetes de créditos
Crear los productos en Stripe con `batch_create_product`. Propuesta inicial (1 análisis = 98 créditos), confirmamos contigo los precios exactos:

| Paquete | Créditos | Análisis | Precio sugerido |
|---|---|---|---|
| Starter | 98 | 1 | 9,90 € |
| Pro | 490 | 5 | 44,90 € |
| Business | 980 | 10 | 84,90 € |
| Enterprise | 4 900 | 50 | 399 € |

(Si en tu proyecto eSIM tienes otra estructura/precios y quieres replicar, dímelos y los uso tal cual.)

### 4. Flujo de compra integrado en la tarjeta existente
Conectar el `purchase-card.tsx` actual (selector desplegable de paquetes) a Stripe:
- Click en "Comprar" → server function crea una **Stripe Checkout Session** con el paquete seleccionado y `success_url` / `cancel_url` apuntando a `/dashboard`.
- Redirección a Checkout hospedado por Stripe.
- Tras pago OK → vuelta al dashboard con toast de confirmación.

### 5. Webhook de confirmación y recarga de créditos
Endpoint público `src/routes/api/public/webhooks/stripe.ts` que:
- Verifica la firma `stripe-signature` con el webhook secret.
- En `checkout.session.completed`: identifica al `account_id` (metadata de la sesión), suma los créditos correspondientes en la tabla `accounts` y registra la operación en `credit_recharges`.
- Idempotente (no duplica recargas si Stripe reintenta el evento).

### 6. Internacionalización
Añadir claves en `es.json` / `en.json` para los mensajes del flujo de checkout, errores de pago y confirmaciones (siguiendo el namespace `purchase.*` ya existente).

## Detalles técnicos

- **Stack**: TanStack Start server functions (`createServerFn`) para crear sesiones de checkout; ruta `/api/public/webhooks/stripe` para el webhook (sin auth, validada por firma HMAC).
- **DB**: reutiliza tablas existentes `accounts.credits` (UPDATE) y `credit_recharges` (INSERT vía `supabaseAdmin`). Añadir migración para columna `stripe_session_id` única en `credit_recharges` para garantizar idempotencia.
- **Mapeo paquete → créditos**: en metadata de cada Product Stripe (`metadata.credits`).
- **Seguridad**: webhook verifica firma con `STRIPE_WEBHOOK_SECRET` antes de tocar nada; todas las escrituras usan `supabaseAdmin` solo dentro del handler verificado.
- **Lo que NO toco**: `purchase-card.tsx` mantiene su diseño actual, solo se cablea el `onClick` del botón de compra.

## Orden de ejecución
1. Habilitar Stripe Payments (formulario tuyo).
2. Confirmar política fiscal + precios de paquetes.
3. Crear productos en Stripe.
4. Implementar checkout + webhook + migración DB.
5. Probar en modo test con tarjeta `4242 4242 4242 4242`.
6. Reclamar cuenta Stripe y pasar a live cuando estés listo.

¿Apruebas el plan?
