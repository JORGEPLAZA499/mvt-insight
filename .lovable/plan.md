## Objetivo
Dejar un solo workflow de GitHub Actions (`release.yml`) que haga tag + build + publish en un mismo flujo, eliminando el workflow duplicado "Auto Tag on Version Bump" que está rompiendo el pipeline.

## Problema actual
- Existen 2 workflows: uno crea el tag (`Auto Tag on Version Bump`) y otro compila/publica (`Build & Release Desktop App`).
- Los tags creados con `GITHUB_TOKEN` **no disparan otros workflows** (limitación de GitHub Actions para evitar bucles).
- Resultado: las versiones 1.0.7 → 1.0.13 fueron tagueadas pero nunca compiladas, por eso el último release publicado sigue siendo 1.0.9.

## Pasos
1. Listar `.github/workflows/` para identificar el archivo del workflow duplicado (probablemente `auto-tag.yml` o similar).
2. Eliminar ese archivo.
3. Verificar que `release.yml` queda intacto (ya contiene job `tag` + job `build` correctamente encadenados con `needs: [tag]`).
4. Bumpear `desktop/package.json` de `1.0.13` → `1.0.14` para forzar una corrida de prueba del workflow unificado.

## Resultado esperado
- Al hacer push a `main`, `release.yml` corre solo:
  - Job `tag`: lee `desktop/package.json`, crea tag `v1.0.14`.
  - Job `build`: compila Windows/macOS/Linux en paralelo y publica el release.
- La web `upload.tsx` (que ya lee `releases/latest` vía API de GitHub) automáticamente servirá los enlaces a `MvtInsight-Setup-1.0.14.exe` sin redeploy.

## Notas
- No toco código del frontend.
- No toco `release.yml` (ya está bien diseñado).
- El bump a 1.0.14 es opcional; si preferís verificar primero que el duplicado se eliminó y bumpear vos mismo después, decímelo.