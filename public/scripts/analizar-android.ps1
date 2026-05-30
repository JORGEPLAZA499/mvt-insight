# Analizador automático Android con MVT (Windows)
# Uso: .\analizar-android.ps1
$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = "mvt-resultados-android-$timestamp"
$zipFile = "$outDir.zip"

Write-Host "==> Análisis Android con MVT" -ForegroundColor Cyan

foreach ($cmd in @("adb","mvt-android")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Falta '$cmd'. Ejecuta primero instalar-mvt-windows.ps1" -ForegroundColor Red
    exit 1
  }
}

Write-Host "==> Verificando conexión USB..."
$devices = (adb devices | Select-String -Pattern "\tdevice$").Count
if ($devices -eq 0) {
  Write-Host "❌ No se detecta ningún dispositivo. Activa 'Depuración USB' y acepta el RSA." -ForegroundColor Red
  exit 1
}
Write-Host "✅ Dispositivo detectado." -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Write-Host "==> Ejecutando mvt-android check-adb (puede tardar varios minutos)..."
mvt-android check-adb -o $outDir

Write-Host "==> Comprimiendo resultados..."
Compress-Archive -Path "$outDir\*" -DestinationPath $zipFile -Force

Write-Host ""
Write-Host "✅ Listo. Archivo: $((Get-Location).Path)\$zipFile" -ForegroundColor Green
Write-Host "👉 Súbelo en la plataforma."

Start-Process "https://id-preview--9a02aa66-84b2-4251-8832-d9d10e4c30cb.lovable.app/upload"
