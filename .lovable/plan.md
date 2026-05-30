# Pestaña "Para ti" = mismo contenido y orden que el PDF, con detalles y sin duplicados

El usuario quiere que la vista web y el PDF cuenten la misma historia, en el mismo orden, con el mismo nivel de detalle. Además hay dos bugs concretos: los módulos muestran sólo "1117 entradas / 16 indicios" sin decir *qué* permisos / *qué* apps; y Life360 sale dos veces en la sección de Spyware (una vez con package y otra con hash de certificado).

## 1. Reordenar la pestaña "Para ti" (`src/routes/analysis.$id.tsx`)

Reorganizar `TabsContent value="user"` para reflejar la estructura numerada del PDF, con los mismos títulos:

1. **Veredicto** — tarjeta con `buildVerdict(r)` (headline + detail), con color por nivel (mercenary/stalkerware/suspicious/clean). Hoy no se muestra en el front.
2. **Resumen ejecutivo** — frase narrativa con archivo, plataforma, módulos, entradas, indicios y riesgo (igual que `baseSummary` del PDF).
3. **KPIs** — 4 stats: Indicios · Módulos con indicios · Entradas analizadas · Riesgo (mismo conjunto que el PDF, no los actuales "Módulos / Entradas / Detecciones / Plataforma").
4. **Cómo leer este informe** — texto explicativo + leyenda de severidades CRÍTICO/ALTO/MEDIO/BAJO con sus chips.
5. **Áreas del dispositivo analizadas** — tabla (Área · Entradas · Indicios · Estado) con `humanizeModule`. **Ampliada**: cada fila expandible que lista las entidades concretas detectadas en ese módulo (ver §2).
6. **Indicios detectados** — agrupados por categoría (Spyware mercenario / Stalkerware comercial / Comportamiento sospechoso) con `UserDetections` actual.
7. **Próximos pasos recomendados** — `nextSteps(r)` numerado.
8. **Cómo verificar este resultado** — `CROSS_CHECK_STEPS` (MVT oficial, Access Now, Amnesty, Citizen Lab).
9. **Aviso legal y metodología** — los tres párrafos del PDF.

La pestaña "Modo desarrollador" se mantiene como está (módulos crudos + detecciones crudas + timeline).

## 2. Detalle por módulo — "qué permisos / qué apps" (`src/lib/mvt-translate.ts` + `analysis.$id.tsx` + `pdf-report.ts`)

Hoy la tabla "Áreas analizadas" sólo da números agregados ("Permisos sensibles concedidos a · 1117 · 16 · ALTO"). El usuario quiere ver *cuáles*. Añadir, debajo de cada fila con `detected > 0`, un sub-bloque con las top entidades concretas:

- **dumpsys_appops** (Permisos sensibles) → listar las top 8 combinaciones `<app> · <permiso humanizado>` (p.ej. `com.android.shell · leer media seleccionada por el usuario · 7×`). Usar `PERMISSION_LABELS` ya existente y extender con: `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_MEDIA_IMAGES`, `READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, `POST_NOTIFICATIONS`, `MANAGE_EXTERNAL_STORAGE`, `READ_PHONE_STATE`, `ACCESS_COARSE_LOCATION`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `GET_ACCOUNTS`, `READ_CALENDAR`, `WRITE_CALENDAR`.
- **dumpsys_receivers** / **dumpsys_activities** → listar top apps/paquetes detectados y contador.
- **aqf_packages / dumpsys_packages** → listar apps instaladas marcadas y cómo (ADB / navegador / downgrade / uninstall).
- **dumpsys_battery_daily** → listar paquetes con downgrade/uninstall detectados.
- **tombstones** → listar procesos con crash y timestamp.

Implementación: nueva función `buildModuleHighlights(detections, moduleKey)` en `mvt-translate.ts` que devuelve un array `{label, count, sub?}` con las top entidades del módulo, reutilizando `detectionKey` + `humanizeDetection` + parsing de permisos. Renderizar tanto en el front (expandible por módulo en la sección "Áreas analizadas") como en el PDF (debajo de cada fila con `detected > 0`).

## 3. Arreglar duplicado Life360 (`src/lib/mvt-translate.ts`)

**Causa**: en `detectionKey`, cuando el summary contiene la familia conocida ("Life360"), se concatena el package al key si aparece en el mismo summary. La primera detección incluye `com.life360.android.safetymapd` → key `fam:life360|com.life360.android.safetymapd`. La segunda (certificado por hash) no incluye package → key `fam:life360`. Resultado: dos grupos distintos para la misma familia.

**Fix**: Para familias conocidas, deduplicar siempre por familia sola, ignorando el package. El label puede seguir mostrando el package cuando esté disponible, pero la `key` será `fam:<familia>` para que todas las evidencias de Life360 (receivers, certificados, packages, actividades) se sumen al mismo grupo. Los módulos y la evidencia representativa siguen apareciendo en el detalle del grupo.

## Resultado

- Web y PDF muestran las 8 mismas secciones en el mismo orden y con el mismo nivel de detalle.
- Tabla de áreas analizadas muestra qué permisos/apps/procesos concretos hay debajo de cada cifra agregada.
- Life360 aparece como una sola entidad con `count` total y todos los módulos donde fue visto.

## Detalles técnicos

- `mvt-translate.ts`: ampliar `PERMISSION_LABELS`; añadir `buildModuleHighlights(detections, moduleKey, limit?)`; cambiar la rama "familia conocida" de `detectionKey` para usar siempre `key = fam:<lower>` (sin sufijo de package).
- `analysis.$id.tsx`: reestructurar `TabsContent value="user"` con las 9 sub-secciones, renderizar veredicto, leyenda de severidades, próximos pasos, verificación cruzada, aviso legal y highlights por módulo. Importar `buildVerdict`, `explainSeverity`, `nextSteps`, `CROSS_CHECK_STEPS`, `buildModuleHighlights`.
- `pdf-report.ts`: en la sección 04 (Áreas analizadas) imprimir los highlights debajo de cada fila con `detected > 0` (texto envuelto, fuente 8pt).
- No se tocan parser ni almacén; sólo presentación y dedup.
