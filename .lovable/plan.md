## Objetivo

Añadir en la portada (`src/routes/index.tsx`) el texto:

> "Detecta indicios técnicos vinculados a spyware avanzado como Pegasus, Predator, Reign, Hermit, Triangulation y otras amenazas comerciales conocidas."

Sin modificar ningún texto, posición ni elemento existente del hero (badge, título, subtítulo, botones).

## Ubicación

Se inserta como un nuevo bloque **entre el subtítulo (`<p>`) y los botones CTA** del hero, dentro del mismo `max-w-3xl`. Es el único punto donde encaja semánticamente sin desplazar nada visualmente significativo: el subtítulo da contexto, este bloque amplía con detalle técnico, y los CTAs siguen debajo como cierre. Los demás elementos quedan intactos.

## Diseño visual (profesional, moderno, con efectos)

- **Card con borde animado** estilo "scanner": fondo `bg-card/40` con `backdrop-blur`, borde sutil `border-primary/20`, esquinas redondeadas.
- **Icono `Radar` (lucide-react)** a la izquierda con leve pulso (`animate-pulse`) y halo gradient (`shadow-glow` ya disponible en el design system).
- **Texto del párrafo** con los nombres de spyware (Pegasus, Predator, Reign, Hermit, Triangulation) renderizados como **chips/píldoras inline**: borde `border-primary/30`, fondo `bg-primary/5`, tipografía mono, hover con `text-gradient-primary` y micro-elevación.
- **Línea de "scan"**: una franja con `bg-gradient-to-r from-transparent via-primary/40 to-transparent` animada (CSS keyframe `scan-line` que recorre horizontalmente) en la parte superior de la card, evocando análisis forense.
- Respeta tokens semánticos existentes (`bg-card`, `border-border`, `text-muted-foreground`, `text-gradient-primary`, `shadow-glow`).

## Internacionalización

- Añadir clave `landing.hero.threatsIntel` en `src/i18n/locales/es.json` y `en.json`.
- ES: texto solicitado tal cual.
- EN: "Detects technical indicators linked to advanced spyware such as Pegasus, Predator, Reign, Hermit, Triangulation, and other known commercial threats."
- Los nombres de spyware se extraen a un array constante en el componente y se renderizan como chips; el resto del texto viene de i18n con interpolación (o se parte en `prefix` + chips + `suffix`).

## Animación

- Keyframe `scan-line` (translateX -100% → 100%, 3s infinite, ease-in-out) añadido a `src/styles.css` como `@keyframes` + utility `.animate-scan-line`. No toca tokens existentes.
- Chips: transición `transition-all duration-300` con hover `-translate-y-0.5`.

## Archivos a modificar

1. `src/routes/index.tsx` — insertar el bloque en el hero, importar `Radar` de `lucide-react`.
2. `src/i18n/locales/es.json` — añadir `landing.hero.threatsIntel.prefix` y `.suffix`.
3. `src/i18n/locales/en.json` — idem.
4. `src/styles.css` — añadir keyframe `scan-line` y utility.

## Garantías

- Cero cambios a textos, clases o estructura del badge, título, subtítulo, botones, secciones Features y How.
- Solo se añade markup nuevo; nada se elimina ni reordena.
