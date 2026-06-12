## Objetivo

Mostrar el paquete ya existente de **100 créditos por 1€** como primera opción del selector en `PurchaseCard`. El producto/precio `credits_100` ya está creado en Stripe — solo falta exponerlo en el frontend.

## Cambios

### 1. Añadir `100` a las opciones del selector
En `src/components/purchase-card.tsx`:

- Línea 46: incluir `100` al inicio de `CREDIT_OPTIONS`:
  ```ts
  const CREDIT_OPTIONS = [100, ...Array.from({ length: 10 }, (_, i) => (i + 1) * ANALYSIS_COST)];
  ```
- Línea 51: usar `100` como valor inicial por defecto (`useState<number>(100)`).

### 2. Etiqueta legible para la opción de 100
La plantilla actual `t("purchase.option", { credits, analyses: credits / ANALYSIS_COST })` produce un número raro para 100 créditos (≈1,02 análisis). Añadir una clave dedicada `purchase.optionStarter` en `src/i18n/locales/es.json` y `en.json`:

- ES: `"100 créditos — 1 €"`
- EN: `"100 credits — €1"`

Y en el `.map` de las opciones, usar esa clave cuando `c === 100`; el resto sigue con `purchase.option`.

## Notas
- No se toca `createCreditsCheckout` ni `createPlisioInvoice`: ambos resuelven el precio a partir del número de créditos / `lookup_key` `credits_100`, que ya existe.
- `ANALYSIS_COST` se mantiene en 98.
