# Diagnóstico: repo local desincronizado

En el repo de Lovable / GitHub, los iconos **ya existen** en su sitio correcto:

```
desktop/build/icon.ico   ✅ existe
desktop/build/icon.png   ✅ existe
```

Pero en tu máquina (`C:\Users\GAMING F15\Documents\mvt-insight\desktop`):

- `build\` no existía (tuviste que crearla con `New-Item`)
- `electron\icon.ico` y `electron\icon.png` tampoco existen (PowerShell: "No se encuentra la ruta")

**Conclusión:** tu carpeta local está **desfasada respecto a GitHub**. Estás compilando con una versión vieja del proyecto en la que esos archivos aún no se habían añadido. Por eso `electron-builder` dice `cannot find specified resource "build/icon.ico"`.

No hace falta copiar nada manualmente ni tocar `package.json`. Hace falta **sincronizar tu carpeta local con GitHub**.

# Plan

## Paso 1 — Sincronizar el repo local

En PowerShell, en la raíz del proyecto (NO dentro de `desktop`):

```powershell
cd "C:\Users\GAMING F15\Documents\mvt-insight"
git status
git pull
```

Si `git status` muestra cambios locales tuyos sin commitear (por ejemplo en `desktop\package.json` con tu versión 1.0.5), guárdalos antes del pull:

```powershell
git stash
git pull
git stash pop
```

Después del pull, verifica que los iconos aparecieron:

```powershell
Test-Path "desktop\build\icon.ico"
Test-Path "desktop\build\icon.png"
```

Ambos deben devolver `True`.

## Paso 2 — Compilar y publicar

```powershell
cd desktop
$env:GH_TOKEN="ghp_TU_TOKEN_REAL"
npm run dist:win
```

(El token tiene que ser el `ghp_...` real de GitHub, no un placeholder.)

# Detalles técnicos

- El repo en Lovable ya tiene `desktop/build/icon.ico` y `desktop/build/icon.png` correctamente ubicados — es lo que `package.json` espera.
- Tu carpeta local en `C:\Users\GAMING F15\Documents\mvt-insight` quedó atrás respecto a GitHub porque Lovable y tú habéis ido modificando el repo en paralelo. `git pull` lo arregla.
- No hay que editar `package.json` ni cambiar las rutas — la configuración ya es correcta, solo faltan los archivos en tu disco.
- Si `git pull` da conflicto en `desktop\package.json` por la versión (1.0.4 ↔ 1.0.5), resuelve dejando `1.0.5` y haz `git add desktop\package.json` + `git commit`.

¿Lanzo el plan o quieres que primero te ayude con algún paso específico del `git pull`?
