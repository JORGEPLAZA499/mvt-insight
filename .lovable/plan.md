## Diagnóstico

El auto-updater de la app instalada (v1.0.42) pide `/releases/download/main/latest.yml` y recibe 404. Causa:

1. La release `v1.0.43` está completa y bien (tiene `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, los 3 instaladores).
2. Existe en GitHub una release con **tag `main`** (vacía, sin assets). Se creó cuando re-disparaste el workflow con `workflow_dispatch`.
3. GitHub marca como "latest release" la última creada que no sea draft/prerelease → la release `main` (vacía) pasó a ser "latest".
4. `electron-updater` con provider GitHub resuelve "latest" → tag `main` → URL `/releases/download/main/latest.yml` → **404**.

El job `create_release` que añadí ayer tiene este bug en `workflow_dispatch`:

```yaml
TAG="${{ needs.tag.outputs.tag || github.ref_name }}"
```

En `workflow_dispatch` sobre la rama main, el job `tag` se skipea (su `if` requiere `push`), `needs.tag.outputs.tag` queda vacío, y `github.ref_name` = `"main"` → crea release `main`.

## Pasos

### 1. Limpieza manual en GitHub (la haces tú, yo no tengo permisos)

En https://github.com/JORGEPLAZA499/mvt-insight/releases :

- **Borrar la release "main"** (la vacía).
- **Borrar también el tag `main`** (al borrar la release, GitHub deja el tag; hay que eliminarlo desde la pestaña Tags o con `git push origin :refs/tags/main`).
- Verificar que `v1.0.43` aparece marcada como **Latest** (debería ser automático al desaparecer la "main"; si no, click en "Set as the latest release" en `v1.0.43`).

Con eso, el auto-updater de cualquier instalación vuelve a pedir `/releases/download/v1.0.43/latest.yml` (que sí existe) y los usuarios en v1.0.42 se actualizan a v1.0.43 sin error.

### 2. Arreglar `.github/workflows/release.yml`

Cambiar el job `create_release` para que **siempre** resuelva el tag desde `desktop/package.json` cuando `needs.tag.outputs.tag` esté vacío, en vez de caer a `github.ref_name`. Y añadir una guarda dura que aborte si el tag resultante no empieza por `v`.

Cambios concretos en `create_release`:

- Añadir un step previo "Resolve tag" que lea `desktop/package.json` y compute `TAG=v$(node -p "require('./desktop/package.json').version")` cuando `needs.tag.outputs.tag` esté vacío.
- Usar ese tag tanto en `actions/checkout@v4 ref` como en `gh release view/create`.
- Si por cualquier motivo `TAG` no empieza por `v`, hacer `exit 1` con mensaje claro.

Mismo cambio en el job `build` (usar el tag resuelto, no `github.ref`).

### 3. (Opcional) Restringir `workflow_dispatch`

Añadir un `input` `tag` requerido al `workflow_dispatch`, de forma que para re-disparar haya que escribir explícitamente `v1.0.43`. Elimina cualquier posibilidad de volver a crear releases fantasma.

## Lo que NO se toca

- `desktop/package.json` (no se bumpea versión; v1.0.43 sigue siendo la release correcta).
- `desktop/electron/main.cjs` (la configuración del auto-updater está bien).
- El workflow de iOS.

## Resultado esperado

- Auto-updater de la app v1.0.42 ya instalada → encuentra v1.0.43 y se actualiza.
- Futuros `workflow_dispatch` no podrán crear releases con tags raros tipo `main`.
