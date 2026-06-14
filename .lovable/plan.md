# Plan: soporte de teléfonos con ZIP grandes (muchas fotos/vídeos/apps)

## Qué está pasando hoy

La captura muestra a la vez "✓ Análisis completado" y "No se pudo subir: File size (9129748452) is greater than 2 GiB". Eso resume tres problemas distintos que conviene arreglar juntos:

1. **El renderer de Electron carga el ZIP entero en memoria** antes de subir nada:
   `desktop/src/App.tsx:287` → `window.mvt!.readZip(path)` devuelve un `Uint8Array` con los 9,1 GB.
   Después se reenvuelve en un `File` y se pasa a `parseMvtFiles`. Con un ZIP de 9 GB el proceso se queda sin RAM (V8 corta sobre ~2 GiB por buffer) y la UI parece "colgada".
2. **El servidor rechaza por tamaño** aunque nunca se sube el ZIP:
   `src/routes/api/public/desktop/submit-analysis.ts:14` valida `fileSize ≤ 2_000_000_000`. Lo único que viaja al backend es el JSON `result` (parseo de MVT); `fileSize` es solo metadato. El límite no protege de nada y bloquea casos reales.
3. **El "Análisis completado" se queda fijo aunque la subida falle.**
   En `App.tsx` el `screen === "done"` se pone en cuanto AndroidQF termina de generar el ZIP, y la cabecera "✓ Análisis completado / Informe subido al dashboard" se renderiza sin mirar `upload.state`. Resultado: cabecera verde con error rojo justo debajo.

Además: el parseo MVT (módulos `dumpsys_*`, `packages.json`, paquetes instalados, etc.) corre íntegro en el renderer. Con miles de apps y backups esto también puede hacer crecer el `result` JSON a varios cientos de MB, y entonces el `INSERT` en la columna `jsonb` también peta — pero más adelante.

## Objetivo

Que un teléfono con miles de fotos/vídeos/apps termine el análisis, suba un informe útil al panel y muestre estados coherentes, sin cargar el ZIP entero en memoria ni inventar un límite arbitrario en el servidor.

## Cambios propuestos

### 1. Quitar el límite artificial del backend
`src/routes/api/public/desktop/submit-analysis.ts`
- Subir `fileSize.max()` a `9_000_000_000_000` (9 TB — efectivamente sin tope; sigue siendo un `int`).
- `fileSize` solo es metadato informativo; el peso real del POST es `result` JSON. Ese sí lo seguimos limitando indirectamente vía tamaño máximo del request.

### 2. No leer el ZIP en RAM en el renderer
`desktop/electron/ios-tools.cjs` + `desktop/electron/preload.cjs` + `desktop/src/App.tsx`
- Añadir en main process un nuevo IPC `mvt.parseZip(path)` que:
  - abre el ZIP por *streaming* desde disco (Node `fs.createReadStream` + `yauzl` o `adm-zip` solo para el índice de entradas, **sin** descomprimir vídeos/fotos).
  - itera por entradas y solo extrae a Buffer las que el parser MVT necesita (los `.json` / `.txt` / `dumpsys*` que ya conoce `desktop/src/lib/mvt-parser.ts`); el resto se ignora.
  - llama al parser sobre cada entrada relevante en Node y devuelve el `result` JSON terminado al renderer.
- En `App.tsx::autoUpload` reemplazar el bloque `readZip → File → parseMvtFiles` por:
  ```ts
  const { ok, result, fileSize, error } = await window.mvt!.parseZip(path);
  if (!ok) throw new Error(error || "PARSE_FAILED");
  ```
- Ventaja: el renderer nunca aloja más de unos MB (la entrada actual + el JSON parcial), independientemente de si el ZIP pesa 200 MB o 30 GB.

### 3. Hacer que la UI refleje el estado real
`desktop/src/App.tsx` (~lin. 950-1015) + `desktop/src/i18n/locales/{es,en}.json`
- En la pantalla `done`:
  - Cabecera condicional:
    - `upload.state === "done"` → "✓ Análisis completado · Informe subido al panel".
    - `upload.state === "uploading"` → "✓ Análisis completado · Subiendo al panel…" (con spinner).
    - `upload.state === "error"` → "⚠ Análisis completado, pero no se pudo subir el informe" (icono ámbar, no verde).
    - sin cuenta vinculada → "✓ Análisis completado · Copia local en Descargas".
  - Subtítulo y color del icono derivados del mismo estado.
- Añadir claves i18n: `done.uploaded`, `done.uploading`, `done.uploadFailed`, `done.localOnly`.

### 4. Limitar el riesgo del `result` JSON gigante (defensa en profundidad)
`desktop/src/lib/mvt-parser.ts` (revisar tras el cambio 2)
- Para listas potencialmente enormes (paquetes instalados, archivos escaneados, logs), guardar solo:
  - conteo total,
  - top-N por relevancia (paquetes con permisos peligrosos, con detecciones, etc.),
  - hash de la lista completa por trazabilidad.
- No es bloqueante para esta tarea; lo añadimos como segunda pasada si el ejemplo real (9 GB → ~? MB de JSON) sigue siendo grande. Mejor medirlo antes de truncar.

### 5. Pequeñas mejoras de UX (mismo turno)
- Botón **Reintentar** en estado `upload.state === "error"` ya existe; añadir botón **Copiar diagnóstico** que copie al portapapeles `{ device, fileName, fileSize, errorCode, errorMessage }` para soporte.
- Mensaje de error legible cuando `parseZip` falla por ZIP corrupto vs. por falta de memoria (`code: "OUT_OF_MEMORY"` → texto guía: "El equipo no tiene memoria suficiente para procesar este ZIP. Cierra otras aplicaciones e intenta de nuevo.").

## Lo que NO toco

- El crédito (`consume_credit_and_insert_analysis`) sigue cobrándose **solo** al insertar la fila — la subida fallida del ejemplo NO ha consumido el crédito del usuario, está bien así.
- El generador de PDF vectorial (`src/lib/pdf-report.ts`) no se modifica aquí.
- El esquema de la BD no cambia. Si más adelante el `result` JSON resulta ser de cientos de MB en estos casos extremos, abriremos otro plan para mover `result` a Storage en lugar de columna `jsonb`.

## Validación

1. Caso pequeño (ZIP < 200 MB): comportamiento idéntico al actual; cabecera verde "subido al panel".
2. Caso del usuario (ZIP ~9 GB): la app no se cuelga, termina el parseo en streaming, sube el `result` JSON, muestra cabecera verde + créditos descontados.
3. Sin cuenta vinculada: cabecera neutra "copia local en Descargas", sin intento de subida.
4. Sin créditos: cabecera ámbar "no se pudo subir" + mensaje claro de recarga; sin contradicción con el ✓.

## Orden de implementación sugerido

1. Backend: subir el límite (cambio mínimo y desbloquea pruebas).
2. UI: estado coherente en pantalla `done`.
3. Electron main: `mvt.parseZip` por streaming + reemplazo en `App.tsx`.
4. Probar con el ZIP real del usuario y ajustar parser si el JSON resultante es demasiado grande.
