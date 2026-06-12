## Objetivo
Subir la versión del desktop app para que GitHub Actions compile y publique la release con el diálogo de drivers iOS reordenado.

## Cambio
- `desktop/package.json`: cambiar `"version": "1.0.30"` por `"version": "1.0.31"`.

## Resultado esperado
- El workflow `.github/workflows/release.yml` detecta el cambio en `desktop/package.json`.
- Crea el tag `v1.0.31`.
- Compila y publica los instaladores para Windows, macOS y Linux en la release de GitHub.
- El usuario puede actualizar la app de escritorio y verá el diálogo reordenado con "Apple Devices" como opción principal e iTunes como fallback.