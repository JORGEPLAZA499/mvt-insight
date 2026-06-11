## Cambio

El título del Paso 3 en `/upload` no coincide con su descripción (habla de modo avión, no de conectar/analizar — eso es el Paso 5).

Ajustar el título en ambos idiomas:

- `src/i18n/locales/es.json` → `upload.desktopOnly.step3.title`:
  - Antes: `"Paso 3: Conecta el dispositivo y analiza"`
  - Después: `"Paso 3: Activa el modo avión en el teléfono"`

- `src/i18n/locales/en.json` → equivalente en inglés:
  - Después: `"Step 3: Enable airplane mode on the phone"`

No se cambia el `body` ni el resto de pasos.