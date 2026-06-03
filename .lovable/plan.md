## Objetivo

Hacer que el flujo de release sea 100% automático desde Lovable: cuando se cambie `version` en `desktop/package.json` y se haga commit a `main`, GitHub Actions debe crear el tag `vX.Y.Z` y disparar el build/publicación de instaladores — sin necesidad de crear el tag manualmente.

## Cambios

### 1. Nuevo workflow `.github/workflows/auto-tag.yml`

Se dispara en cada `push` a `main` que toque `desktop/package.json`:

- Lee `version` de `desktop/package.json`.
- Comprueba si ya existe el tag `vX.Y.Z`.
- Si no existe, lo crea y lo empuja → eso dispara el workflow `release.yml` existente.
- Si ya existe, no hace nada (evita loops y duplicados).

```text
push a main (con cambio en desktop/package.json)
       │
       ▼
auto-tag.yml ── crea tag vX.Y.Z ──►  release.yml
                                         │
                                         ▼
                              build win/mac/linux + GitHub Release
                                         │
                                         ▼
                              electron-updater detecta update
```

### 2. Sin cambios en `release.yml`

El workflow actual ya escucha `tags: v*`, así que el nuevo auto-tag lo dispara automáticamente. No hace falta tocarlo.

## Detalles técnicos

- El workflow usa `permissions: contents: write` para poder empujar el tag con el `GITHUB_TOKEN` por defecto.
- `paths: ['desktop/package.json']` evita ejecuciones innecesarias en commits que no cambian la versión.
- Usa `git tag` + `git push origin <tag>` autenticado con `GITHUB_TOKEN`; no necesita PAT adicional.
- Idempotente: si el tag ya existe (porque ya hicimos el release a mano), el job termina silenciosamente.

## Flujo resultante para el usuario

1. Yo cambio `desktop/package.json` → version `1.0.13`.
2. Lovable sincroniza el commit a GitHub.
3. `auto-tag.yml` crea `v1.0.13` automáticamente.
4. `release.yml` construye `.exe`/`.dmg`/`.AppImage` y publica el Release.
5. La app instalada detecta el update vía `electron-updater`.

Sin tocar la terminal ni GitHub web.
