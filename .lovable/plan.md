## Objetivo

Hacer que el footer quede siempre pegado al fondo de la ventana en `/legal` (y en cualquier página que use el mismo patrón), eliminando el hueco vacío entre el contenido y el pie cuando hay poco contenido. En `/` no debe haber cambios visibles porque el contenido ya llena la pantalla.

## Cambios

**`src/routes/legal.tsx`**
- Contenedor raíz: cambiar `min-h-screen` por `min-h-screen flex flex-col`.
- `<main>`: añadir `flex-1` para que ocupe todo el espacio disponible y empuje el footer al fondo.

**`src/routes/index.tsx`**
- Aplicar el mismo patrón por consistencia (`flex flex-col` en el contenedor raíz). El `<main>` no existe como wrapper único en index, así que envolveré el contenido entre `<PublicHeader />` y `<PublicFooter />` en un `<main className="flex-1">` para mantener el patrón uniforme y semántico.

## Resultado

- `/legal`: el footer se ancla al borde inferior de la ventana sin importar lo corto que sea el contenido.
- `/`: sin cambios visuales (el contenido ya supera la altura de la ventana), pero con la misma estructura semántica.
- Altura del footer sigue siendo fija 64 px (`h-16`), idéntica en ambas rutas.