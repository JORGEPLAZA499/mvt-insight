## Problema

El PDF actual muestra mensajes crudos de MVT en inglés y jerga forense ("Found a known suspicious receiver with name…", "dumpsys_receivers", "REQUEST_INSTALL_PACKAGES"). Un usuario normal no entiende qué significa ni qué debe hacer.

## Objetivo

Convertir el informe en algo legible: español claro, sin jerga, con una explicación de qué es cada hallazgo y qué riesgo implica — sin tocar el motor de análisis ni cambiar los datos.

## Cambios

### 1) Nuevo archivo `src/lib/mvt-translate.ts`

Capa de traducción/humanización. Funciones puras, sin estado:

- `humanizeModule(key)`: traduce el nombre técnico del módulo a algo entendible.
  - `dumpsys_receivers` → "Receptores de eventos del sistema"
  - `dumpsys_appops` → "Permisos sensibles concedidos a apps"
  - `dumpsys_packages` / `aqf_packages` → "Aplicaciones instaladas"
  - `dumpsys_battery_daily` / `dumpsys_battery_history` → "Consumo de batería por app"
  - `dumpsys_activities` → "Actividad de apps en primer plano"
  - `tombstones` → "Fallos críticos del sistema"
  - `sms`, `mounts`, `alerts`, etc. — tabla completa.

- `humanizeDetection(module, summary, raw)`: convierte el mensaje MVT a una frase en español + categoría amigable. Usa patrones (regex) sobre los mensajes típicos de MVT:
  - `"Found a known suspicious app with ID \"X\" matching indicators from \"Y\""` → **App señalada como sospechosa: `X` (coincide con indicadores de `Y`)**
  - `"Found a known suspicious app certfificate with hash \"H\" matching indicators from \"Y\""` → **Certificado de app coincide con la familia `Y`**
  - `"Found a known suspicious receiver with name \"X\" matching indicators from \"Y\""` → **Componente en segundo plano de la app `paquete` vinculado a `Y`** (extrae el paquete antes de `/`)
  - `"Found a non-system package installed via adb…"` → **App instalada manualmente (vía ADB/USB), no por la tienda oficial: `X`**
  - `"Found a package installed via a browser…"` → **App instalada desde el navegador (fuera de la tienda): `X`**
  - `"Package 'X' had risky permission 'REQUEST_INSTALL_PACKAGES' set to 'Access' at T"` → **`X` recibió permiso para instalar otras apps (`T`)**
  - Otros permisos sensibles (`SYSTEM_ALERT_WINDOW`, `BIND_ACCESSIBILITY_SERVICE`, `READ_SMS`, `RECORD_AUDIO`, etc.) con explicación corta de para qué sirve.
  - Fallback: devolver el `summary` original si no hay patrón conocido.

- `explainSeverity(level)`: una línea por nivel ("Crítico — requiere atención inmediata", "Alto — revisar pronto", "Medio — comportamiento inusual pero no concluyente", "Bajo — informativo").

- `riskNarrative(result)`: 2–3 frases en español que resumen el riesgo general en lenguaje natural ("Se han encontrado indicios consistentes con la app de seguimiento familiar Life360. No es malware en sí, pero permite localizar el dispositivo de forma continua. Revisa si la instalaste tú.").
  - Detecta familias frecuentes (Life360, Pegasus, Predator, FinFisher, Hermit, stalkerware genérico) y produce un texto adaptado.

### 2) `src/lib/pdf-report.ts` — re-escribir secciones

Sin tocar el parser. Solo cambia cómo se presenta:

- **Nueva sección "¿Qué significa este informe?"** justo después del resumen ejecutivo: 4–5 líneas explicando que MVT busca rastros conocidos de spyware, que una detección no equivale a infección, y cómo leer las severidades (lista con `explainSeverity`).
- **Resumen ejecutivo**: añadir la frase de `riskNarrative()` al final.
- **Módulos analizados**: usar `humanizeModule(key)` como nombre principal; mostrar el código técnico entre paréntesis y en gris pequeño. Omitir módulos con 0 entradas y 0 detecciones (ruido).
- **Indicadores detectados**: cada grupo se pinta como
  ```
  N. [SEVERIDAD] <módulo humanizado>  (N×)
     <frase traducida>
     Detalle técnico: <summary original, gris pequeño>
  ```
  El "detalle técnico" se incluye colapsado en gris claro para no perder la trazabilidad forense.
- **Nueva sección "Próximos pasos recomendados"** adaptada al riesgo (sustituye a la actual "Recomendaciones" genérica): si hay app conocida (p.ej. Life360) → instrucciones específicas; si es Crítico genérico → aislar, contactar especialista; si Bajo → monitorizar.

### 3) Sin cambios

- Parser MVT (`mvt-parser.ts`), modelo de datos, cálculo de riesgo, conteo, dashboard, rutas, estilos globales.
- No se traduce en el dashboard; solo en el PDF (a menos que pidas extenderlo después).

## Resultado esperado

Antes:
```
[CRÍTICO] 21. dumpsys_receivers (16×)
Found a known suspicious receiver with name
"com.life360.android.safetymapd/com.life360.android.location.receivers.LocationReceiver"
matching indicators from "Life360"
```

Después:
```
[CRÍTICO] 21. Receptores de eventos del sistema  (16×)
Componente de localización en segundo plano de la app "com.life360.android.safetymapd",
asociada a Life360 (seguimiento familiar). Se activa para registrar la posición del dispositivo.
Detalle técnico: Found a known suspicious receiver with name "com.life360…/LocationReceiver" matching indicators from "Life360"
```

Y al inicio: "Se han encontrado 129 indicios. La mayoría corresponden a la app **Life360** (localización familiar). No es malware, pero permite saber dónde estás en todo momento. Si no la instalaste tú, considérala sospechosa."
