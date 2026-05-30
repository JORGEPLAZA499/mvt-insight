# Instalador automático de MVT (Mobile Verification Toolkit) para Windows
# Uso directo (PowerShell):  irm <url>/scripts/instalar-mvt-windows.ps1 | iex
# Uso local:                .\instalar-mvt-windows.ps1

$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Spyware Forensic Analyzer - Instalador MVT (Windows)"      -ForegroundColor Cyan
Write-Host "  Se instalara (via winget + pip): Python 3.11,"               -ForegroundColor Cyan
Write-Host "  Google Platform Tools (adb) y mvt."                          -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
$answer = Read-Host "Continuar? [s/N]"
if ($answer -notmatch '^(s|si|y|yes)$') { Write-Host "Cancelado."; exit 0 }
Write-Host ""


# 1. winget
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "❌ winget no está disponible. Actualiza Windows 10/11 e instala 'App Installer' desde Microsoft Store." -ForegroundColor Red
  exit 1
}

# 2. Python + Android Platform Tools
Write-Host "==> Instalando Python y Android Platform Tools..."
winget install --silent --accept-source-agreements --accept-package-agreements Python.Python.3.11
winget install --silent --accept-source-agreements --accept-package-agreements Google.PlatformTools

# Refrescar PATH para esta sesión
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 3. MVT
Write-Host "==> Instalando mvt vía pip..."
python -m pip install --upgrade pip
python -m pip install --user mvt

# 4. Verificación
Write-Host ""
Write-Host "==> Verificando instalación..."
try { adb version } catch { Write-Host "adb no encontrado en PATH (reinicia PowerShell)" -ForegroundColor Yellow }
try { mvt-android version } catch {}
try { mvt-ios version } catch {}

Write-Host ""
Write-Host "✅ Listo. Cierra y reabre PowerShell, luego ejecuta:" -ForegroundColor Green
Write-Host "   .\analizar-android.ps1    # para Android"
Write-Host "   .\analizar-ios.ps1        # para iOS"
