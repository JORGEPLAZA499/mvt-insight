# Fix instalador MVT Windows

## Problema

En `public/scripts/instalar-mvt-windows.ps1`:

1. `$ErrorActionPreference = "Stop"` + pip escribiendo a **stderr** el warning *"The script ... is installed in '...\Python311\Scripts' which is not on PATH"* hace que PowerShell lo trate como `NativeCommandError` y aborte el script. La instalación realmente terminó OK, pero el usuario ve un error rojo y no llega al mensaje final.
2. La carpeta `%APPDATA%\Python\Python311\Scripts` (instalación `--user`) efectivamente **no está en PATH**, así que `mvt-ios` y `mvt-android` no serán ejecutables al reabrir PowerShell.

## Cambios (un solo archivo: `public/scripts/instalar-mvt-windows.ps1`)

1. **Evitar que warnings de stderr aborten el script** al llamar binarios nativos:
   - Añadir `$PSNativeCommandUseErrorActionPreference = $false` al inicio (PowerShell 7) y, como red de seguridad, envolver las llamadas a `python -m pip install` con `$ErrorActionPreference = "Continue"` (restaurándolo después). Así los warnings de pip no detienen la ejecución, pero los fallos reales (código de salida ≠ 0) sí se siguen comprobando con `$LASTEXITCODE`.

2. **Detectar la carpeta Scripts de `pip --user` y añadirla a PATH**:
   - Obtener la ruta con `python -m site --user-base` y construir `<userbase>\Python311\Scripts` (o usar `python -c "import sysconfig; print(sysconfig.get_path('scripts', f'{sysconfig.get_default_scheme()}_user'))"` para que funcione con cualquier versión de Python).
   - Añadirla a `$env:Path` para la sesión actual.
   - Persistirla en el PATH de usuario con `[Environment]::SetEnvironmentVariable("Path", "$current;$scriptsDir", "User")` solo si no está ya presente.

3. **Mejorar verificación final**:
   - Tras instalar, llamar a `mvt-android --version` / `mvt-ios --version` (con `--` para evitar confusión con subcomandos) usando la ruta absoluta de Scripts, para confirmar al usuario que quedaron utilizables.
   - Si falla, mostrar mensaje claro: "Cierra y reabre PowerShell — el PATH se actualizó".

4. **Mensaje final** indicando que ya no hace falta nada manual: solo reabrir PowerShell y ejecutar `mvt-android` / `mvt-ios` directamente.

## Verificación

- Releer el script tras editarlo para confirmar sintaxis (`$PSNativeCommandUseErrorActionPreference`, bloque try/finally alrededor de pip, lógica de PATH).
- No hay forma de ejecutar PowerShell desde el sandbox, así que la verificación funcional la hará el usuario re-ejecutando el one-liner `irm ... | iex`.

## Fuera de alcance

- No se tocan los scripts de macOS/Linux ni la UI de `/guia` (los URLs ya apuntan al dominio publicado correcto).
