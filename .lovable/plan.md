## Problema

El Paso 3 explica cómo lanzar el `.bat`, pero **no avisa al usuario de los prompts interactivos** que AndroidQF le va a hacer en la terminal. El usuario llega a "Backup? / Download? / Remove?" sin saber qué pulsar.

## Solución

Añadir un nuevo **sub-paso 4.5 "Responde a las preguntas de AndroidQF"** dentro del flujo paso-a-paso de `StepRun` (`src/routes/upload.tsx`), justo entre el sub-paso del lanzador (4) y el del ZIP (5). Solo para Android — iOS no usa AndroidQF.

El sub-paso muestra una tabla/lista con cada prompt y la opción recomendada, con explicación corta:

| Prompt en la terminal | Qué pulsar | Por qué |
|---|---|---|
| `Would you like to take a backup of the device?` | **Everything** | Backup completo del usuario, necesario para detectar artefactos. |
| `Download:` (All / Only non-system / Do not download) | **All** | Incluye APKs del sistema; el spyware suele camuflarse ahí. |
| `Upload to VirusTotal?` (si aparece) | **No** | Subiría tus APKs a internet. Innecesario para el análisis local. |
| `Remove?` (tras descargar APKs) | **No** | Conserva los APKs en la carpeta — MVT los necesita después. |
| Cualquier "RSA fingerprint" en el móvil | Aceptar + "Permitir siempre" | Sin esto, adb no puede leer el dispositivo. |

Formato visual: lista con `kbd`-style chip para la tecla a pulsar y texto explicativo debajo. Reutilizar el componente `NumberedStep` ya existente (número 4 dentro de la secuencia Android, renumerando: Activar dev → Depuración USB → Conectar USB → **Responder prompts** → Descargar lanzador → Buscar ZIP, total 6 sub-pasos).

Espera: el orden lógico es **lanzar lanzador → responder prompts → buscar ZIP**, porque los prompts aparecen *después* de hacer doble clic. Por tanto la inserción correcta es **entre el sub-paso actual de "descarga el lanzador" y el de "busca el ZIP"**, no antes. Lo dejo así: nuevo sub-paso justo después del lanzador, solo si `device === "android"`.

También aviso dentro del propio sub-paso del lanzador (sub-paso 4):
> "En la ventana negra te aparecerán varias preguntas. En el siguiente paso te decimos qué pulsar en cada una."

## Fuera de alcance

- No se tocan los scripts `.ps1`/`.sh` (los prompts los lanza AndroidQF, no nosotros, así que no se pueden automatizar sin perder interactividad).
- No se cambia el parser, ni el endpoint, ni el Paso 4 de subida.
- iOS no se modifica.
