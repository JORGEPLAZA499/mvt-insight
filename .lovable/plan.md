## Objetivo

Tener un producto de prueba en Stripe que cueste **1 €** y acredite **100 créditos**, sin que aparezca en el selector del `PurchaseCard`.

## Cómo encaja con el código actual

- `createCreditsCheckout` (`src/lib/payments.functions.ts`) acepta cualquier `priceId` que matchee `/^credits_\d+$/` y deriva los créditos del número (`credits_100` → 100 créditos).
- El webhook (`src/routes/api/public/payments/webhook.ts`) lee `session.metadata.credits` y suma al balance del usuario.
- El selector de la UI (`CREDIT_OPTIONS` en `purchase-card.tsx`) sólo muestra múltiplos de 98 (`ANALYSIS_COST`), así que un `credits_100` **no aparece de forma natural** en el desplegable.

Por tanto, basta con crear el producto/precio en Stripe — no hace falta tocar la UI ni la lógica de checkout.

## Pasos

1. **Crear producto en Stripe sandbox** vía `payments--create_product`:
   - `product_id`: `testanalisis`
   - `product_name`: `Test análisis (1 €)`
   - `product_description`: `Producto de prueba — 100 créditos por 1 € (no visible en el front)`
   - `tax_code`: `txcd_10103001` (igual que los demás)
   - `price_id`: `credits_100`
   - `amount`: `100` (céntimos)
   - `currency`: `eur`
   - `quantity_min`/`max`: `1`/`1`

   Stripe lo replicará a live automáticamente al publicar, así que sólo se crea en sandbox.

2. **Cómo lanzar el checkout de prueba** (sin tocar el front): desde la consola del navegador en la preview, autenticado, ejecutar:

   ```js
   // priceId = "credits_100" → 1 € → 100 créditos
   ```

   Lo invocas igual que el botón normal pero pasando `credits_100`. Si prefieres un atajo, puedo añadir (en una iteración futura) un parámetro oculto `?test=1` que fuerce el priceId — pero por ahora **no se toca la UI**, tal como pediste.

## Verificación posterior

- Listar precios en Stripe y confirmar que aparece `credits_100` a 100 céntimos.
- Confirmar que el desplegable del `PurchaseCard` sigue mostrando sólo los 10 paquetes habituales (98, 196, …, 980).
- Al completar un pago de prueba con tarjeta `4242 4242 4242 4242`, el webhook debería sumar 100 créditos al balance.

## Detalles técnicos

- No se modifica ningún archivo del repo.
- No se crea nada en live: Stripe sincroniza el producto cuando se publique / esté listo el entorno live.
- Si más adelante quieres una forma de disparar este checkout desde el front (botón oculto sólo para admins, o ruta `/dev/test-checkout`), se hace en un cambio posterior.
