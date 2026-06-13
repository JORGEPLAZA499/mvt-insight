## Hero a dos columnas en desktop

Reestructurar el `<section>` del hero en `src/routes/index.tsx` para que en pantallas grandes (`lg:`) tenga dos columnas, moviendo la tarjeta de threat intel (Radar + chips de spyware) a la columna derecha. En mobile/tablet se mantiene el stack actual (tarjeta debajo del subtítulo).

### Cambios en `src/routes/index.tsx`

1. Cambiar el contenedor interno del hero de `max-w-3xl` (single column) a un grid:
   - Mobile/tablet: `grid grid-cols-1 gap-10`
   - Desktop: `lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12 lg:items-center`

2. **Columna izquierda** (sin cambios de contenido): badge, `<h1>`, subtítulo `<p>`, botones CTA. Se quita la tarjeta de threats de aquí.

3. **Columna derecha** (nueva ubicación de la tarjeta de threats):
   - En `lg:` se posiciona a la derecha, alineada verticalmente con el contenido.
   - En mobile aparece después de los CTAs (orden natural del DOM), manteniendo el flujo lectura actual.
   - Se quita `max-w-2xl` de la tarjeta (ahora la limita la columna).
   - Opcional: ligero realce visual `lg:sticky lg:top-24` para que la tarjeta acompañe al usuario al hacer scroll inicial (sin afectar otras secciones).

4. Sin tocar textos, i18n, estilos de la tarjeta (Radar, chips, scan-line), Features ni How.

### Riesgos
- Ninguno funcional. Es solo layout responsive con tokens Tailwind ya existentes.