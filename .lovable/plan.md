# Fix: Cambiar a `node-pty` oficial (Opción A)

## Cambios

### 1. `desktop/package.json`
- Quitar `"@homebridge/node-pty-prebuilt-multiarch": "^0.11.14"`
- Agregar `"node-pty": "^1.0.0"` (trae prebuilds para Electron 33 ABI 130)
- Actualizar `asarUnpack`:
  - de: `"node_modules/@homebridge/node-pty-prebuilt-multiarch/**/*"`
  - a: `"node_modules/node-pty/**/*"`
- Mantener `npmRebuild: false` y `buildDependenciesFromSource: false` (los prebuilds de Electron vienen listos, no hace falta recompilar)
- Bump versión: `1.0.15` → `1.0.16`

### 2. `desktop/electron/main.cjs`
- Reemplazar el `require("@homebridge/node-pty-prebuilt-multiarch")` por `require("node-pty")`
- API es idéntica (`pty.spawn(...)`), no hay que tocar lógica.

### 3. Workflow
- No requiere cambios. El push a `desktop/package.json` dispara el build de los 3 OS y publica `v1.0.16` como Release con los 3 instaladores.

## Resultado esperado

- Build verde en Windows/macOS/Linux sin tocar Python ni node-gyp.
- `MvtInsight-Setup-1.0.16.exe` arranca y ya no muestra el error de `NODE_MODULE_VERSION`.
- "Collecting data" continúa hasta generar el ZIP forense.

## Notas técnicas

- `node-pty` v1.x publica prebuilds para Node 18/20/22 y Electron 28/29/30/31/32/33 en npm — `electron-builder` los detecta automáticamente.
- Tamaño del instalador queda igual (sólo cambia el binario nativo dentro de `node_modules/node-pty/build/Release/`).
