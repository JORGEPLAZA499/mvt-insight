# Quitar el correo predeterminado en Stripe Link

## Causa

El email que ves (`5szuu2kh3@mvt-accounts.l…`) es el correo "anónimo" con el que el usuario quedó registrado en la cuenta de la app. En `src/lib/payments.functions.ts` (línea 68) creamos/recuperamos un `Customer` de Stripe usando ese email y lo adjuntamos a la sesión de checkout (`customer: customerId`). Stripe Link, al ver un `Customer` con email, lo prerrellena automáticamente en el widget.

El webhook (`src/routes/api/public/payments/webhook.ts`) no necesita el `customer` para acreditar el saldo — usa `session.metadata.userId`. Así que podemos quitar el customer sin romper nada.

## Cambio

En `src/lib/payments.functions.ts` dentro de `createCreditsCheckout`:

1. Eliminar la llamada `resolveOrCreateCustomer(...)` y la variable `customerId`.
2. Quitar `customer: customerId` de `stripe.checkout.sessions.create({...})`.
3. No pasar `customer_email` tampoco — así Stripe Link arranca con el campo vacío y el cliente lo rellena (o no) voluntariamente.

`resolveOrCreateCustomer` se mantiene en el archivo por si hace falta en otro flujo; solo dejamos de usarlo aquí.

## Resultado

El widget de Link aparece sin email prerrellenado. La acreditación de créditos sigue funcionando porque el webhook lee `metadata.userId`.
