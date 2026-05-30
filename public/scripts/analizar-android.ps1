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

  # Descargar AndroidQF (ultima release)
  Write-Host "==> Descargando AndroidQF (ultima release)..."
  $aqfExe = Join-Path $outDir "androidqf.exe"
  try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/mvt-project/androidqf/releases/latest" -UseBasicParsing
    $asset = $release.assets | Where-Object { $_.name -like "*windows_amd64*.exe" } | Select-Object -First 1
    if (-not $asset) { throw "No se encontro asset windows_amd64 en la release." }
    Write-Host "    $($asset.name)"
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $aqfExe -UseBasicParsing
  } catch {
    throw "Fallo descargando AndroidQF: $_`nDescarga manual: https://github.com/mvt-project/androidqf/releases/latest"
  }

  # Ejecutar AndroidQF (interactivo) en la carpeta acquisition
  Write-Host ""
  Write-Host "==> Lanzando AndroidQF..." -ForegroundColor Cyan
  Write-Host "    Es interactivo: responde a sus preguntas en la consola."
  Write-Host "    Acepta cualquier prompt que aparezca en el movil."
  Write-Host ""
  $prevEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  Push-Location $acqDir
  try {
    & $aqfExe
    $aqfExit = $LASTEXITCODE
  } finally {
    Pop-Location
    $ErrorActionPreference = $prevEAP
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
