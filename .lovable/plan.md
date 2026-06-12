## Cambio
Eliminar el texto de subtítulo "Resumen general de tus análisis forenses." del panel de dashboard.

## Archivos a modificar
- `src/routes/dashboard.tsx`: eliminar la línea que renderiza `{t("dashboard.subtitle")}`
- `src/i18n/locales/es.json`: eliminar la clave `"subtitle"` de la sección `dashboard`
- `src/i18n/locales/en.json`: eliminar la clave `"subtitle"` de la sección `dashboard`

## Notas
No se modifica ninguna otra lógica de negocio, solo se retira el elemento visual del subtítulo.