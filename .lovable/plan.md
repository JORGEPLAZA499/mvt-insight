## Objetivo

En la sección "Apps con más tráfico de red" del informe forense (web + PDF), evitar etiquetar procesos iOS con alto consumo como sospechosos por sí solos. Sustituir "Origen no reconocido — revísala" por una clasificación más profesional, añadir contexto cuando el proceso es un acumulador interno conocido (p.ej. `CumulativeUsageTracker`), calcular un **Traffic Risk Score** combinando otras señales del análisis, y añadir un bloque explicativo "Interpretación del tráfico elevado" debajo de la tabla.

## Cambios

### 1. `src/lib/mvt-translate.ts` — modelo y clasificación

Ampliar `NetworkAppRow` y `buildTopNetwork` (líneas 948–971):

- Añadir lista interna de **acumuladores/registros internos iOS conocidos** (no spyware por sí solos):
  - `CumulativeUsageTracker`, `usageNotificationsd`, `dataaccessd`, `nsurlsessiond`, `identityservicesd`, `apsd`, `mDNSResponder`, `rapportd`, `wifid`, `locationd`, `commcenter`, `assetsd`, `cloudd`, `bird` (iCloud), `routined`.
- Nuevo tipo `NetworkOrigin = "system_accumulator" | "system" | "known" | "unattributed"` (renombrar `"unknown"` a `"unattributed"` solo para tráfico de red; el resto del archivo sigue usando `AppOrigin`).
- Etiquetas:
  - `system_accumulator` → "Registro interno de iOS — consumo acumulado"
  - `unattributed` → "Proceso no atribuido automáticamente — requiere validación manual"
  - `system` / `known` se mantienen.
- Añadir campos a `NetworkAppRow`: `note?: string` (explicación específica del proceso, ej. el párrafo de `CumulativeUsageTracker`) y `severity: RiskLevel` (a partir del Traffic Risk Score, ver §2).

### 2. Traffic Risk Score y nueva función `buildNetworkInterpretation(result)`

Nueva función exportada en `mvt-translate.ts`:

```ts
export interface NetworkInterpretation {
  score: number;           // 0–100
  band: "info" | "low" | "medium" | "high" | "critical";
  bandLabel: string;       // "Tráfico normal", "Requiere revisión", ...
  rationale: string[];     // factores que aportaron al score
  summary: string;         // párrafo final adaptado al caso
}
```

Fórmula (sumatorio, capado a 100):

| Señal | Aporte |
|---|---|
| Tráfico > 1 GB en algún proceso no atribuido | +20 |
| Tráfico > 5 GB en algún proceso no atribuido | +35 (sustituye al anterior) |
| Procesos no atribuidos ≥ 3 | +10 |
| Perfiles MDM/VPN/cert raíz desconocidos (`iosConfigProfiles` con severidad ≥ high) | +25 por tipo, max +40 |
| Detecciones IOC MVT (`totalDetections ≥ 1`) | +30 |
| Detecciones IOC MVT críticas (`risk === "critical"`) | +60 (sustituye al anterior) |
| Servicios de accesibilidad no reconocidos (solo Android) | +15 |

Bandas:
- 0–30 → `info` "Tráfico normal o explicable"
- 31–60 → `low/medium` "Tráfico elevado que requiere revisión"
- 61–80 → `high` "Tráfico elevado con elementos sospechosos asociados"
- 81–100 → `critical` "Tráfico elevado con coincidencias IOC o señales claras de compromiso"

`severity` de cada `NetworkAppRow` se deriva: `system`/`known`/`system_accumulator` → `low`; `unattributed` con score global ≥ 61 → `high`; resto → `medium` si tráfico > 500 MB, si no `low`.

### 3. `src/routes/analysis.$id.tsx` — UI

- Tras la tabla (línea ~362), añadir nuevo bloque "Interpretación del tráfico elevado" con:
  - Chip de banda + score numérico.
  - Párrafo introductorio fijo (texto del usuario sobre que volumen ≠ spyware, recomendación de reiniciar estadísticas 24–48 h, revisar perfiles/VPN/certificados/permisos).
  - Mención específica si hay un `system_accumulator` en la lista (texto sobre `CumulativeUsageTracker`).
  - Lista `rationale` como bullets.
- En `NetworkAppRowView` (línea 640): mostrar `note` debajo del package name si existe, y reemplazar el icono warning fijo para `unknown` por color basado en `severity` de la fila.
- Reemplazar texto introductorio (línea 356) por uno menos alarmista: "Procesos o apps con mayor volumen de datos enviados/recibidos. Un volumen elevado no equivale por sí solo a spyware; consulta la interpretación inferior."

### 4. `src/lib/pdf-report.ts` — PDF

- En la sección "Apps con más tráfico de red" (líneas 495–526):
  - Usar nuevas etiquetas (`originLabel` actualizado ya viene de `buildTopNetwork`).
  - Pintar la barra lateral roja solo si `app.severity === "high" | "critical"` en vez de `origin === "unknown"`.
  - Imprimir `note` debajo del package si existe.
- Añadir bloque "Interpretación del tráfico elevado" tras la tabla usando `buildNetworkInterpretation(r)`: chip con banda+score, párrafo introductorio, párrafo específico si hay acumulador, lista de rationale.

### 5. Sin tocar

- `src/lib/mvt-parser.ts` (la extracción ya devuelve nombres tal cual).
- Schema BD, server functions, módulos no relacionados.
- Etiqueta "Origen no reconocido" en otras secciones (apps populares, accesibilidad) — fuera de alcance.

## Texto literal usado

Párrafo de cabecera del bloque interpretativo (versión iOS):

> El volumen mostrado corresponde a datos enviados o recibidos por procesos y apps detectadas. Un consumo elevado no equivale necesariamente a spyware o seguimiento. En iOS, algunos procesos actúan como registros internos o acumuladores de uso de datos, por lo que el volumen puede reflejar actividad acumulada durante un periodo largo. Para valorar riesgo real revisa el periodo de acumulación, el comportamiento del dispositivo y la existencia de otros indicadores (perfiles MDM, VPN, certificados, permisos sensibles, apps no reconocidas). Recomendado: reiniciar las estadísticas de datos móviles, usar el dispositivo 24–48 h y repetir el análisis.

Nota específica para `CumulativeUsageTracker`:

> Puede corresponder a un registro interno/acumulador de uso de datos en iOS. Un volumen elevado por sí solo no confirma spyware ni exfiltración; verifica el periodo de acumulación y cruza con otros indicadores antes de concluir.

## Validación

`bunx tsc --noEmit` tras los cambios. Verificación visual en el preview cargando un análisis iOS existente con `CumulativeUsageTracker`.
