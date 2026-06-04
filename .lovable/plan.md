## Plan: Cambiar copy de pantalla "Análisis completado"

Cambiar el subtítulo de la pantalla final del desktop app para dejar claro que el informe ya se subió al dashboard y el archivo .zip es solo una copia local de respaldo.

### Archivos a editar
1. `desktop/src/i18n/locales/es.json` — cambiar `done.subtitle`:
   - De: `"Los datos se han guardado en tu carpeta de Descargas."`
   - A: `"Informe subido al dashboard. También se guardó una copia local en Descargas."`

2. `desktop/src/i18n/locales/en.json` — cambiar `done.subtitle`:
   - De: `"The data has been saved to your Downloads folder."`
   - A: `"Report uploaded to the dashboard. A local copy was also saved to your Downloads folder."`

### Sin cambios en otras áreas
- No se modifica layout, componentes, ni flujo de upload.
- No se bumpea `desktop/package.json > version`.