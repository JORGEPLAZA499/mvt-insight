Añadir 4 secciones nuevas al informe (web y PDF) en lenguaje claro para usuario no experto. Mantener el orden existente y numeración correlativa.

## Nuevas secciones del informe

Renumeración (insertar entre las actuales):

```text
01 · Veredicto
02 · Resumen ejecutivo
03 · Ficha del dispositivo          ← NUEVA (sustituye y amplía "Dispositivo identificado")
04 · Cómo leer este informe
05 · Áreas del dispositivo analizadas
06 · Indicios detectados
07 · Apps con más actividad sospechosa   ← NUEVA
08 · Cronología de eventos clave         ← NUEVA (en lenguaje humano)
09 · Próximos pasos recomendados
10 · Cómo verificar este resultado
11 · Glosario de términos                ← NUEVA
12 · Aviso legal y metodología
```

## Contenido de cada sección nueva

### 03 · Ficha del dispositivo
Tarjeta con campos en lenguaje claro:
- **Marca / fabricante** (ej.: Samsung)
- **Modelo comercial** (ej.: Galaxy S22) — derivado de `ro.product.model` + tabla de mapeo de modelos comunes
- **Sistema operativo y versión** (ej.: Android 14)
- **Build / parche de seguridad** (`ro.build.display.id`, `ro.build.version.security_patch`) con explicación: "fecha del último parche de seguridad instalado"
- **Nombre del dispositivo** (el que aparece en Bluetooth/Wi-Fi)
- **Idioma y país configurados** (`persist.sys.locale`)
- **Operador / SIM** (`gsm.sim.operator.alpha`) si está disponible
- **Estado de root / bootloader** (`ro.boot.verifiedbootstate`, `ro.debuggable`) con leyenda "Modo desarrollador activo: sí/no"
- En iOS: `ProductType`, `ProductVersion`, `BuildVersion`, `DeviceName`, `RegionInfo`

NO se mostrará IMEI ni número de serie completos (por privacidad); si están, se muestra solo los últimos 4 dígitos.

### 07 · Apps con más actividad sospechosa
Ranking top 10:
- Agrupar `r.detections` por nombre de app/paquete extraído de `humanizeDetection`/`raw`
- Para cada una: nombre legible, paquete (en mono pequeño), número de indicios, categoría dominante (permisos sensibles, accesibilidad, etc.), severidad máxima
- Etiqueta "App del sistema" / "App conocida" / "App de origen desconocido" según mapping de paquetes habituales (com.google.*, com.android.*, com.samsung.*, etc.)
- Si no hay detecciones, omitir la sección

### 08 · Cronología de eventos clave
Transformar `r.timeline` (máx 20 eventos más relevantes por severidad+fecha) en frases naturales:
- "El **12 de mayo a las 03:14**, la app **WhatsApp** recibió el permiso de **acceder a tu ubicación en segundo plano**."
- "El **3 de junio**, se detectó actividad en **Servicios de accesibilidad** de la app **com.unknown.tracker**."
- Plantillas por módulo (`dumpsys_appops` → permiso concedido; `dumpsys_accessibility` → servicio activado; `sms` → mensaje sospechoso; etc.)
- Si `timeline` está vacío, omitir.

### 11 · Glosario
Lista de 8-12 términos con definición de 1-2 líneas:
- IOC, MVT, AndroidQF, módulo, permiso sensible, servicio de accesibilidad, bootloader, root, parche de seguridad, paquete (package), getprop, stalkerware, mercenary spyware.

## Archivos a tocar

### `src/lib/mvt-parser.ts` y `desktop/src/lib/mvt-parser.ts`
Ampliar `MvtDeviceInfo`:
```ts
export interface MvtDeviceInfo {
  brand?: string;
  manufacturer?: string;
  model?: string;
  marketingName?: string;     // NUEVO
  deviceName?: string;
  osVersion?: string;
  buildId?: string;
  securityPatch?: string;     // NUEVO
  locale?: string;            // NUEVO
  carrier?: string;           // NUEVO
  bootloaderState?: string;   // NUEVO
  debuggable?: boolean;       // NUEVO
  serialLast4?: string;       // NUEVO (solo últimos 4)
  regionInfo?: string;        // NUEVO iOS
}
```
Actualizar `extractAndroidGetprop` y `extractIosInfo` para poblar los nuevos campos.

### `src/lib/mvt-translate.ts`
Nuevas funciones puras (sin React, reutilizables web+PDF):
- `buildDeviceCard(deviceInfo)` → array de `{ label, value, hint? }`
- `buildTopApps(detections)` → array de `{ name, package, count, category, severity, originLabel }`
- `buildHumanTimeline(timeline, detections)` → array de `{ when, sentence }`
- `GLOSSARY: { term, definition }[]`
- `MODEL_NICKNAMES: Record<string, string>` (ej.: `SM-S901B` → "Galaxy S22")
- `KNOWN_PACKAGE_PREFIXES` para clasificar "sistema/conocida/desconocida"

### `src/routes/analysis.$id.tsx`
- Renumerar secciones existentes
- Quitar la línea "Dispositivo identificado: …" del Resumen ejecutivo (ahora vive en Ficha del dispositivo)
- Añadir 4 secciones nuevas usando los helpers de `mvt-translate.ts`

### `src/lib/pdf-report.ts`
- Renumerar secciones
- Añadir 4 secciones nuevas con los mismos datos y estilos consistentes con las actuales (tarjetas, tablas, badges de severidad)
- Mantener saltos de página con `ensure()`

## Lo que NO se toca

- Lógica de cálculo de riesgo, parser de detecciones, base de datos, traducciones i18n existentes.
- Pestaña "Desarrollador" se mantiene igual.
- No bump de versión (cambio de informe, no afecta a la app de escritorio salvo el parser compartido, pero no se publica salvo orden expresa).

## Detalles técnicos

- Para el modelo comercial usaré una tabla pequeña de los modelos más frecuentes (Samsung SM-*, Xiaomi códigos, Google Pixel, OnePlus). Si no hay mapeo, se muestra el código tal cual.
- Para clasificar app conocida/desconocida usaré prefijos: `com.google.*`, `com.android.*`, `com.samsung.*`, `com.miui.*`, `com.huawei.*`, `com.oneplus.*`, `com.apple.*` → sistema; lista corta de top apps (whatsapp, telegram, instagram, fb, tiktok, gmail, chrome) → conocida; resto → desconocida.
- Cronología: ordenar por fecha asc, limitar a 20, agrupar eventos del mismo segundo en uno solo.
- Glosario: constante estática traducida en español.
