## Diagnóstico

El "spinner" que mencionas sí está escrito en `public/scripts/analizar-android.ps1` (líneas 94-116) como un `Start-Job` de PowerShell que cada 15 s imprime cuántos ficheros lleva AndroidQF. **Pero no se ve en vivo**: en PowerShell, los `Start-Job` corren aislados y su salida queda en un buffer interno hasta que se llama a `Receive-Job`, lo cual ocurre **al final** (línea 127), cuando AndroidQF ya terminó. Por eso la pantalla se ve congelada durante 5-15 min en "Collecting information on installed apps…".

Añadir un spinner *encima* de la misma ventana tampoco vale, porque AndroidQF es interactivo (te hace preguntas, dibuja menús con cursor) y cualquier escritura paralela rompería su TUI.

## Solución: segunda ventana "Estado del análisis"

Abrir una **segunda ventana de terminal** dedicada solo al spinner mientras la principal sigue siendo interactiva para AndroidQF/MVT. Esa ventana muestra:

- Spinner animado (`| / - \`) que gira cada 200 ms → señal visual inequívoca de "no está colgado".
- Contador `hh:mm:ss` desde que empezó.
- Nº de ficheros y MB acumulados en `acquisition/`.
- Última fase detectada (bugreport, dumpsys, logs, packages, etc.).
- Aviso grande: "NO CIERRES ESTA VENTANA".

Cuando AndroidQF termina, el script principal mata el proceso de la segunda ventana y continúa.

## Cambios por sistema

### 1. `public/scripts/analizar-android.ps1` (Windows)

- Borrar el bloque `Start-Job`/`Receive-Job` actual (líneas 93-116, 126-129).
- Antes de `& $aqfExe`, lanzar la segunda ventana:
  ```
  $statusScript = Join-Path $outDir "_status.ps1"
  # escribir el mini-script de spinner (template abajo)
  $statusProc = Start-Process -PassThru powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File",$statusScript,$acqDir
  ```
- Mini-script `_status.ps1` (escrito en runtime):
  ```powershell
  param($watchDir)
  $Host.UI.RawUI.WindowTitle = "Estado del analisis MVT - NO CERRAR"
  $frames = '|','/','-','\'
  $i = 0; $start = Get-Date
  while ($true) {
    $e = (Get-Date) - $start
    $files = @(Get-ChildItem $watchDir -Recurse -File -EA SilentlyContinue)
    $mb = if ($files) { [math]::Round((($files|Measure-Object Length -Sum).Sum/1MB),1) } else { 0 }
    Clear-Host
    Write-Host ""
    Write-Host "  $($frames[$i % 4])  Analizando movil... NO CIERRES esta ventana" -ForegroundColor Cyan
    Write-Host ""
    Write-Host ("     Tiempo:    {0:D2}:{1:D2}:{2:D2}" -f [int]$e.TotalHours, $e.Minutes, $e.Seconds)
    Write-Host  "     Ficheros:  $($files.Count)"
    Write-Host  "     Tamano:    $mb MB"
    Write-Host ""
    Write-Host "  Responde a las preguntas en la OTRA ventana." -ForegroundColor Yellow
    $i++; Start-Sleep -Milliseconds 250
  }
  ```
- Tras `& $aqfExe` (en el `finally`), matar el proceso: `Stop-Process -Id $statusProc.Id -Force -EA SilentlyContinue`.
- Justo antes de `Push-Location $acqDir`, banner en la ventana principal:
  > "Se acaba de abrir otra ventana titulada 'Estado del análisis'. NO LA CIERRES. Si esta ventana parece parada, mira la otra."

### 2. `public/scripts/analizar-ios.sh` (macOS)

- Crear `_status.sh` en `$OUTDIR` con un bucle equivalente (spinner ASCII, `du -sh` del backup, contador `SECONDS`).
- Abrir segunda ventana con `osascript`:
  ```bash
  osascript -e "tell app \"Terminal\" to do script \"bash '$OUTDIR/_status.sh' '$ACQ_DIR'\""
  ```
- Guardar el PID del bucle dentro del propio `_status.sh` en un fichero `_status.pid`. Al terminar MVT, `kill $(cat $OUTDIR/_status.pid)` y `osascript` para cerrar la ventana.
- Banner equivalente antes de lanzar MVT.

### 3. `public/scripts/analizar-android.sh` (Linux)

- Mismo `_status.sh` pero abrirlo con el primer terminal disponible:
  ```bash
  for term in x-terminal-emulator gnome-terminal konsole xterm; do
    command -v $term >/dev/null && { $term -e bash "$OUTDIR/_status.sh" "$ACQ_DIR" & break; }
  done
  ```
- Si no hay terminal gráfico (servidor SSH), fallback: imprimir el heartbeat a `stderr` cada 30 s en background (no rompe tanto la TUI de AndroidQF como stdout).

## Fuera de alcance

- No se toca el front (`upload.tsx`, Paso 3/4), ni el parser, ni el endpoint `/api/public/scripts/$file`.
- No se cambia el flujo interactivo de AndroidQF.
- No se añaden dependencias externas.

## Riesgos

- En macOS, si el usuario tiene desactivado el control de Terminal por AppleScript, `osascript` puede pedir permiso la primera vez. Si falla, el script principal sigue funcionando sin ventana de estado (caída elegante).
- En Linux sin entorno gráfico no habrá segunda ventana — fallback a stderr.
