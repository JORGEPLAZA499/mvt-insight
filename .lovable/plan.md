# Plan: Segunda capa de análisis — General Spyware & Stalkerware Detection

## Objetivo

Ampliar el analizador para que, además del actual motor MVT (IOCs de spyware mercenario), aplique una capa heurística que detecte stalkerware comercial, apps espía simples, permisos peligrosos y configuraciones de riesgo. Los dos motores conviven y el informe los muestra claramente separados, sin mezclar IOCs forenses con sospechas heurísticas.

## Arquitectura de motores

Tres módulos, todos ejecutándose sobre el mismo ZIP/dump ya leído (no se duplica I/O):

1. **MVT Advanced Threat Engine** — lo actual (`parseMvtEntries`). Sin cambios funcionales.
2. **Stalkerware & Commercial Spyware Engine** — analiza apps instaladas, paquetes, accesibilidad, nombres camuflados, instaladores no oficiales, permisos peligrosos por app.
3. **Device Risk Configuration Engine** — analiza perfiles MDM, certificados, VPN, proxy/DNS, admin de dispositivo, SELinux, debug ADB, bootloader desbloqueado, servicios de accesibilidad concedidos a apps no esenciales.

Los motores 2 y 3 son los nuevos. Producen una lista unificada de **findings heurísticos** que viven en una rama distinta del resultado.

## Modelo de datos (nuevo, sin romper lo existente)

En `src/lib/mvt-parser.ts` (y su gemelo `desktop/src/lib/mvt-parser.ts`) se añade al `MvtParsedResult`:

```text
heuristics?: HeuristicReport
```

Definido en un módulo nuevo `src/lib/heuristics.ts`:

```text
type FindingKind   = "confirmed_indicator" | "suspicious_pattern" | "informational"
type FindingEngine = "stalkerware" | "device_risk"
type FindingCategory =
  | "dangerous_permission" | "suspicious_app" | "risky_config" | "anomalous_behavior"

interface HeuristicFinding {
  id: string
  engine: FindingEngine
  category: FindingCategory
  kind: FindingKind
  title: string             // "Acceso a SMS"
  evidence: string          // dato concreto (paquete, valor, ruta)
  reason: string            // motivo técnico breve
  severity: RiskLevel       // low | medium | high | critical
  recommendation: string    // acción sugerida
  source?: { module: string; key?: string }  // módulo MVT del que sale
}

interface HeuristicReport {
  overallRisk: RiskLevel    // bajo | medio | alto | crítico (independiente del de MVT)
  findings: HeuristicFinding[]
  countsBySeverity: Record<RiskLevel, number>
  countsByEngine: Record<FindingEngine, number>
}
```

El campo `risk` global del informe pasa a calcularse como `max(mvt.risk, heuristics.overallRisk)` para que el resumen ejecutivo refleje ambos motores.

## Reglas heurísticas (primera versión)

Todas las reglas se implementan sobre los artefactos que MVT ya extrae, sin pedir nuevos dumps. Cada regla emite un `HeuristicFinding`.

### Stalkerware & Commercial Spyware Engine

- **Permisos peligrosos por app** (Android `dumpsys_appops`, `dumpsys_packages`): `READ_SMS`, `RECEIVE_SMS`, `SEND_SMS`, `READ_CALL_LOG`, `PROCESS_OUTGOING_CALLS`, `READ_CONTACTS`, `RECORD_AUDIO`, `CAMERA`, `ACCESS_BACKGROUND_LOCATION`, `MANAGE_EXTERNAL_STORAGE`, `BIND_ACCESSIBILITY_SERVICE`, `SYSTEM_ALERT_WINDOW`, `REQUEST_INSTALL_PACKAGES`. Severidad por combinación (1 permiso = low, ≥3 = medium, accesibilidad + SMS/llamadas = high).
- **iOS `tcc` permisos sensibles** otorgados a apps no estándar (micrófono, cámara, contactos, ubicación siempre).
- **Apps instaladas fuera de tiendas oficiales** (instalador ≠ Play Store / App Store, instalación por ADB o navegador): medium por sí solo, high si además pide permisos peligrosos.
- **Nombres camuflados**: lista de patrones (`System Service`, `Device Manager`, `Update Service`, `Security Plugin`, `WiFi Service`, `Sync Service`, package que termina en `.systemservice` / `.update` con instalador no oficial).
- **Apps de monitoreo / control parental conocidas** (Life360, mSpy, FlexiSpy, Cocospy, Hoverwatch, Spyzie, XNSPY, Cerberus, FamilyTime, Qustodio, Bark, etc.) → `confirmed_indicator` cuando el package coincide; severity high (informativo: puede ser legítimo si el usuario lo instaló a sabiendas).
- **App sin label / icono** (cuando el dump lo permite inferir) → low.

### Device Risk Configuration Engine

- **iOS — perfiles MDM/config instalados** (`configuration_profiles`): medium por presencia; high si el `PayloadType` es `com.apple.mdm` y la organización no es del fabricante.
- **iOS — perfiles caducados o de organizaciones desconocidas** (lista blanca: Apple, operadores conocidos).
- **Android — administradores de dispositivo activos** (de `dumpsys_device_policy` / `device_admins` si están en el dump).
- **Android — bootloader desbloqueado** (`ro.boot.verifiedbootstate == orange`) → high.
- **Android — debug ADB activado** (`ro.debuggable == 1`) → medium.
- **Android — SELinux `permissive`/`disabled`** → high.
- **Servicios de accesibilidad concedidos a apps no del sistema** → high si la app no es un teclado, lector de pantalla u otra de la whitelist.
- **VPN / proxy / DNS** configurados en `settings` (`global_http_proxy_host`, `private_dns_specifier`, VPNs persistentes) → medium.
- **Top procesos por consumo de red** que ya extrae el parser: cualquier app no de sistema con consumo desproporcionado → informational.

Las reglas viven en `src/lib/heuristics/rules/*.ts` (una por categoría) y se registran en un array. Cada regla recibe el `MvtParsedResult` parcial (módulos + datos extra) y devuelve `HeuristicFinding[]`.

## Cálculo de `overallRisk` heurístico

```text
critical → cualquier confirmed_indicator + ≥1 high
high     → ≥1 high O (≥2 medium en distintas categorías)
medium   → ≥1 medium O ≥3 low
low      → solo low / ninguno
```

Se mantiene independiente del riesgo MVT y se muestra al lado, nunca fusionado en silencio.

## Cambios en parser

`parseMvtEntries` al final llama a `runHeuristics(result)` y adjunta `heuristics`. El parser sigue siendo síncrono y puro. Se actualizan **dos** archivos espejo: `src/lib/mvt-parser.ts` y `desktop/src/lib/mvt-parser.ts` (mismo cambio, copiado).

## UI — `src/routes/analysis.$id.tsx`

Nueva sección en el `UserReport`, situada justo después de "Veredicto" y antes de "Resumen ejecutivo":

```text
┌─ Análisis avanzado (MVT / IOCs conocidos) ───────────────┐
│ Riesgo: BAJO · 0 indicios MVT                            │
└──────────────────────────────────────────────────────────┘
┌─ Análisis general de spyware y stalkerware (heurístico) ─┐
│ Riesgo: MEDIO · 4 hallazgos                              │
│  • 1 confirmed indicator                                 │
│  • 2 suspicious patterns                                 │
│  • 1 informational                                       │
└──────────────────────────────────────────────────────────┘
```

Debajo, tabla agrupada por categoría (`Permisos peligrosos`, `Apps sospechosas`, `Config. de riesgo`, `Comportamiento anómalo`) con: título, evidencia, motivo técnico, severidad (badge), tipo (`confirmed`/`suspicious`/`info`) y recomendación. Se reutilizan los componentes de badges/cards existentes; cero nuevos primitives.

Tabs `user`/`dev` no cambian. En `dev` se añade un bloque que lista los findings en crudo con su `source.module`.

## PDF — `src/lib/pdf-report.ts`

Nuevas secciones, en este orden:

1. (existente) Veredicto
2. **Resumen por motor** — dos tarjetas: "MVT Advanced Threat Engine" y "General Spyware & Stalkerware Pattern Analysis", cada una con su riesgo, número de hallazgos y leyenda corta.
3. (existente) Resumen ejecutivo, ficha del dispositivo, etc.
4. Nueva sección **Hallazgos heurísticos**, dividida en subbloques por categoría. Cada finding usa el mismo card que `drawDetectionsList` pero con el chip de tipo (`CONFIRMADO`/`SOSPECHOSO`/`INFO`) además del de severidad.

Texto legal/de cierre actualizado para usar las frases pedidas: "Se encontraron indicadores compatibles con posible spyware.", "No se encontraron IOCs conocidos, pero existen patrones sospechosos.", "Un resultado limpio no garantiza ausencia total de compromiso." La frase concreta se elige según el cruce de `mvt.risk` y `heuristics.overallRisk`. Nunca se afirma "el teléfono está infectado" salvo `confirmed_indicator` + severity `critical`.

## i18n

Se añaden claves nuevas en `src/i18n/locales/es.json` y `en.json` para títulos, categorías, tipos y frases legales. Todas las cadenas mostradas pasan por `t(...)`.

## Sin cambios

- Esquema de BD, server functions, `analyses` row → el resultado heurístico viaja dentro del mismo `result` JSON ya existente.
- Flujo de upload, créditos, webhooks.
- `desktop/package.json > version`. Solo se bumpea cuando el usuario pida "publica" o "saca versión".

## Detalles técnicos

- **Archivos nuevos**: `src/lib/heuristics.ts`, `src/lib/heuristics/rules/permissions.ts`, `.../apps.ts`, `.../config.ts`, `.../behavior.ts`, `.../whitelist.ts` (paquetes de sistema/teclados/lectores), `.../families.ts` (lista de stalkerware conocido).
- **Archivos editados**: `src/lib/mvt-parser.ts`, `desktop/src/lib/mvt-parser.ts` (espejo), `src/lib/mvt-translate.ts` (extender `buildVerdict` para tener en cuenta heuristics), `src/routes/analysis.$id.tsx`, `src/lib/pdf-report.ts`, `src/i18n/locales/es.json`, `src/i18n/locales/en.json`.
- **Sin nuevas dependencias.** Todo es código puro TS sobre el modelo ya parseado.
- **Tests rápidos**: el parser se valida ejecutando un análisis existente desde `/reports` y comprobando que la sección heurística aparece y que el PDF se genera sin romper. No se añaden tests automatizados (no hay suite en el repo).

## Lo que NO entra en este plan

- Reglas dinámicas/actualizables desde backend (queda fijo en código).
- Integración con Yara, MobSF o servicios externos.
- Cambios en la captura desktop (lo que MVT ya recoge es suficiente para la v1 de heurísticas).
