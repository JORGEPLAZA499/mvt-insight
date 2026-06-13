## Diagnóstico

Lo que ves en la segunda imagen es normal:
- `androidqf.exe` está vivo y recolectando.
- Los 5 `MvtInsight.exe` son los procesos estándar de Electron (main + GPU + utility + renderer + helper).

La fase "Collecting information on installed apps" de AndroidQF puede estar 5–15 min sin emitir una sola línea al stdout. El watchdog de la UI (`lastLogAt`) cree que no hay actividad y muestra el aviso, aunque el binario sigue trabajando.

Además, el texto actual dice "la app cortará automáticamente" pero **no existe ningún auto-cancel** en `desktop/src/App.tsx` — es información incorrecta.

## Cambios

### 1. Texto del aviso (correcto y dependiente del dispositivo)

Archivo: `desktop/src/App.tsx`, línea 803.

Reemplazar el `div` hardcodeado por un texto i18n y referido a la herramienta real:

- iOS → "Sin actividad de mvt-ios desde hace {N} min."
- Android → "Sin actividad de androidqf desde hace {N} min."
- Sufijo común y veraz: "Esto suele ser normal mientras se recolectan apps o se crea el backup. Si pasa de 15 min, pulsa Cancelar y reintenta."

Quitar la frase "la app cortará automáticamente" (no es cierta).

### 2. Claves i18n

Archivos: `desktop/src/i18n/locales/es.json` y `desktop/src/i18n/locales/en.json`.

Añadir bajo `running` (o el namespace que ya use ese bloque) algo como:

```
"idleWarning": {
  "ios":     "⚠ Sin actividad de mvt-ios desde hace {{min}} min.",
  "android": "⚠ Sin actividad de androidqf desde hace {{min}} min.",
  "hint":    "Esto puede ser normal mientras se recolectan apps o se crea el backup. Si supera 15 min, pulsa Cancelar y reintenta."
}
```

### 3. Umbral del aviso

Subir el umbral de 5 a 8 minutos para Android (la recolección de apps suele tardar 5–10 min sin output) y mantener 5 min para iOS. Cambio puntual en la condición `if (idleMin < 5) return null;` (línea 800) usando `device`.

### Sin cambios

- No se toca la lógica de `androidqf`, ni el watchdog real del proceso en `electron/main.cjs` / `ios-tools.cjs`.
- No se introduce auto-cancelación.
- No se bumpea la versión del desktop.