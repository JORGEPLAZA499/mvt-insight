## Contexto
Durante la ejecución de AndroidQF, aparecen muchas líneas en rojo tipo `Failed to pull log file`. El usuario se ha asustado creyendo que es un error del análisis, pero es completamente normal: son logs que requieren root o que no existen en su modelo de móvil.

## Cambio propuesto
Añadir una nota tranquilizadora en el sub-paso **"Responde a las preguntas de AndroidQF"** de `/upload`, justo después de la lista de preguntas/recomendaciones y antes del texto sobre "Collecting information on installed apps".

### Detalle técnico
En `src/routes/upload.tsx`, dentro del `content` del sub-paso "Responde a las preguntas de AndroidQF" (líneas 525-587), añadir un párrafo/banner con el siguiente mensaje:

> "Verás muchas líneas en rojo tipo `Failed to pull log file`. Esto es normal: cada fabricante guarda los logs en lugares distintos, y AndroidQF intenta leerlos todos. Algunos no existen en tu modelo o requieren acceso root. Mientras el proceso siga avanzando a la siguiente sección, todo va bien."

Se usará un contenedor con fondo `bg-amber-500/10` o `bg-card/60` y borde `border-amber-500/30` para que sea visible pero no alarmante, con un icono de información (ℹ️) para reforzar que es una aclaración, no un error.

## Alcance
- **Solo frontend:** un párrafo adicional en `src/routes/upload.tsx`.
- **Sin cambios** en scripts `.ps1`/`.sh`, endpoint de análisis, parser ni informe.
