## Cambios

1. **Reemplazar el archivo del logo** (`src/assets/logo.png.asset.json`) subiendo la nueva imagen `Logo_SPYWARE.png` vía `lovable-assets` y reescribiendo el pointer JSON. Como tanto la app web (`src/`) como la app de escritorio (`desktop/src/`) usan este mismo asset, ambas tomarán el nuevo logo automáticamente.

2. **Desktop (`desktop/src/App.tsx`)**: cambiar el tamaño del logo en la pantalla de bienvenida de `size={72}` a `size={150}`.

3. **Header de la web (`src/components/app-shell.tsx`, línea ~346)**: aumentar el logo del header de `h-[48px] w-[48px]` a `h-[150px] w-[150px]`.

Los demás logos grandes (index, login, sidebar) se mantienen como están (72px) salvo que indiques lo contrario.
