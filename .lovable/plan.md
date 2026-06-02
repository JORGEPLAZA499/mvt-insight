# Fix build de Electron y release v1.0.3

## Problema

El workflow de GitHub Actions falló en las 3 plataformas con:
```
Error: Cannot detect repository by .git/config. Please specify "repository" in the package.json
```

Causa: `desktop/package.json` está en subcarpeta y `electron-builder` no logra autodetectar el repo de GitHub para publicar la release.

## Cambios

### 1. `desktop/package.json`
- Subir `version` de `1.0.2` → `1.0.3`
- Añadir campo `repository` a nivel raíz apuntando a `https://github.com/JORGEPLAZA499/mvt-insight.git`
- Cambiar bloque `build.publish` para declarar explícitamente `owner: "JORGEPLAZA499"` y `repo: "mvt-insight"`

### 2. `src/routes/upload.tsx` (si aplica)
- Si existe constante `APP_VERSION` o similar, actualizarla a `1.0.3` para que el modal de auto-update compare correctamente.

## Pasos del usuario después del commit

En PowerShell:
```powershell
cd $HOME\Documents\mvt-insight
git pull
git tag v1.0.3
git push origin v1.0.3
```

Esto dispara el workflow. En ~10 min los 3 jobs deberían quedar en verde y publicar:
- `MvtInsight-Setup-1.0.3.exe`
- `MvtInsight-1.0.3-x64.dmg` / `MvtInsight-1.0.3-arm64.dmg`
- `MvtInsight-1.0.3.AppImage`

## Notas

- El tag `v1.0.2` queda obsoleto (existe en GitHub pero sin assets); se puede borrar luego desde la UI de Releases si molesta.
- El warning "default Electron icon is used" no es bloqueante. Si quieres icono propio, lo añadimos en una iteración posterior.
