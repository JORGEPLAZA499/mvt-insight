## Corrección paso 2 en `/upload`

El texto actual dice "Genera tu código en Ajustes → App de escritorio…", pero el código de usuario **ya existe** desde el registro (no se genera) y se muestra en Ajustes → App de escritorio listo para copiar.

### Cambios

**`src/i18n/locales/es.json`** (línea 368):
- Body de `step2`: `"Copia tu código de usuario desde Ajustes → App de escritorio y pégalo en la app. Solo se hace una vez."`

**`src/i18n/locales/en.json`** (paso 2 equivalente):
- Body de `step2`: `"Copy your user code from Settings → Desktop app and paste it into the app. Only needed once."`

Sin cambios en lógica ni en otros archivos.
