## Modernizar el sidebar del dashboard

Rediseño visual de `src/components/app-shell.tsx` para que el sidebar se vea profesional, con botones reales, indicadores activos y efectos sutiles.

### Mejoras visuales

**Header (logo)**
- Logo con halo pulsante suave detrás del icono (`animate-pulse` muy tenue + glow).
- Línea inferior con gradiente sutil en vez del border plano.

**Navegación (botones)**
- Cada item pasa de "link plano" a **botón estilo HUD**:
  - Indicador activo: barra vertical de 3px en el lado izquierdo con `box-shadow` glow del color primary.
  - Estado activo: fondo `bg-gradient-to-r from-primary/15 to-transparent`, texto en `text-foreground`, icono en `text-primary` con leve `drop-shadow`.
  - Hover: traslación sutil (`hover:translate-x-0.5`), fondo `bg-sidebar-accent/40`, icono con scale 105.
  - Transiciones suaves (`transition-all duration-200`).
- Badge opcional a la derecha en items (ej. "Nuevo análisis" con badge "+" o conteo) — añadiré badge en "Historial" si hay datos, vacío si no, sin lógica nueva.
- Sección con label "PRINCIPAL" arriba (text-[10px] uppercase tracking-widest text-muted-foreground/60).

**Footer (usuario + logout)**
- Mini-tarjeta con avatar circular (inicial del email de la sesión), nombre/email truncado y estado online (punto verde animado).
- Botón "Cerrar sesión" pasa a estilo `outline` con icono y hover en destructive sutil.

**Efectos globales del sidebar**
- Fondo del sidebar con un degradado muy sutil (`bg-gradient-to-b from-sidebar to-sidebar/95`) y un patrón de "noise/grid" decorativo opcional vía `radial-gradient` muy tenue en el fondo.
- Borde derecho con `box-shadow: inset -1px 0 0 var(--border)` + un leve glow del primary en el borde superior.

### Sin cambios
- Estructura de rutas, items de navegación (mismos 4: Dashboard, Nuevo análisis, Informes, Historial), responsive móvil (header móvil se mantiene), lógica de sesión.
- No se toca shadcn `Sidebar` (no está en uso aquí); seguimos con el `aside` actual, solo rediseñado.

### Archivos
- `src/components/app-shell.tsx` — rediseño del aside y subcomponentes pequeños inline (`NavButton`, `UserCard`).
- Sin nuevos tokens en `styles.css` (uso los existentes: `--primary`, `--sidebar`, `--sidebar-accent`, `--success`, gradientes ya definidos).