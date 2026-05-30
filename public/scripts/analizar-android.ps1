# Analizador automatico Android con MVT (Windows) - AndroidQF + check-androidqf
# Uso directo:  irm <url>/scripts/analizar-android.ps1 | iex
# Uso local:    .\analizar-android.ps1

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Spyware Forensic Analyzer - Analisis Android"               -ForegroundColor Cyan
Write-Host "  1) AndroidQF realiza la adquisicion forense del dispositivo" -ForegroundColor Cyan
Write-Host "  2) mvt-android check-androidqf analiza la adquisicion"      -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar binarios
foreach ($cmd in @("adb","mvt-android")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "Falta '$cmd'. Ejecuta primero instalar-mvt-windows.ps1 y reabre PowerShell." -ForegroundColor Red
    exit 1
  }
}

# Verificar dispositivo
Write-Host "==> Verificando conexion USB..."
$devices = (adb devices | Select-String -Pattern "\tdevice$").Count
if ($devices -eq 0) {
  Write-Host "No se detecta ningun dispositivo. Activa 'Depuracion USB' y acepta el RSA en el telefono." -ForegroundColor Red
  exit 1
}
Write-Host "Dispositivo detectado." -ForegroundColor Green

# Carpeta de trabajo
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path (Get-Location) "mvt-resultados-android-$timestamp"
$acqDir = Join-Path $outDir "acquisition"
$reportDir = Join-Path $outDir "report"
$zipFile = "$outDir.zip"
New-Item -ItemType Directory -Force -Path $acqDir | Out-Null
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

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
  Write-Host "Fallo descargando AndroidQF: $_" -ForegroundColor Red
  Write-Host "Descarga manual: https://github.com/mvt-project/androidqf/releases/latest" -ForegroundColor Yellow
  exit 1
}

# Ejecutar AndroidQF (interactivo) en la carpeta acquisition
Write-Host ""
Write-Host "==> Lanzando AndroidQF..." -ForegroundColor Cyan
Write-Host "    Es interactivo: responde a sus preguntas en la consola."
Write-Host "    Acepta cualquier prompt que aparezca en el movil."
Write-Host ""
Push-Location $acqDir
try {
  & $aqfExe
} finally {
  Pop-Location
}

# Actualizar IOCs (best-effort) y analizar
Write-Host ""
Write-Host "==> Actualizando indicadores (IOCs)..."
$prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
try { & mvt-android download-iocs 2>&1 | Out-Host } finally { $ErrorActionPreference = $prev }

Write-Host "==> Analizando adquisicion con mvt-android check-androidqf..."
& mvt-android check-androidqf -o $reportDir $acqDir
if ($LASTEXITCODE -ne 0) {
  Write-Host "check-androidqf devolvio exit $LASTEXITCODE (puede haber detecciones; continua empaquetando)." -ForegroundColor Yellow
}

# Empaquetar
Write-Host "==> Comprimiendo resultados..."
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
Compress-Archive -Path "$outDir\*" -DestinationPath $zipFile -Force

Write-Host ""
Write-Host "Listo. Archivo: $zipFile" -ForegroundColor Green
Write-Host "Subelo en la plataforma."

Start-Process "https://mvt-insight.lovable.app/upload"
