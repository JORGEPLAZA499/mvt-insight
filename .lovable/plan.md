## Lanzador de "doble clic" + copia al portapapeles mejorada

Hacer que el paso 3 (StepRun) ofrezca **dos caminos** claros y con cero escritura:

1. **Botón principal — "Descargar y ejecutar"**: descarga un script lanzador adaptado al SO. El usuario hace doble clic en el archivo descargado y se abre la terminal automáticamente ejecutando el comando.
2. **Botón secundario — "Copiar comando"**: comportamiento actual mejorado, con feedback visual y atajo "¿Cómo abro la terminal?".

### Comportamiento por sistema operativo

**Windows (.bat)** — experiencia perfecta:
- Descarga `analizar-android.bat`. Doble clic abre CMD y ejecuta directamente `powershell -Command "irm ... | iex"`. No requiere permisos extra.

**macOS (.command)** — un paso extra menor:
- Descarga `analizar-android.command` o `analizar-ios.command`. Doble clic abre Terminal.app y ejecuta el script.
- Limitación del navegador: archivos descargados no llegan con el bit ejecutable. Mostrar nota visible: *"Si sale 'permiso denegado', abre Terminal y pega: `chmod +x ~/Downloads/analizar-*.command` (una sola vez)"*.
- Alternativa más limpia: el `.command` contiene una línea que se auto-otorga el permiso vía AppleScript en su primera ejecución — pero requiere ejecutarlo igual. Mantenemos la instrucción simple.

**Linux (.sh)** — fragmentado por distro:
- Descargar `.sh` no abre terminal al hacer doble clic en la mayoría de entornos (Nautilus lo trata como texto). Por eso en Linux **dejamos "Copiar comando" como acción principal** y el script `.sh` como secundario (útil para usuarios avanzados que ya saben `bash archivo.sh`).

### Cambios técnicos

**`src/routes/upload.tsx`** (StepRun):
- Detectar SO ya existe. Añadir función `buildLauncherScript(device, os)` que genera el contenido del script lanzador como string.
- Añadir `downloadLauncher()` que crea un `Blob` con el contenido, fuerza descarga vía `<a download>` con nombre apropiado (`.bat`/`.command`/`.sh`).
- Reordenar UI:
  - **Acción principal (Windows/Mac)**: card grande "Descargar lanzador" con icono de descarga, texto "Doble clic en el archivo descargado → la terminal se abre sola".
  - **Acción principal (Linux)**: el actual `CopyCommand`.
  - **Acción secundaria**: la opción no-principal en formato más discreto (toggle "prefiero copiar el comando" / "prefiero descargar el script").
- En macOS añadir un disclosure con la nota de `chmod +x` (oculta por defecto, "Si sale permiso denegado").

**Contenido de los lanzadores** (generados en cliente, sin tocar backend):

Windows `.bat`:
```bat
@echo off
title Análisis forense - Spyware Insight
echo Iniciando analisis...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://mvt-insight.lovable.app/api/public/scripts/analizar-android.ps1 | iex"
pause
```

macOS `.command` (Android):
```bash
#!/bin/bash
echo "Iniciando análisis forense…"
curl -fsSL https://mvt-insight.lovable.app/api/public/scripts/analizar-android.sh | bash
echo ""
echo "Pulsa Enter para cerrar esta ventana."
read
```

Mismo patrón para iOS con `analizar-ios.sh`.

Linux `.sh`: igual que macOS pero sin el `read` final (opcional).

**Sin cambios**:
- Rutas, navegación, componentes de pasos 1/2/4, lógica de análisis, backend, `/api/public/scripts/*` existentes (los lanzadores los consumen).
- `CopyCommand` se sigue usando para la vía secundaria.

### Resultado para el usuario

- **Mac**: ve un botón gigante "⬇ Descargar analizar-android.command" → descarga → doble clic → Terminal abierta ejecutando. (Si es la primera vez y falla por permisos, ve la instrucción de `chmod`.)
- **Windows**: ve "⬇ Descargar analizar-android.bat" → descarga → doble clic → CMD abierta. Cero fricción.
- **Linux**: ve el comando para copiar como antes, con la opción "descargar .sh" debajo.