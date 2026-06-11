Eliminar el párrafo introductorio de la sección 07 "Cómo verificar este resultado" en dos archivos:

1. `src/routes/analysis.$id.tsx` — eliminar el `<p>` que dice "MVT solo detecta amenazas con firma conocida..."
2. `src/lib/pdf-report.ts` — eliminar la línea `paragraph(...)` correspondiente

La sección 07 seguirá mostrando los pasos de verificación cruzada (`CROSS_CHECK_STEPS`), solo se quita el párrafo de texto introductorio.

No requiere bump de versión (solo cambio de texto).