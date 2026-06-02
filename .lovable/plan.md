## Objetivo
Que la app desktop (.exe) use el mismo logo que la web pública.

## Contexto
- Web pública: `src/assets/logo.png.asset.json` → logo servido por CDN de Lovable (asset_id `9576fd0b...`).
- Desktop: `desktop/src/assets/logo.png` (binario local importado en `desktop/src/App.tsx`).
- El desktop corre en Electron desde `file://`, por lo que **no puede** usar la URL relativa `/__l5e/...` del CDN. Necesita el binario empacado localmente.

## Cambios
1. Descargar el PNG actual de la web desde el CDN de Lovable a `desktop/src/assets/logo.png`, sobreescribiendo el existente.
   - Fuente: `https://mvt-insight.lovable.app/__l5e/assets-v1/9576fd0b-1d12-4848-a05a-52ab395831bb/logo.png`
2. No tocar `desktop/src/App.tsx`: ya importa `./assets/logo.png` y lo renderiza con `<Logo size={210} />`.
3. Verificación: confirmar que el archivo se reemplazó (tamaño ≈ 2.27 MB, igual que el `.asset.json` de la web) y que el preview/desktop sigue renderizando.

## Fuera de alcance
- No se modifica el tamaño, posición ni layout del header del desktop.
- No se portan breakpoints responsive ni el componente `PublicHeader` al desktop.
- No se modifica la web.
