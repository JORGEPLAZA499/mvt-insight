
# Simplificar "Nuevo análisis" como asistente guiado

## Objetivo

La página `/upload` actual muestra todo de golpe (drop zone + link a guía externa). Los usuarios se pierden entre subir archivos vs. ejecutar MVT/AndroidQF. La página `/guia` tiene 6+ pasos, comandos largos, tabs iOS/Android, OS switcher, troubleshooting — demasiado.

Convertir `/upload` en un **wizard de 1 paso visible a la vez**, con todo lo esencial embebido. Mantener `/guia` para usuarios avanzados.

## Flujo propuesto (mostrar un paso a la vez)

```text
[Paso 1/4] ¿Qué dispositivo quieres analizar?
   → [Android]  [iPhone]

[Paso 2/4] ¿Desde qué computador lo vas a hacer?
   (auto-detectado, editable)
   → [Mac]  [Windows]  [Linux]

[Paso 3/4] Copia y pega este comando en la Terminal
   → 1 solo comando (instala + analiza en uno)
   → Botón "¿Cómo abro la Terminal?" (collapsible)
   → Botón "Ya terminó, tengo el ZIP" → siguiente

[Paso 4/4] Sube el ZIP de resultados
   → Drop zone + checkbox consentimiento + "Analizar"
```

Solo el paso actual es visible. Arriba: barra de progreso fina (`Progress` de shadcn) + botón "Atrás". Sin tabs, sin acordeones largos, sin troubleshooting en línea.

## Cambios concretos

### `src/routes/upload.tsx` (reescribir)
- Estado `step: 1 | 2 | 3 | 4`, `device`, `os` (auto-detectado vía `navigator.userAgent`).
- Componentes internos `<StepDevice>`, `<StepOS>`, `<StepRun>`, `<StepUpload>` — solo se renderiza el activo.
- Header con `<Progress value={step*25} />` + indicador "Paso N de 4" + botón "← Atrás" (oculto en paso 1).
- En paso 3, reutilizar `<CopyCommand>` con el comando combinado correspondiente a (device, os). Para Windows+iOS, mostrar mensaje "Usa un Mac" + botón para volver a paso 2.
- En paso 3, link discreto al final: "¿Prefieres ver todos los pasos manualmente? → Guía completa" (lleva a `/guia`).
- Paso 4 = drop zone + consentimiento + "Analizar" (lógica actual de `parseMvtFiles` intacta).
- Mantener tamaño máximo 50 MB, validación `.json`/`.zip`, navegación a `/analysis/$id`.

### `src/routes/guia.tsx` (sin cambios funcionales)
- Sigue existiendo como referencia avanzada. No se toca en esta iteración.

### Componentes nuevos
- Ninguno externo: todo dentro de `upload.tsx` para mantenerlo simple.

## Qué NO se hace
- No tocar scripts (`public/scripts/*`) ni `mvt-parser.ts` ni `pdf-report.ts`.
- No modificar `/guia` (queda como modo experto).
- No añadir backend.
- No tocar dashboard/historial/reportes.

## Verificación
- Recorrer los 4 pasos en preview con Android+Mac y con iOS+Windows (debe mostrar bloqueo).
- Confirmar que "Atrás" preserva selecciones.
- Subir un ZIP de prueba para validar que paso 4 sigue navegando a `/analysis/$id`.
