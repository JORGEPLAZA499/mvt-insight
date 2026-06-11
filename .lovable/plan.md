## Diagnóstico

Tras revisar `informe-27B73663.pdf` y `src/lib/pdf-report.ts`, hay dos problemas distintos:

### 1. Jerarquía tipográfica plana (lo que pides)
Los títulos de sección están en 15 pt y muchos cuerpos/descripciones en 10 pt: solo 5 pt de diferencia, así que visualmente el título no “manda”. En varios bloques (glosario, “Cómo verificar este resultado”, tarjetas de indicios) el título de la tarjeta es 10 pt y la descripción 9 pt — quedan casi iguales, por eso parece que “la descripción es más grande que el título”.

### 2. Rendering “Inform e forense” / “Resum en ejecutivo”
Los textos en **negrita** salen con huecos extra entre letras (`Inform e`, `Resum en`, `Áreas del dispositivo anal izadas`). Es un defecto conocido de jsPDF con la fuente Helvetica estándar al medir ciertos pares con caracteres acentuados (ó, í, á, ñ). **No es algo que se ajuste cambiando tamaños**; se arregla cambiando a una fuente TTF embebida (p. ej. Inter o Noto Sans). Lo dejo fuera del alcance salvo que me confirmes que también quieres que lo solucione (implica embeber un .ttf y subir el peso del bundle ~150 KB).

---

## Cambios propuestos (solo tipografía / jerarquía)

Archivo: `src/lib/pdf-report.ts`

| Bloque | Actual | Nuevo |
|---|---|---|
| Título de sección (`sectionTitle`) | 15 pt bold | **17 pt bold**, separador a 12 pt (más aire) |
| Numerito de sección (“01”, “02”…) | 8 pt | 8 pt (sin cambio, ya funciona) |
| Veredicto: headline | 14 pt | **16 pt** |
| Veredicto: detalle | 9 pt | 10 pt |
| Resumen ejecutivo (párrafo) | 10 pt | 10.5 pt (sin cambio real, queda) |
| KPI cards: número | 18 pt | **20 pt** |
| KPI cards: etiqueta | 8 pt | 8 pt (sin cambio) |
| Ficha del dispositivo: valor | 10 pt | **11 pt bold** |
| Ficha del dispositivo: etiqueta | 9 pt | 9 pt MUTED (sin cambio) |
| Tabla “Áreas analizadas”: nombre módulo | 10 pt bold | **11 pt bold** |
| Tabla: clave técnica `(dumpsys)` | 8 pt | 8 pt MUTED (sin cambio) |
| Tarjetas “Cómo verificar este resultado”: título | 10 pt bold | **12 pt bold NAVY** |
| Tarjetas “Cómo verificar…”: cuerpo | 9 pt | 9.5 pt |
| Glosario: término | 10 pt bold | **11.5 pt bold NAVY** |
| Glosario: definición | 9 pt | 9 pt (sin cambio) |
| Tarjetas de indicios: nombre entidad | 10 pt bold | **11 pt bold** |
| Tarjetas de indicios: módulos detectados | 8 pt | 8 pt MUTED (sin cambio) |
| Tarjetas de “Apps con más…” / accesibilidad / perfiles: nombre | 10 pt bold | **11 pt bold** |
| Próximos pasos: texto del paso | 10 pt | **11 pt** |
| Cabecera categoría (“Indicios mercenarios · …”) | 12 pt | **13 pt** |
| Leyenda severidades (página 3): cuerpo | 10 pt | 10 pt (sin cambio) |
| Aviso legal: párrafos | 9 pt | 9 pt (sin cambio) |
| Portada — título | 34 pt | 34 pt (sin cambio) |
| Portada — subtítulo | 12 pt | 12 pt (sin cambio) |

Otros pequeños ajustes derivados:
- Recalcular alturas de tarjetas (`cardH2`, `cardH3`, `boxH` del glosario y de “Cómo verificar…”) en función de los nuevos tamaños de fuente, para que no se solapen ni dejen huecos enormes.
- Asegurar que el `humanLines` de las tarjetas de indicios se mide con el nuevo `fontSize(11)` antes de calcular la altura.
- Mantener anchos y márgenes; no se tocan colores, layout, ni contenido.

## Validación (obligatoria)
1. Generar un informe nuevo desde la app.
2. Convertir a imágenes con `pdftoppm -jpeg -r 110` y abrir las 5 páginas.
3. Comprobar página por página que: títulos de sección dominan, tarjetas tienen título mayor que descripción, no hay solapes ni cortes.
4. Si algún bloque queda demasiado alto, ajustar `boxH` correspondiente.

## Fuera de alcance (a confirmar aparte)
- Sustituir la Helvetica estándar por una TTF embebida para eliminar el efecto “Inform e forense”. Avísame si lo quieres y lo añado en otra iteración.
