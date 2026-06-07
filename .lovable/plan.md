# Mensaje de informe subido

## Problema

Cuando termina la subida, el panel muestra:

- "✓ Informe subido"
- "Abriendo informe en el navegador…" ← confuso, parece que sigue cargando

Pero la subida ya terminó y el informe ya está en el dashboard web.

## Cambio

En `desktop/src/App.tsx` (estado `upload.state === "done"`):

1. Reemplazar el texto `upload.openingReport` por uno que confirme el estado final, p. ej.:
   - ES: "El informe ya está disponible en tu panel de control."
   - EN: "Your report is now available in your dashboard."

2. Quitar el `setTimeout` que abre el informe automáticamente en el navegador (líneas 230-233). El usuario ya tiene el botón "Ver informe →" que hace exactamente lo mismo, y la apertura automática es lo que justificaba el mensaje "Abriendo…". Sin ese auto-open, no hay nada que esperar.

3. Actualizar las claves `upload.openingReport` en `desktop/src/i18n/locales/es.json` y `en.json` con el texto nuevo (o renombrar la clave a algo como `reportReady` y actualizar el `tr(...)` correspondiente).

## Versión

No bumpear `desktop/package.json` — el usuario no ha pedido publicar.
