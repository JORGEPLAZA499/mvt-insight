
## Problema

En la release `v1.0.43`, los jobs de **windows** y **macOS** terminaron OK, pero **linux** falló con:

```
HTTP 422 already_exists  field: tag_name
```

Esto ocurre porque los 3 jobs del matrix (`win`, `mac`, `linux`) corren **en paralelo** y cada uno ejecuta `electron-builder --publish always`. Los tres intentan **crear** la Release de GitHub a la vez; el primero que llega la crea, los otros deberían "encontrarla y subir assets", pero hay una race: si dos consultan la API antes de que exista, los dos intentan crearla y uno recibe `422 already_exists`. En este caso ganó win+mac y perdió linux.

No es un problema del código del escritorio ni de la versión `1.0.43` — el binario de Linux simplemente no se subió. Win y mac sí están publicados.

## Solución

Añadir un job intermedio `create_release` entre `tag` y `build` que crea la GitHub Release **una sola vez** (idempotente) usando `gh release create ... || true`. Así, cuando arranque el matrix, los 3 builds ya encuentran la Release existente y solo suben sus assets — sin race.

### Cambios en `.github/workflows/release.yml`

1. Nuevo job `create_release` (después de `tag`, antes de `build`):
   - `runs-on: ubuntu-latest`
   - Usa `gh release view "$TAG"` y, si no existe, `gh release create "$TAG" --title "$TAG" --notes "Desktop release $TAG"`.
   - `needs: [tag]`, con `if` equivalente al actual del `build`.

2. `build` pasa a `needs: [tag, create_release]`.

3. No se toca nada en `desktop/`. No se bumpea versión.

## Recuperar el binario Linux de `v1.0.43`

Dos opciones (elegir una al pasar a build mode):

- **A (recomendada):** Re-disparar el workflow manualmente con `workflow_dispatch` sobre el tag `v1.0.43`. Con el job nuevo `create_release`, los 3 targets reusarán la release existente y linux se subirá esta vez.
- **B:** Bump a `1.0.44` solo para forzar un re-build limpio (desperdicia un número de versión).

La A no consume versión y deja `v1.0.43` completa con los 3 instaladores.
