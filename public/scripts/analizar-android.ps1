# Analizador automatico Android con MVT (Windows) - AndroidQF + check-androidqf
# Uso directo:  irm <url>/scripts/analizar-android.ps1 | iex
# Uso local:    .\analizar-android.ps1

$PSNativeCommandUseErrorActionPreference = $false

# Carpeta de trabajo (creada YA para poder escribir el log desde el principio)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path (Get-Location) "mvt-resultados-android-$timestamp"
$acqDir = Join-Path $outDir "acquisition"
$reportDir = Join-Path $outDir "report"
$zipFile = "$outDir.zip"
$logFile = Join-Path $outDir "run.log"
New-Item -ItemType Directory -Force -Path $acqDir | Out-Null
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

# Iniciar transcripcion (todo lo que se imprima queda tambien en run.log)
try { Start-Transcript -Path $logFile -Append | Out-Null } catch {}

try {
  $ErrorActionPreference = "Stop"

  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host "  Spyware Forensic Analyzer - Analisis Android"               -ForegroundColor Cyan
  Write-Host "  1) AndroidQF realiza la adquisicion forense del dispositivo" -ForegroundColor Cyan
  Write-Host "  2) mvt-android check-androidqf analiza la adquisicion"      -ForegroundColor Cyan
  Write-Host "============================================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Carpeta de trabajo: $outDir"
  Write-Host "Log:                $logFile"
  Write-Host ""

  # Verificar binarios
  foreach ($cmd in @("adb","mvt-android")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
      throw "Falta '$cmd'. Ejecuta primero instalar-mvt-windows.ps1 y reabre PowerShell."
    }
  }

  # Verificar dispositivo + estado
  Write-Host "==> Verificando conexion USB..."
  $adbOut = (adb devices) -join "`n"
  Write-Host $adbOut
  $deviceLines = $adbOut -split "`n" | Where-Object { $_ -match "\t(device|unauthorized|offline)$" }
  if (-not $deviceLines) {
    throw "No se detecta ningun dispositivo. Activa 'Depuracion USB' y conecta el cable de datos."
  }
  $bad = $deviceLines | Where-Object { $_ -match "\t(unauthorized|offline)$" }
  if ($bad) {
    throw "El dispositivo aparece como 'unauthorized' u 'offline'. Desbloquea el movil, acepta el RSA (Permitir siempre) y vuelve a lanzar el comando."
  }
  Write-Host "Dispositivo autorizado." -ForegroundColor Green

  # Descargar AndroidQF (ultima release) directamente en acquisition/
  Write-Host "==> Descargando AndroidQF (ultima release)..."
  $aqfExe = Join-Path $acqDir "androidqf.exe"
  try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/mvt-project/androidqf/releases/latest" -UseBasicParsing
    $asset = $release.assets | Where-Object { $_.name -like "*windows_amd64*.exe" } | Select-Object -First 1
    if (-not $asset) { throw "No se encontro asset windows_amd64 en la release." }
    Write-Host "    $($asset.name)"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $aqfExe -UseBasicParsing
  } catch {
    throw "Fallo descargando AndroidQF: $_`nDescarga manual: https://github.com/mvt-project/androidqf/releases/latest"
  }

  # AndroidQF busca adb.exe en su carpeta de trabajo, no en el PATH.
  # Copiamos adb.exe y sus DLLs junto al ejecutable para que lo encuentre.
  Write-Host "==> Copiando adb.exe junto a AndroidQF..."
  try {
    $adbPath = (Get-Command adb).Source
    $adbDir  = Split-Path $adbPath
    Copy-Item $adbPath -Destination $acqDir -Force
    foreach ($dll in @("AdbWinApi.dll","AdbWinUsbApi.dll")) {
      $dllPath = Join-Path $adbDir $dll
      if (Test-Path $dllPath) { Copy-Item $dllPath -Destination $acqDir -Force }
    }
    Write-Host "    adb.exe copiado desde $adbDir"
  } catch {
    Write-Host "AVISO: no se pudo copiar adb.exe ($_). AndroidQF puede fallar." -ForegroundColor Yellow
  }

  # Ejecutar AndroidQF (interactivo) en la carpeta acquisition
  Write-Host ""
  Write-Host "==> Lanzando AndroidQF..." -ForegroundColor Cyan
  Write-Host "    Es interactivo: responde a sus preguntas en la consola."
  Write-Host "    Acepta cualquier prompt que aparezca en el movil."
  Write-Host ""
  Write-Host "============================================================" -ForegroundColor Yellow
  Write-Host "  Se va a abrir OTRA ventana titulada 'Estado del analisis'" -ForegroundColor Yellow
  Write-Host "  NO LA CIERRES. Te muestra que el proceso sigue trabajando." -ForegroundColor Yellow
  Write-Host "  Si esta ventana parece parada (sobre todo en 'Collecting"   -ForegroundColor Yellow
  Write-Host "  information on installed apps'), mira la otra ventana."     -ForegroundColor Yellow
  Write-Host "============================================================" -ForegroundColor Yellow
  Write-Host ""

  # Escribir el mini-script de estado y lanzarlo en una ventana aparte
  $statusScript = Join-Path $outDir "_status.ps1"
  $statusBody = @'
param($watchDir)
$Host.UI.RawUI.WindowTitle = "Estado del analisis MVT - NO CERRAR"
$frames = '|','/','-','\'
$phaseHints = @('bugreport','dumpsys','logs','settings','services','processes','packages','backup')
$i = 0
$start = Get-Date
while ($true) {
  $e = (Get-Date) - $start
  $files = @(Get-ChildItem -Path $watchDir -Recurse -File -ErrorAction SilentlyContinue)
  $count = $files.Count
  $mb = if ($count -gt 0) { [math]::Round((($files | Measure-Object Length -Sum).Sum / 1MB), 1) } else { 0 }
  $last = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  $lastName = if ($last) { $last.FullName.Substring($watchDir.Length).TrimStart('\','/') } else { '(aun nada)' }
  $phase = '(arrancando)'
  foreach ($p in $phaseHints) { if ($lastName -match $p) { $phase = $p; break } }
  Clear-Host
  Write-Host ''
  Write-Host ("  {0}  Analizando movil... NO CIERRES esta ventana" -f $frames[$i % 4]) -ForegroundColor Cyan
  Write-Host ''
  Write-Host ('     Tiempo:    {0:D2}:{1:D2}:{2:D2}' -f [int]$e.TotalHours, $e.Minutes, $e.Seconds)
  Write-Host ('     Ficheros:  {0}' -f $count)
  Write-Host ('     Tamano:    {0} MB' -f $mb)
  Write-Host ('     Fase:      {0}' -f $phase)
  Write-Host ('     Ultimo:    {0}' -f $lastName) -ForegroundColor DarkGray
  Write-Host ''
  Write-Host '  Responde a las preguntas en la OTRA ventana.' -ForegroundColor Yellow
  Write-Host '  Esto puede tardar 5-15 minutos. Es NORMAL.' -ForegroundColor Yellow
  $i++
  Start-Sleep -Milliseconds 250
}
'@
  Set-Content -Path $statusScript -Value $statusBody -Encoding UTF8

  $statusProc = $null
  try {
    $statusProc = Start-Process -PassThru powershell -ArgumentList @(
      "-NoProfile","-ExecutionPolicy","Bypass","-File",$statusScript,$acqDir
    )
  } catch {
    Write-Host "AVISO: no se pudo abrir la ventana de estado ($_). Continuo sin ella." -ForegroundColor Yellow
  }

  $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $aqfStart = Get-Date

  Push-Location $acqDir
  try {
    & $aqfExe
    $aqfExit = $LASTEXITCODE
  } finally {
    Pop-Location
    $ErrorActionPreference = $prevEAP
    if ($statusProc) {
      try { Stop-Process -Id $statusProc.Id -Force -ErrorAction SilentlyContinue } catch {}
    }
    Remove-Item $statusScript -Force -ErrorAction SilentlyContinue
    $aqfElapsed = (Get-Date) - $aqfStart
    Write-Host ("AndroidQF tiempo total: {0:D2}:{1:D2}" -f [int]$aqfElapsed.TotalMinutes, $aqfElapsed.Seconds) -ForegroundColor Cyan
  }

  $acqFiles = @(Get-ChildItem -Path $acqDir -Recurse -File -ErrorAction SilentlyContinue)
  Write-Host ""
  Write-Host "AndroidQF exit code: $aqfExit ; ficheros en acquisition/: $($acqFiles.Count)"
  if ($acqFiles.Count -eq 0) {
    Write-Host "AVISO: AndroidQF no genero ficheros. Posibles causas:" -ForegroundColor Yellow
    Write-Host "  - Saliste del menu sin elegir modulos." -ForegroundColor Yellow
    Write-Host "  - El movil quedo bloqueado o se rechazo un permiso." -ForegroundColor Yellow
    Write-Host "  - El RSA caduco o el cable se desconecto." -ForegroundColor Yellow
    Write-Host "Revisa run.log y vuelve a lanzar el comando." -ForegroundColor Yellow
  }

  # IOCs (best-effort) y analisis solo si hay algo que analizar
  if ($acqFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "==> Actualizando indicadores (IOCs)..."
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    try { & mvt-android download-iocs 2>&1 | Out-Host } finally { $ErrorActionPreference = $prev }

    Write-Host "==> Analizando adquisicion con mvt-android check-androidqf..."
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    try { & mvt-android check-androidqf -o $reportDir $acqDir 2>&1 | Out-Host } finally { $ErrorActionPreference = $prev }
    if ($LASTEXITCODE -ne 0) {
      Write-Host "check-androidqf devolvio exit $LASTEXITCODE (puede haber detecciones; continua empaquetando)." -ForegroundColor Yellow
    }
  } else {
    Write-Host "Saltando mvt-android check-androidqf porque no hay adquisicion." -ForegroundColor Yellow
  }

  # Cerrar el log para liberar run.log antes de comprimir
  try { Stop-Transcript | Out-Null } catch {}

  # Empaquetar (siempre, aunque solo contenga el log)
  Write-Host "==> Comprimiendo resultados..."
  if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
  Compress-Archive -Path "$outDir\*" -DestinationPath $zipFile -Force

  Write-Host ""
  Write-Host "Listo. Archivo: $zipFile" -ForegroundColor Green
  Write-Host "Log completo:    $logFile"
  Write-Host "Subelo en la plataforma."

  Start-Process "https://mvt-insight.lovable.app/upload"
}
catch {
  Write-Host ""
  Write-Host "ERROR: $_" -ForegroundColor Red
  Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
  Write-Host ""
  Write-Host "Detalle completo en: $logFile" -ForegroundColor Yellow
}
finally {
  try { Stop-Transcript | Out-Null } catch {}
  Write-Host ""
  Read-Host "Pulsa Enter para cerrar esta ventana"
}
