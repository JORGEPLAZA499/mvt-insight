# Selección de sistema antes de iniciar el flujo

En `/upload`, añadir una pantalla previa donde el usuario elige **Android** o **iPhone**. Solo después se muestran los pasos, que ahora dependen del sistema elegido (el paso de "modo desarrollador / depuración USB" no aplica a iPhone).

## UX

1. Al entrar a `/upload`, en lugar del primer paso, se muestra una tarjeta de selección con dos botones grandes:
   - **Android** (icono Smartphone) — "Necesita activar opciones de desarrollador y depuración USB".
   - **iPhone** (icono Apple) — "Solo requiere confiar en el equipo y un backup cifrado".
2. Al elegir uno, aparece el wizard de pasos actual, ya filtrado para ese sistema. En la cabecera del wizard se muestra un chip con el sistema elegido y un botón pequeño "Cambiar" que vuelve al selector.
3. La barra de progreso y el contador "Paso X de N" se recalculan con la nueva lista de pasos.

## Pasos por sistema

**Comunes (1, 2, 3, 6):**
- Paso 1 — Descarga la app de escritorio.
- Paso 2 — Vincula la app con tu cuenta.
- Paso 3 — Activa el modo avión en el teléfono.
- Paso final — Recibe el informe aquí.

**Android (orden):** 1 → 2 → 3 → "Activa modo desarrollador y depuración USB" (actual paso 4) → "Conecta por USB y ejecuta" (actual paso 5, texto ajustado a Android) → 6.

**iPhone (orden):** 1 → 2 → 3 → **nuevo paso iOS** "Prepara tu iPhone": desbloquéalo, conéctalo por USB, pulsa "Confiar en este equipo" e introduce el código. Recomendado: tener un backup cifrado en Finder/iTunes (la app puede hacerlo). → "Conecta y ejecuta el análisis" (texto adaptado: la app detecta el iPhone automáticamente, sin depuración USB) → 6.

## Cambios de código

**`src/routes/upload.tsx`**
- Estado nuevo: `const [system, setSystem] = useState<"android" | "ios" | null>(null)`.
- Definir dos arrays `androidSteps` e `iosSteps` con `{ icon, key }`. Reutilizar las claves comunes y añadir claves nuevas (ver i18n).
- Si `system === null`, renderizar componente `SystemPicker` (dos tarjetas grandes con icono y descripción corta) dentro del mismo `AppShell` y manteniendo cabecera (badge, título, intro). No renderizar barra de progreso ni wizard.
- Si `system !== null`, renderizar el wizard como hoy, pero usando `steps = system === "android" ? androidSteps : iosSteps` y mostrando un chip "Android" / "iPhone" con botón "Cambiar" que hace `setSystem(null); setCurrent(0)`.
- Resetear `current` a 0 cuando se elige sistema.

**`src/i18n/locales/es.json` y `en.json`** — añadir bajo `upload.desktopOnly`:
- `pickSystem.title`, `pickSystem.body`.
- `pickSystem.android.title`, `pickSystem.android.body`.
- `pickSystem.ios.title`, `pickSystem.ios.body`.
- `pickSystem.change` ("Cambiar sistema").
- `chip.android` ("Android"), `chip.ios` ("iPhone").
- `step4Android.title/body` (reescribir el actual paso 4 con foco Android).
- `step5Android.title/body` (paso 5 actual adaptado solo Android).
- `step4Ios.title/body` ("Prepara tu iPhone: confía en este equipo y haz un backup cifrado").
- `step5Ios.title/body` ("Conecta el iPhone por USB y ejecuta el análisis", sin mención a depuración USB).
- Mantener `step4` y `step5` actuales como deprecados o eliminarlos (sustituirlos por las variantes Android).

No se tocan los flujos del desktop ni la lógica de análisis: este cambio es solo de UI/contenido en la web.
