# Causa raíz (definitiva)

El sandbox de Lovable aplica un `.gitignore` global del sistema:

```
$ git check-ignore -v desktop/build/icon.ico
/etc/gitignore.global:63: build/   desktop/build/icon.ico
```

Cualquier carpeta llamada **`build/`** en cualquier nivel del repo está ignorada por git. Por eso `desktop/build/icon.ico` y `desktop/build/icon.png` jamás llegan a GitHub, por mucho que los regenere — están ignorados.

# Plan

Renombrar la carpeta de recursos de electron-builder de `build/` a un nombre que git no ignore, y actualizar `desktop/package.json` para apuntar ahí.

## 1. Crear nueva carpeta `desktop/build-resources/`

Generar dentro:
- `icon.png` (512×512, desde `desktop/src/assets/logo.png`)
- `icon.ico` (multi-resolución 16/32/48/64/128/256)

## 2. Actualizar `desktop/package.json`

Cambios en el bloque `"build"`:
- `directories.buildResources: "build"` → `"build-resources"`
- `files`: `"build/icon.ico"` → `"build-resources/icon.ico"`, idem `.png`
- `win.icon`, `mac.icon`, `linux.icon`: `build/icon.*` → `build-resources/icon.*`
- `nsis.installerIcon`, `uninstallerIcon`, `installerHeaderIcon`: `build/icon.ico` → `build-resources/icon.ico`

## 3. En tu máquina

```powershell
cd "C:\Users\GAMING F15\Documents\mvt-insight"
git pull
Test-Path "desktop\build-resources\icon.ico"   # True
Test-Path "desktop\build-resources\icon.png"   # True
cd desktop
# (opcional, limpieza) Remove-Item -Recurse -Force build
$env:GH_TOKEN="ghp_TU_TOKEN_REAL"
npm run dist:win
```

# Detalles técnicos

- No tocamos `electron-builder` ni instalamos nada nuevo.
- La carpeta vieja `desktop/build/` se queda en tu máquina sin uso; puedes borrarla manualmente.
- Verificaré con `git check-ignore` que `desktop/build-resources/` NO está ignorada antes de generar los iconos.
- Tras la regeneración, validaré con `git status` que los iconos aparecen como nuevos archivos no rastreados, listos para que Lovable los commitee.
