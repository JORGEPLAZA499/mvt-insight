## Problema

La tarjeta de compra define que **1 informe = 98 créditos** (`src/components/purchase-card.tsx`), pero la función RPC `consume_credit_and_insert_analysis` solo descuenta **1 crédito** por análisis. Resultado: el usuario ejecutó un análisis y solo se le restó 1 crédito en lugar de 98.

## Solución

### 1. Migración SQL — actualizar la función RPC

Crear nueva migración que reemplaza `consume_credit_and_insert_analysis` para:
- Definir constante `v_cost := 98`
- Comparar `v_credits >= v_cost` (en vez de `>= 1`)
- Restar `v_cost` (en vez de `1`)
- Mantener firma, lock con `FOR UPDATE`, y el error `INSUFFICIENT_CREDITS`

### 2. Centralizar el coste en frontend

En `src/components/purchase-card.tsx` extraer `98` a una constante exportada `ANALYSIS_COST = 98` para que el resto del código (validaciones de "tienes créditos suficientes") use la misma fuente.

### 3. Actualizar gating en `upload.tsx`

Cambiar:
```ts
const hasCredits = !isLoadingCredits && (credits ?? 0) > 0;
```
por:
```ts
const hasCredits = !isLoadingCredits && (credits ?? 0) >= ANALYSIS_COST;
```

Y actualizar el copy del estado `noCredits` en i18n (es/en) para indicar "Necesitas al menos 98 créditos" en vez de "no tienes créditos".

### 4. (Opcional pero recomendado) Compensar al usuario actual

El usuario al que solo se le descontó 1 crédito en lugar de 98 quedó con un saldo "inflado" en 97 créditos. Decisión:
- **Opción A**: dejarlo como está (cortesía por el bug).
- **Opción B**: ajustar manualmente vía SQL su saldo (`UPDATE accounts SET credits = credits - 97 WHERE id = '<uuid>'`).

Por defecto propongo **Opción A** salvo que indiques lo contrario.

## Archivos afectados

- `supabase/migrations/<nuevo>.sql` — nueva versión de la función RPC
- `src/components/purchase-card.tsx` — exportar constante `ANALYSIS_COST`
- `src/routes/upload.tsx` — usar constante para gating
- `src/i18n/locales/es.json` y `en.json` — copy de "créditos insuficientes"