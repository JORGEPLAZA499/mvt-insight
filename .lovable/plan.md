## Cambios

### 1. `src/lib/mvt-parser.ts` — `extractIosInfo` robusto
Hacer el extractor tolerante a las distintas formas que mvt-ios produce en `info.json`:
- Aceptar tanto objeto plano como array de `{name, value}` / `{key, value}`.
- Match de claves case/space-insensitive: `ProductType` ≡ `product_type` ≡ `Product Type`, etc.
- Alias: `HardwareModel`, `ModelNumber`, `iOS Version`, `OSVersion`, `Build`, `Region`, `Language`, `Carrier`…
- Resultado: la ficha iOS rellena Modelo, iOS X.Y, firmware, idioma, zona, operador y últimos 4 del serial — igual que Android.

### 2. `src/lib/pdf-report.ts` — sistema tipográfico unificado
Aplicar una escala consistente en todo el documento:

| Rol | Tamaño | Peso |
|---|---|---|
| Número de capítulo | 11 | bold |
| Título de sección | 14 | bold |
| Subtítulo / etiqueta | 9 | bold UPPER |
| Texto / valor | 10 | normal |
| Valor destacado (KPI) | 18 | bold |
| Hint / nota | 9 | italic |
| Párrafo | 10 | normal |

Puntos concretos:
- `sectionTitle`: número 11 bold + título 14 bold alineados a la misma base, offset fijo 28pt.
- Ficha del dispositivo: label 9pt MUTED + value 10pt INK en línea base común, hint 9pt italic.
- KPIs: valor 18 (no 20), label 9 (no 8).
- Veredicto: headline 14 bold, detalle 10 normal, etiqueta 9 MUTED.
- Accesibilidad, perfiles, integridad: nombres 10 bold, metas 9 normal.
- Portada: metadatos label 9 + value 10 bold (más equilibrado).
- Eliminar tamaños sueltos (7, 8, 11, 16, 17, 20, 22) — todo mapea a 9 / 10 / 11 / 14 / 18.

Android e iOS comparten el mismo render; al rellenar la ficha iOS quedan visualmente idénticos.