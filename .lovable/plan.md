## Objetivo

En la pantalla de bienvenida del desktop app (`desktop/src/App.tsx`), la sección "Antes de empezar:" tiene 3 pasos. Añadir un cuarto paso que diga "Conecta ahora el teléfono al computador" acompañado de una ilustración de un ordenador y un teléfono conectados por un cable USB.

## Cambios

1. **`desktop/src/i18n/locales/es.json` y `en.json`**
   - Añadir clave `welcome.before.connectNow`:
     - ES: "Conecta ahora el teléfono al computador"
     - EN: "Now connect the phone to the computer"

2. **`desktop/src/App.tsx`**
   - Añadir un cuarto `<li>` al listado "Antes de empezar:" con el nuevo texto.
   - Debajo del listado (dentro de la misma `card`), renderizar una ilustración SVG inline mostrando: un monitor/portátil a la izquierda, un teléfono a la derecha, y un cable USB conectándolos. SVG inline para evitar añadir assets externos y para que funcione offline dentro del `.exe`.

3. **Estilo**
   - Centrar el SVG, ancho máximo ~280px, color acorde a `var(--muted)` / `var(--primary)` usando `currentColor` en el stroke para que respete el tema actual.

## Resultado esperado

El paso 4 aparece como último ítem de la lista con su texto traducido, seguido de un dibujo claro de ordenador + cable + móvil para que el usuario entienda visualmente la acción requerida antes de continuar.

## Nota

Como el `.exe` empaqueta el bundle compilado, después de aplicar los cambios habrá que volver a ejecutar `npm run package:win` dentro de `desktop/` para regenerar el ejecutable.
