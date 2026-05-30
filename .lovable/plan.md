## Mejoras al informe PDF y al resumen de detecciones

### 1) `src/lib/mvt-parser.ts`
- Reescribir `summarize()` con esta prioridad:
  1. Si `it.message` es string → usarlo completo (sin truncar a 160).
  2. Si no, construir: `"<package_name|name|path|process>"` cuando exista.
  3. Último recurso: `JSON.stringify(it)` truncado a ~200 caracteres por palabra completa.
- Rellenar `level` en cada `MvtDetection` a partir de `it.level` (low/medium/high/critical) o, si no existe, `"high"` cuando venga del array `_detected`.

### 2) `src/lib/pdf-report.ts`
- Antes de pintar, **ordenar** detecciones por severidad desc (critical→high→medium→low→undef).
- **Agrupar consecutivas** con el mismo `module + summary` en una sola línea con sufijo `(N×)`.
- Cada entrada se pinta como:
  `N. [SEVERIDAD] módulo — resumen (N×)` con color por severidad (rojo crítico, naranja alto, amarillo medio, gris bajo).
- Texto del resumen en `helvetica` (no `courier`) para mejor lectura.
- Subir el tope visible de 80 a 150 grupos.

### Sin cambios
- Parser ZIP, cálculo de riesgo, conteo de módulos, dashboard, rutas ni estilos globales.

### Resultado
- Ruido de Life360 se colapsa: `[ALTO] dumpsys_receivers — com.life360.android.safetymapd (23×)`.
- Entradas con `message` salen completas y legibles.
- Informe más corto, ordenado por gravedad y con severidad visible.
