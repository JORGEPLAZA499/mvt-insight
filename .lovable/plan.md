# Unificar indicios repetidos en el PDF

## Problema
En el informe, `com.life360.android.safetymapd` aparece como crítico decenas de veces. El agrupado actual (`pdf-report.ts` líneas 431-441) solo colapsa indicios **consecutivos** con `module + summary + level` idénticos. Cuando MVT reporta el mismo paquete en varios módulos (permissions, packages, processes…) o con summaries ligeramente distintos (rutas, timestamps), cada variante genera una tarjeta nueva y satura el PDF.

## Objetivo
Una sola tarjeta por "entidad" (paquete, dominio o indicador) dentro de cada categoría, con:
- contador total de apariciones (`42×`)
- lista compacta de los módulos donde apareció
- severidad = la más alta encontrada
- una línea de evidencia representativa (la más larga / informativa)

## Cambios

### 1. `src/lib/mvt-translate.ts`
Añadir helper `detectionKey(d)` que devuelva la "entidad" canónica del indicio:
- Si el summary contiene un package id (`com.xxx.yyy`) → ese package.
- Si contiene un dominio → ese dominio.
- Si contiene una familia conocida (Pegasus, Predator, Life360…) → nombre de familia.
- Fallback: `summary` normalizado (minúsculas, sin rutas/IDs numéricos).

### 2. `src/lib/pdf-report.ts` (sección 05, líneas ~422-441)
Reemplazar el agrupado consecutivo por un agrupado global dentro de cada categoría:

```text
groupsMap: key -> {
  key, label, level (max), count, modules: Set<string>,
  sampleSummary, sampleDetection
}
```

Render de cada tarjeta:
- Título: `N. <label>  ·  <count>×`
- Chip de severidad máxima
- Línea "Detectado en: módulo A, módulo B, módulo C (+3 más)"
- Evidencia representativa (1 línea, no por cada ocurrencia)
- Si `count > 1` y hay rangos de timestamps en `sampleDetection`, añadir "Primera/última vez vista" cuando estén disponibles

### 3. Distribución por categoría
Recalcular `distLine` con el número de **entidades únicas** además del total bruto: `12 stalkerware (1 entidad única)`.

## Resultado esperado
Las ~40 entradas de Life360 colapsan en una sola tarjeta:
> **1. Life360 (com.life360.android.safetymapd)  ·  42×**  
> Detectado en: packages, permissions, processes, dumpsys_appops  
> Evidencia: `com.life360.android.safetymapd matched indicator 'stalkerware-life360'`

Sin cambios en el parser ni en la lógica de detección — solo presentación.
