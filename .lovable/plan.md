# Por qué el PDF actual sale "horrible"

`src/lib/pdf-report.ts` solo dibuja la portada con jsPDF. El resto del informe (páginas 2-6) se genera con **html2canvas-pro**, que **fotografía el DOM vivo** de `#pdf-report-root` en `/analysis/$id` y mete esa imagen rasterizada en el PDF. Esto arrastra todos los defectos visibles:

- **Todo es una imagen**: no se puede seleccionar texto, no se puede buscar, pesa mucho, se ve borroso al hacer zoom.
- **Truncados feos de la UI**: la tabla "Áreas analizadas" muestra `dumps…`, `Files / fil…`, `Paquetes instalad…`, `settings_syste…` porque las clases CSS de la web (`truncate`) recortan etiquetas pensadas para una tarjeta estrecha, no para una página A4.
- **Datos mal formateados**:
  - `TAMAÑO DEL ORIGEN: 1339099.3 KB` en vez de `1,3 GB`.
  - `OPERADOR (SIM): ,Carrier` (coma inicial por un join vacío).
  - `PLATAFORMA DETECTADA: Android (mvt-android)` — jerga en portada.
  - `15 módulos con indicios` en el resumen ejecutivo cuando en realidad son 15 módulos **analizados** con 0 indicios.
- **Redundancias**: "02 Resumen ejecutivo" repite la misma frase y números que las 4 tarjetas justo debajo.
- **Portada con hueco enorme** entre el subtítulo y la tarjeta de metadatos.

## ¿html2pdf.js arregla esto?

**No.** `html2pdf.js` usa internamente `html2canvas` + `jsPDF`, es exactamente el mismo enfoque (rasterizar el DOM) con sus mismos problemas. Cambiar a esa librería no mejora calidad, solo añade dependencia.

Las alternativas reales son:

| Opción | Calidad | Texto seleccionable | Esfuerzo | Viable aquí |
|---|---|---|---|---|
| html2canvas / html2pdf | mala (raster) | ❌ | bajo | actual |
| **jsPDF vectorial** (layout propio) | alta | ✅ | medio | **sí** |
| @react-pdf/renderer | alta | ✅ | alto (reescribir vista) | sí |
| Puppeteer en backend | máxima | ✅ | alto | ❌ (Cloudflare Workers no soporta) |

Recomendación: **jsPDF vectorial**. La portada ya está hecha así; sólo hay que extender el mismo patrón al resto de secciones y dejar de capturar el DOM.

# Plan

Reescribir `src/lib/pdf-report.ts` para que **todo** el informe sea vectorial con jsPDF, eliminando `html2canvas-pro`. La estética se mantiene (paleta navy/accent, secciones numeradas), pero el texto es real y los datos van formateados.

## Cambios

1. **Quitar dependencia de captura del DOM**
   - Eliminar `import html2canvas from "html2canvas-pro"` y todo `await html2canvas(...)`.
   - `generatePdfReport(analysis)` deja de depender de que `#pdf-report-root` esté montado. Funcionará también desde `/reports` sin abrir el análisis.
   - Quitar `id="pdf-report-root"` ya no es necesario, pero lo dejamos por si se reutiliza para vista previa.

2. **Layout vectorial por secciones** (mismo orden que ahora)
   - Helpers internos: `drawHeader(page)`, `drawFooter(page, total)`, `sectionTitle(n, label)`, `kvRow(label, value)`, `card(x,y,w,h)`, `table(rows, cols)`, `chip(text, color)`, `ensureSpace(h)` con salto de página automático.
   - Secciones: Portada → Veredicto → Resumen ejecutivo (4 KPIs en grid) → Ficha del dispositivo (grid 2 col) → Cómo leer → Áreas analizadas (tabla real, sin truncar) → Indicios detectados (lista o "sin coincidencias") → Próximos pasos → Verificación externa → Glosario → Aviso legal.

3. **Arreglar los datos**
   - Tamaño: nuevo `formatBytes(n)` → `1,3 GB` / `512 MB` / `48 KB`.
   - Operador SIM: limpiar `","` y comas/espacios sobrantes; si queda vacío mostrar `—`.
   - Plataforma en portada: `Android` / `iOS` sin el `(mvt-android)`; el tag técnico va en pie de tarjeta en gris.
   - Resumen ejecutivo: redactar "15 módulos **analizados**, 0 con indicios"; eliminar la línea duplicada y dejar sólo las 4 KPIs + una frase corta de veredicto.
   - Tabla "Áreas analizadas": una sola columna `ÁREA` con el nombre humano + (código técnico) en gris al lado, **sin** truncado; columnas `Entradas`, `Indicios`, `Estado` alineadas a la derecha.

4. **Portada**
   - Reducir el espacio vacío subiendo la tarjeta de metadatos.
   - Etiqueta "NIVEL DE RIESGO" con color según severidad (verde/amarillo/naranja/rojo) en lugar del bloque gris plano actual.

5. **Pie de página con paginación real**
   - Tras dibujar todo, recorrer páginas y poner `Página X de N` (jsPDF lo permite con `getNumberOfPages()`).

6. **Limpieza**
   - `bun remove html2canvas-pro` si no lo usa nadie más (verificar antes con `rg`).
   - El botón "PDF" sigue llamando a `generatePdfReport(a)` sin cambios.

## Detalles técnicos

- Sin nuevas dependencias: sólo `jspdf` (ya instalado).
- Fuente `helvetica` integrada de jsPDF cubre acentos y `·`; nada de Unicode raro (sin `••••` en serie — usar `····` o `xxxx`).
- Ancho útil A4: `W - 80pt`. Tabla con anchos fijos `[60% nombre, 15% entradas, 10% indicios, 15% estado]`.
- Salto de página: cada sección comprueba `ensureSpace(altoEstimado)` antes de dibujar; si no cabe, `doc.addPage()` y redibuja header.

## Fuera de alcance

- No se toca la vista web `/analysis/$id` (sigue como está).
- No se cambia la lógica de análisis ni los datos guardados.
- No se introduce backend ni Puppeteer.
