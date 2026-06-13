## Objetivo

El PDF actual se construye "a mano" con jsPDF (~957 líneas) y no coincide con lo que ve el usuario en `/analysis/$id`. Reemplazaremos el contenido del PDF por una captura fiel de la vista web del informe, manteniendo jsPDF como motor (más una portada y pie de página propios).

## Enfoque

1. **Renderizar el informe en el DOM** (oculto fuera de pantalla) y capturarlo con `html2canvas` sección por sección.
2. **Embeber cada sección como imagen** en un `jsPDF` A4, gestionando saltos de página de forma que ninguna tarjeta quede partida por la mitad.
3. **Mantener** la portada y el encabezado/pie corporativos actuales (son los únicos elementos que sí se ven bien hoy).

## Cambios

### 1. Dependencias
- Añadir `html2canvas` (jsPDF ya está instalado).

### 2. Marcar bloques imprimibles en `src/routes/analysis.$id.tsx`
- Envolver el contenido del informe en un contenedor con `id="pdf-report-root"`.
- Añadir `data-pdf-section` a cada `<section>` y a cada tarjeta de cabecera (veredicto, KPIs, ficha del dispositivo). Así `html2canvas` captura cada bloque por separado y el generador evita partirlos.
- No cambia nada visualmente para el usuario.

### 3. Reescribir `src/lib/pdf-report.ts`
- Conservar la **portada** actual (banda de riesgo, metadatos, branding) y el header/footer por página.
- Sustituir el cuerpo manual por:
  1. Localizar `#pdf-report-root` en el DOM.
  2. Para cada `[data-pdf-section]`:
     - Renderizar con `html2canvas` a `scale: 2`, `backgroundColor` del tema, `useCORS: true`.
     - Calcular alto en mm respetando ancho útil A4 con márgenes.
     - Si no cabe en lo que queda de página → `addPage()` y reiniciar `y`.
     - Si la sección sola es más alta que una página → trocearla en franjas del alto de página (única excepción donde sí se corta).
     - `pdf.addImage(...)` en la posición actual y avanzar `y`.
  3. Reaplicar header/footer en cada página nueva (igual que ahora).
- Mantener la firma `generatePdfReport(a: Analysis)` para no tocar a los llamadores (`reports.tsx`, `analysis.$id.tsx`).
- La función se vuelve `async` (la mayoría de callers ya la usan en handlers, no rompe nada — solo deja de devolver `void` síncrono).

### 4. Garantizar que el informe esté montado al exportar
- Desde `/analysis/$id` ya está renderizado en pantalla → captura directa.
- Desde `/reports` (donde el usuario también puede pulsar "PDF" sin abrir el informe): renderizar el componente del informe en un contenedor offscreen (`position: fixed; left: -10000px; width: 1024px`) usando `createRoot`, esperar el primer frame, capturar y desmontar. Alternativa más simple: en `/reports` cambiar el botón "PDF" por un enlace a `/analysis/$id?export=1` que dispare la descarga al cargar. Decidiré durante la implementación según complejidad; preferiré el offscreen render para no cambiar la UX.

### 5. Estilos para impresión
- Añadir en `src/styles.css` una regla `[data-pdf-capture] { color-scheme: light; background: #fff; color: #0f172a; }` que se aplique solo al clon offscreen, para forzar tema claro al capturar (el dashboard es oscuro y queda ilegible impreso en blanco).

## Detalles técnicos

- `html2canvas` no soporta `oklch()` directamente en algunas versiones. Si aparece el problema, forzaré tema claro con variables RGB en el contenedor de captura (ya previsto en paso 5).
- Tamaños: A4 = 210×297 mm, márgenes 15 mm, ancho útil 180 mm.
- Calidad: `scale: 2` (~150 dpi efectivo) — balance entre nitidez y tamaño de archivo.
- Las secciones se insertan como PNG; el texto no será seleccionable (trade-off aceptado a cambio de fidelidad visual).

## Archivos tocados

- `package.json` (añadir `html2canvas`)
- `src/lib/pdf-report.ts` (reescritura del cuerpo, portada se conserva)
- `src/routes/analysis.$id.tsx` (atributos `data-pdf-section` + `id` en el root)
- `src/styles.css` (regla para el contenedor de captura)

## Fuera de alcance

- No se cambian las traducciones del informe.
- No se modifica el contenido del informe ni los cálculos de riesgo.
- No se toca el flujo de PDF del desktop app.
