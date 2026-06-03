Quitar la barra superior "Paso X de 4" del wizard de subida.

**Archivo:** `src/routes/upload.tsx`

En el header del wizard (líneas 121-125), eliminar:
- El `<span>` con `t("upload.stepCounter", ...)` que muestra "Paso 3 de 4".
- El `<Progress>` debajo (barra cyan superior).

Se mantiene el botón "Atrás" (queda solo en la fila), y se conserva intacta la barra interna del paso 3 ("Paso 2 de 8" / "Descarga la app de escritorio") que vive dentro de `StepRun`.