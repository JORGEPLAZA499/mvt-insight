# Mostrar marca/modelo del teléfono en el informe

## Contexto

MVT, cuando captura un Android con `androidqf`, incluye `getprop.json` (propiedades del sistema con `ro.product.brand`, `ro.product.manufacturer`, `ro.product.model`, `ro.build.version.release`, etc.). En iOS, MVT genera `info.json` con `ProductType`, `ProductVersion`, `DeviceName`, etc.

El parser actual solo cuenta entradas; descarta esos valores. Por eso el informe no enseña la marca del teléfono.

Nota: el análisis ya guardado en BD (`0d63965f-…`) **no incluye** `getprop.json` en su ZIP, así que retroactivamente no se podrá mostrar la marca. El cambio aplica a **futuros análisis**.

## Cambios

### 1. Parser MVT — extraer info del dispositivo

En `desktop/src/lib/mvt-parser.ts` y `src/lib/mvt-parser.ts` (mismo código en ambos):

- Añadir tipo `MvtDeviceInfo { brand?, manufacturer?, model?, deviceName?, osVersion?, buildId? }` y campo opcional `deviceInfo?` en `MvtParsedResult`.
- Nueva función `extractDeviceInfo(moduleKey, data, platform)`:
  - Android, módulo `getprop`: aceptar tanto array `[{name,value}, …]` como objeto `{key: value}`. Mapear:
    - `ro.product.brand` → brand
    - `ro.product.manufacturer` → manufacturer
    - `ro.product.model` → model
    - `ro.product.device` → deviceName (fallback)
    - `ro.build.version.release` → osVersion
    - `ro.build.display.id` o `ro.build.id` → buildId
  - iOS, módulo `info`: leer `ProductType` → model, `ProductName`/`ProductType` → brand="Apple", `ProductVersion` → osVersion, `BuildVersion` → buildId, `DeviceName` → deviceName.
- En `parseMvtFiles`, después del bucle de archivos, llamar a `extractDeviceInfo` sobre los módulos relevantes (`getprop` para Android, `info` para iOS) y devolver `deviceInfo`.

### 2. UI web — `src/routes/analysis.$id.tsx`

- En la cabecera (debajo del título del archivo), mostrar línea adicional con marca/modelo cuando `r.deviceInfo` tenga datos:
  `"Samsung Galaxy S21 · Android 14"` (concatenando manufacturer/brand + model + osVersion).
- En la sección **02 · Resumen ejecutivo**, añadir un párrafo:
  `"Dispositivo identificado: <marca> <modelo> con <SO> <versión>."` cuando exista `deviceInfo`.

### 3. PDF — `src/lib/pdf-report.ts`

- En la sección de portada/datos del informe (donde se muestra plataforma + fecha), añadir línea con marca/modelo si `deviceInfo` existe.
- Mismo string que la web para consistencia.

### 4. Sin cambios de versión

No bumpear `desktop/package.json` — el usuario no ha pedido publicar.

## Limitación

Si el ZIP de MVT no incluye `getprop.json` (Android) o `info.json` (iOS), el informe simplemente no muestra la marca (sin error, sin "—"). Esto depende de cómo capture la app de escritorio: si quiere que la marca aparezca siempre, habría que asegurar que el script `analizar-android.sh/ps1` incluya `getprop > getprop.json` en la carpeta antes de comprimir — eso es un cambio aparte y puedo abordarlo después si quieres.
