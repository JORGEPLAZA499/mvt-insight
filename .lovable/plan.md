## Problema detectado

El orden actual de los sub-pasos en `/upload` paso 3 es **ilógico** y los textos asumen un estado que aún no se ha producido. Ejemplos:

- El **paso 1 actual es "Descarga la app"** y su texto dice *"Ya tienes el móvil conectado por USB"* y *"hablará con el móvil que ya tienes enchufado"* — pero el USB todavía no se ha conectado (eso ocurre 4 pasos después).
- El **paso 2 actual es "Protocolo forense"** (PC sin internet + móvil en modo avión) y su texto dice *"ejecuta la app de escritorio una vez con Internet para que descargue las herramientas"* — pero la app se acaba de descargar en el paso anterior y todavía no se ha abierto.
- Las **instrucciones del paso "Descarga"** mezclan tres cosas distintas: instalar la app, conectar el móvil y ejecutar el análisis. Eso provoca la confusión de "ya tienes el móvil conectado".
- El **orden tampoco respeta la secuencia operativa**: hay que descargar la app **con internet**, luego aislar los equipos, y solo entonces conectar el móvil; el flujo actual hace lo contrario.

## Reordenar los sub-pasos (Android)

Nuevo orden lógico:

```text
1. Prepara el cable y el móvil           (preamble — ya existe sin usar)
2. Descarga la app de escritorio         (download — aún con internet)
3. Activa el modo desarrollador          (dev)
4. Activa la Depuración USB              (usb)
5. Aísla los equipos (recomendado)       (protocol — PC sin red + móvil en avión)
6. Conecta el móvil por USB              (connect)
7. Abre la app y ejecuta el análisis     (run — paso NUEVO, extraído del actual download)
8. Sube el ZIP                           (upload)
```

## Reordenar los sub-pasos (iPhone)

```text
1. Prepara el cable y el iPhone          (preamble)
2. Descarga la app de escritorio         (download — aún con internet)
3. Aísla los equipos (recomendado)       (protocol)
4. Conecta y confía en el ordenador      (iosTrust)
5. Crea el backup cifrado                (iosBackup)
6. Mantén el iPhone conectado            (iosKeep)
7. Abre la app y ejecuta el análisis     (run)
8. Sube el ZIP                           (upload)
```

## Reescritura de textos (es y en)

Se corrigen las contradicciones y se reasigna el contenido entre pasos. Resumen de los cambios principales:

- **`download.intro`**: ya no afirma que el móvil esté conectado. Pasa a decir que se descargue *ahora* aprovechando que aún hay internet, y que más adelante se conectará el móvil.
- **`download.instructions`**: se queda solo con la instrucción de instalación (descomprimir + doble clic). Las instrucciones de "iniciar análisis" y "dónde queda el ZIP" se mueven al nuevo paso `run`.
- **`run` (nuevo)**: título *"Abre la app y ejecuta el análisis"*, cuerpo claro: con el móvil ya conectado por USB y desbloqueado, pulsar "Iniciar análisis"; al terminar la app dirá dónde se ha guardado el ZIP.
- **`protocol.intro`**: se reformula como recomendación general previa a la conexión (no como "si sospechas"), y se ubica claramente *entre* descargar y conectar.
- **`protocol.a.body`**: se elimina la frase *"Antes, ejecuta la app de escritorio una vez con Internet…"* (ya está descargada). Queda solo la instrucción de desconectar red/Wi-Fi del PC.
- **`protocol.b.body`**: aclara que el móvil **todavía no está conectado por USB** y que el modo avión no afecta a la depuración USB que se usará en el paso siguiente.
- **`connect.body`** (Android): añade *"con ambos equipos ya en modo avión"* para encadenar con el paso anterior.
- **`iosTrust.body`**: ya menciona "Conecta el iPhone por USB" — se mantiene, queda coherente porque ahora viene después del aislamiento.
- **`upload.body`**: pequeño ajuste para que no repita "cuando la app termine" (ya se dijo en `run`).

## Cambios técnicos

Archivos a tocar (solo frontend / textos):

1. **`src/i18n/locales/es.json`** y **`src/i18n/locales/en.json`**
   - Reescribir los textos listados arriba dentro de `upload.step3.substeps.*`.
   - Añadir nuevo bloque `upload.step3.substeps.run` con `title` y `body` (array de 2 ítems).
   - Recortar `download.instructions` a un solo elemento.

2. **`src/routes/upload.tsx`** (función que construye `subSteps`, líneas ~339-534)
   - **Android**: `[preamble, download, dev, usb, protocol, connect, run, upload]`
   - **iPhone**: `[preamble, download, protocol, iosTrust, iosBackup, iosKeep, run, upload]`
   - Reemplazar el `subSteps.unshift(downloadStep, protocolStep)` y el `subSteps.push(uploadStep)` por la construcción explícita del array según `device`.
   - Añadir un nuevo bloque `runStep` que renderice las instrucciones de ejecutar la app.
   - Añadir el `preamble` como primer paso (hoy existe en i18n pero no se usa).

No se toca lógica de créditos, fetch, realtime, navegación entre pasos ni el step 4. Solo orden y copys.

## Resultado esperado

Cada sub-paso describe únicamente acciones que el usuario *ya* puede hacer en ese momento, sin asumir estados futuros. El móvil se conecta después de aislar los equipos, la app se descarga mientras todavía hay internet, y la ejecución del análisis tiene su propio paso visible en la barra de progreso (8 sub-pasos en lugar de 6).
