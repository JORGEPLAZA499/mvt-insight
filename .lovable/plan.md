# Causa raíz

`desktop/build/icon.ico` y `desktop/build/icon.png` **existen físicamente** en el entorno de Lovable, pero **no están rastreados por git**:

```
$ git ls-files desktop/build/
(vacío)
```

Por eso tu `git pull` solo trajo `desktop/package-lock.json`. Los iconos nunca se subieron a GitHub, así que tu carpeta local no puede tenerlos por mucho que sincronices. `desktop/.gitignore` no los ignora — simplemente nunca se hizo el commit.

# Plan

## En Lovable (build mode)

1. Regenerar `desktop/build/icon.png` y `desktop/build/icon.ico` desde `desktop/src/assets/logo.png` (que sí está en git) usando ImageMagick:
   - `icon.png` → 512×512, formato PNG (requisito de electron-builder para Linux/macOS).
   - `icon.ico` → multi-resolución (16, 32, 48, 64, 128, 256) para el instalador NSIS de Windows.
2. Al sobrescribir/crear estos archivos, Lovable los commiteará automáticamente al repo de GitHub.

## En tu máquina

3. Sincronizar y compilar:
   ```powershell
   cd "C:\Users\GAMING F15\Documents\mvt-insight"
   git pull
   Test-Path "desktop\build\icon.ico"   # debe dar True
   Test-Path "desktop\build\icon.png"   # debe dar True
   cd desktop
   $env:GH_TOKEN="ghp_TU_TOKEN_REAL"
   npm run dist:win
   ```

# Detalles técnicos

- Fuente: `desktop/src/assets/logo.png` (2.2 MB, ya commiteado).
- Herramienta: ImageMagick vía `nix run nixpkgs#imagemagick`.
- Comandos (los ejecutaré yo en Lovable, no tú):
  ```
  convert desktop/src/assets/logo.png -resize 512x512 desktop/build/icon.png
  convert desktop/src/assets/logo.png -define icon:auto-resize=256,128,64,48,32,16 desktop/build/icon.ico
  ```
- No toco `package.json` — las rutas ya son correctas (`build/icon.ico`, `build/icon.png`).
- Riesgo: si `logo.png` no es cuadrado, el icono saldrá ligeramente recortado/centrado pero válido. Si quieres una versión más cuidada (con fondo transparente o un crop específico), avísame y la genero a medida.
