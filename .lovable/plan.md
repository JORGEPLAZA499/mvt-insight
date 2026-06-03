## Unificar auto-tag y release en un solo workflow

**Problema:** Los tags creados por un workflow con el `GITHUB_TOKEN` por defecto no disparan otros workflows (protección de GitHub contra bucles). Por eso `v1.0.13` se creó pero `release.yml` nunca arrancó.

**Solución:** Unificar todo en `release.yml`. Cuando se haga push a `main` con cambio en `desktop/package.json`, el mismo workflow crea el tag y compila/publica los instaladores en una sola corrida.

### Cambios

**1. Editar `.github/workflows/release.yml`**
- Añadir trigger `push` a `main` filtrado por `paths: ['desktop/package.json']` (manteniendo el trigger por tags `v*` y `workflow_dispatch`).
- Añadir un job previo `tag` que corre solo en push a main:
  - Lee la versión desde `desktop/package.json`.
  - Si el tag `vX.Y.Z` no existe, lo crea y lo pushea.
  - Expone la versión como output.
- El job `build` depende de `tag` (cuando aplica) y compila para Windows / macOS / Linux.
- Publica el GitHub Release con los instaladores (`.exe`, `.dmg`, `.AppImage`).

**2. Eliminar `.github/workflows/auto-tag.yml`**
- Su lógica queda absorbida por `release.yml`.

### Resultado
Próximo bump de versión en `desktop/package.json` → push a `main` → una sola corrida que tagguea, compila los 3 instaladores y publica el Release automáticamente.
