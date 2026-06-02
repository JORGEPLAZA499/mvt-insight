## Problema

En `/upload` las tarjetas **Android** e **iPhone** son clicables durante los ~2 segundos que tarda en cargar el saldo de créditos desde Supabase. Si el usuario hace clic rápido sin tener créditos, avanza al paso 2 igualmente.

Causa exacta en `src/routes/upload.tsx` línea 103:

```ts
const hasCredits = credits === null ? true : credits > 0;
```

Mientras `credits === null` (estado de carga), `hasCredits` es `true` → las tarjetas están habilitadas.

## Cambio

Un solo archivo: `src/routes/upload.tsx`.

1. **Línea 103** — invertir el valor por defecto durante la carga:
   ```ts
   const isLoadingCredits = credits === null;
   const hasCredits = !isLoadingCredits && credits! > 0;
   ```
   Así las tarjetas quedan **deshabilitadas** hasta que llegue la respuesta de Supabase.

2. **Aviso amarillo "No tienes créditos disponibles"** (líneas 174-194 en `StepDevice`) — mostrarlo solo cuando ya sabemos que no hay créditos, no durante la carga. Para eso pasamos también `isLoading` al componente y:
   - Si `isLoading` → no mostrar la alerta amarilla (evita el "flash" del aviso que aparece y desaparece).
   - Si `!isLoading && !hasCredits` → mostrar la alerta como ahora.

3. **Tarjetas** (líneas 196-213) — quedan deshabilitadas cuando `isLoading || !hasCredits`. Se aprovecha la prop `disabled` que ya acepta `ChoiceCard`. Opcionalmente se les puede añadir un texto "Cargando…" o simplemente quedan en estado deshabilitado visual (gris/opacidad) sin texto extra.

## Resultado

- Durante la carga: tarjetas grises/no clicables, sin aviso amarillo.
- Si hay créditos: tarjetas activas, sin aviso.
- Si no hay créditos: aviso amarillo + tarjetas deshabilitadas (igual que ahora).

No se toca la lógica de fetch, ni realtime, ni la i18n, ni ningún otro paso del wizard.
