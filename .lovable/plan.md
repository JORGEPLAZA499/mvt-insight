Actualizar el texto del paso 5 del wizard de iPhone (`step5Ios`) para incluir un recordatorio importante:

1.  **Configurar la pantalla para que no se bloquee** durante el análisis.
2.  **Estar pendiente** porque el teléfono pedirá la contraseña de desbloqueo varias veces.
3.  **Advertencia**: si no se introduce la contraseña, el análisis no puede avanzar.

Archivos a modificar:
- `src/i18n/locales/es.json` — clave `upload.desktopOnly.step5Ios.body`
- `src/i18n/locales/en.json` — clave `upload.desktopOnly.step5Ios.body`

Solo cambio de texto; no se toca estructura ni lógica.