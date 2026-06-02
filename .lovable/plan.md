## Objetivo

Traducir al sistema i18n (`useTranslation`) toda la interfaz del **Dashboard** y de la página **Upload** — incluyendo títulos, subtítulos, badges, estados, tabla, empty state, y especialmente la descripción larga de cada uno de los sub-pasos del asistente (preámbulo, modo desarrollador, depuración USB, conectar, descarga app, protocolo forense, subir ZIP, etc.), que hoy están todos hardcodeados en español.

## Alcance

Solo cambios de presentación: extraer strings a `src/i18n/locales/es.json` y `en.json` y reemplazar los textos por `t("clave")` en componentes. No se toca lógica, rutas, ni el flujo de pasos.

### Archivos a editar

1. **`src/i18n/locales/es.json`** y **`src/i18n/locales/en.json`** — añadir dos nuevas ramas:
   - `dashboard.*` — header, CTA nuevo análisis, etiquetas de los 4 gauges, HUD pills (Pendientes / Procesando / Completados / Riesgo alto), título "Análisis recientes", link "Ver historial completo", cabeceras de tabla (Archivo, Plataforma, Estado, Riesgo, Detecciones), badges de estado (`pending`/`processing`/`completed`/`error`), empty state.
   - `upload.*` — header (Atrás, "Paso X de Y"), `step1` (título y subtítulo + tarjetas Android/iPhone), `step2` (título, subtítulo, Mac/Windows/Linux), `step3` (bloqueo iPhone+Windows, encabezado "Sigue los pasos en orden", botones Anterior / Hecho siguiente / Ya tengo el ZIP), y `step3.substeps.*` para **cada sub-paso** con su título y cuerpo descriptivo enriquecido (preámbulo cable+USB, modo desarrollador con detalles por marca Samsung/Xiaomi/Pixel/Huawei, depuración USB, conectar y permitir, confiar iPhone, backup cifrado, mantener iPhone desbloqueado, descarga app desktop con notas y aviso "editor desconocido", protocolo forense A/B, subir ZIP), `step4` (título, dropzone, validaciones, consentimiento, botones).

2. **`src/routes/dashboard.tsx`** — importar `useTranslation`, reemplazar todos los literales por `t(...)`. Los componentes internos `HudPill`, `StatusBadge`, `EmptyState` reciben sus labels ya traducidos por props (o llaman a `useTranslation` internamente).

3. **`src/routes/upload.tsx`** — importar `useTranslation` en `Upload`, `StepDevice`, `StepOS`, `StepRun`, `StepUpload`. Reescribir los `subSteps` para que sus `title` y `content` salgan del diccionario. Para los párrafos con `<strong>` embebidos, se usará `<Trans i18nKey="..." components={{ b: <strong className="text-foreground" /> }} />` de `react-i18next`, de modo que cada idioma pueda mantener énfasis y mantener el HTML semántico.

4. **`src/routes/upload.tsx`** — actualizar también la cadena del `<title>` en `head()` con un valor por defecto en español (el `<title>` SSR no puede usar el hook). Mantengo el comportamiento actual.

### Detalles técnicos

- Se usa `react-i18next` ya configurado (`src/i18n/index.ts`).
- Para textos con marcado en línea: `Trans` con `components={{ b: <strong className="text-foreground" />, code: <code className="font-mono text-foreground" />, warn: <span className="block mt-1 text-warning" /> }}`.
- Las listas (rutas exactas por marca, protocolo A/B) se modelan como arrays en el JSON y se renderizan con `t("...", { returnObjects: true }) as string[]`.
- No cambia ninguna clase Tailwind ni el diseño visual.

### Fuera de alcance

- No se modifica la app Electron (`desktop/`), ni `history.tsx` / `reports.tsx` / `analysis.$id.tsx` (no fueron pedidos). Si los quieres también traducidos en esta misma tanda, dímelo y los añado.
- No se cambia la lógica de detección de SO ni el plan anterior de simplificación del flujo (sigue pendiente de tu aprobación por separado).
