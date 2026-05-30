# Pestañas globales en la página de resultado de análisis

## Problema
Las pestañas "Para ti" / "Modo desarrollador" hoy viven solo dentro de la sección "Indicadores detectados" (componente `DetectionsTabs`). Si el análisis no tiene detecciones, no aparecen. El usuario las quiere visibles siempre, abarcando toda la página de resultado.

## Cambios en `src/routes/analysis.$id.tsx`

1. **Reestructurar `AnalysisPage`** para que, tras la cabecera (título del archivo, botones Eliminar / Descargar PDF y la tarjeta de "Nivel de riesgo estimado"), todo el resto del contenido viva dentro de un `<Tabs defaultValue="user">` global.

2. **Pestaña "Para ti" (usuario no experto)** — vista resumida y amigable:
   - Stats principales (Módulos, Entradas, Detecciones, Plataforma).
   - Resumen narrativo: "Se encontraron N indicadores agrupados en X categorías" o mensaje verde tranquilizador si 0.
   - Detecciones agrupadas por categoría con descripción humana (`CATEGORY_LABEL` + `CATEGORY_DESC` + `humanizeDetection`), sin paths técnicos ni JSON. Reutilizar el contenido actual del `TabsContent value="user"` de `DetectionsTabs`.

3. **Pestaña "Modo desarrollador"** — vista técnica completa:
   - Tabla de "Módulos MVT analizados" (la actual, líneas 104-126).
   - Lista cruda de detecciones con `detectionKey`, severidad, módulo y datos técnicos (el contenido actual del `TabsContent value="dev"` de `DetectionsTabs`).
   - "Línea de tiempo" (la actual, líneas 138-154).

4. **Eliminar `DetectionsTabs`** ya que su contenido se distribuye entre las dos pestañas globales. Conservar los imports de `Tabs`, `User`, `Code2`.

5. **Internacionalización**: usar `t()` de `useTranslation` para los labels "Para ti" y "Modo desarrollador" (claves `analysis.tabs.user` y `analysis.tabs.dev` en `es.json` / `en.json`).

6. **Enlace "Volver al dashboard"** y la cabecera quedan FUERA de las pestañas, siempre visibles.

## Resultado
El usuario verá siempre dos pestañas grandes bajo la tarjeta de riesgo: una con lenguaje claro para no técnicos y otra con todos los detalles forenses. Funciona haya o no detecciones.
