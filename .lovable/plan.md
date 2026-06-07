## Objetivo

En la pantalla "Analizando Android…" de la app de escritorio:

1. **Ocultar** el botón "Ver detalles técnicos" y su modal con el log crudo en inglés.
2. **Mostrar** mensajes amigables debajo de la fase activa, traducidos a español/inglés según el idioma de la app, que vayan reflejando lo que está haciendo el análisis (ej. "Descargando AndroidQF", "Esperando autorización USB en tu móvil", "Analizando apps instaladas", "Recolectando información del dispositivo", "Buscando indicios de spyware", "Comprimiendo resultados", etc.).

## Cómo funciona hoy

- `desktop/electron/main.cjs` emite dos canales IPC:
  - `mvt:log` → líneas crudas de AndroidQF (lo que se ve hoy en el modal de detalles técnicos, en inglés y con códigos como `AAPM-compatible`, `exit status 255`).
  - `mvt:phase` → `{ phase, label, progress }` con el sub-paso actual (ya alimenta el spinner "Analizando apps…").
- En `desktop/src/App.tsx` el render de `screen === "running"` (líneas 529–625) muestra las 3 fases con el `phase.label` debajo de la activa, y además el botón + modal de "Ver detalles técnicos" (líneas 571–609).

El `phase.label` ya es nuestro canal de mensajes de estado — solo necesitamos enriquecerlo, traducirlo y enchufar el modal técnico fuera.

## Cambios

### 1. `desktop/electron/main.cjs`

En vez de mandar etiquetas en español hardcodeadas a `mvt:phase`, mandar **claves de traducción** (no texto). Detectar más eventos del stream de AndroidQF y emitir una clave por cada uno. Lista de eventos a detectar (regex sobre el texto limpio):

| Patrón en el log de AndroidQF | Clave de fase a emitir |
|---|---|
| (al empezar fase 1) | `phaseStatus.resolvingVersion` |
| (durante descarga binario) | `phaseStatus.downloadingBinary` (+ progress real) |
| (binario listo) | `phaseStatus.binaryReady` |
| (al empezar fase 2) | `phaseStatus.waitingUsbAuth` |
| `backup` | `phaseStatus.backup` |
| `Downloading APKs` | `phaseStatus.downloadingApks` |
| `Collecting information on installed apps` | `phaseStatus.analyzingApps` |
| `SMS` / `getprop` / `processes` / `services` / `dumpsys` | `phaseStatus.collectingSystemInfo` |
| `AAPM-compatible` | (silencioso, no es un error) |
| (al detectar zip/carpeta final) | `phaseStatus.compressing` |
| (terminado) | `phaseStatus.done` |

Cambio del payload de `mvt:phase`: pasar a `{ phase, statusKey, progress }`. Mantener `label` como fallback para compat hacia atrás (texto en español como ahora) por si una versión antigua del front lo lee.

No tocar la lógica de auto-respuesta a prompts ni la detección del resultado — solo cambia qué se manda al renderer.

### 2. `desktop/src/i18n/locales/es.json` y `en.json`

Añadir un nuevo bloque `phaseStatus` con los textos amigables:

```
phaseStatus: {
  resolvingVersion:    "Buscando la última versión disponible…"   / "Looking up the latest version…"
  downloadingBinary:   "Descargando herramienta de análisis…"     / "Downloading the analysis tool…"
  binaryReady:         "Herramienta lista"                        / "Tool ready"
  waitingUsbAuth:      "Esperando autorización en el móvil. Acepta «Permitir depuración USB»." / "Waiting for authorization on your phone. Accept «Allow USB debugging»."
  backup:              "Creando copia de seguridad del dispositivo…" / "Creating device backup…"
  downloadingApks:     "Descargando aplicaciones instaladas…"     / "Downloading installed apps…"
  analyzingApps:       "Analizando aplicaciones instaladas…"      / "Analyzing installed apps…"
  collectingSystemInfo:"Recolectando información del sistema…"    / "Collecting system info…"
  compressing:         "Comprimiendo resultados…"                 / "Compressing results…"
  done:                "Análisis finalizado"                      / "Analysis complete"
}
```

### 3. `desktop/src/App.tsx`

- Cambiar el tipo `PhaseState` para que tenga `statusKey?: string` además de `label`.
- En el handler `onPhase`, guardar `statusKey` si viene, si no caer al `label`.
- En el JSX de la fase activa (línea 552), renderizar `statusKey ? tr(statusKey, label) : label`.
- **Eliminar** todo el bloque del botón "Ver detalles técnicos" y su modal (líneas 571–609), el estado `showLogs`, su `useEffect` de tecla Escape y el `useEffect` de auto-scroll del log. El listener `onLog` se puede dejar (mantiene `logs` para diagnóstico interno) o eliminar — lo dejamos por si el usuario reporta un error y queremos volver a habilitarlo, pero sin UI visible.

No se toca nada del flujo de subida, vinculación, ni de la web.

## Notas técnicas

- Es un cambio solo en la **app de escritorio** (`desktop/`). No afecta a la web ni a la BD.
- Es compatible hacia atrás: si una build vieja del binario emite el `label` antiguo en español, la UI lo seguirá mostrando como fallback.
- **No se bumpa la versión** de `desktop/package.json` salvo que pidas publicar.

## Lo que el usuario verá

Antes: log crudo en inglés con líneas como `Device is not AAPM-compatible, skipping...`, `Failed to get file paths for package com.payjoy.access: exit status 255`.

Después: solo la fase activa con un texto claro tipo "Analizando aplicaciones instaladas…" que cambia a "Recolectando información del sistema…", "Comprimiendo resultados…", etc., siempre en el idioma elegido.
