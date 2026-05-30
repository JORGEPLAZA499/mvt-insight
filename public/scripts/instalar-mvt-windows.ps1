# Instalador automático de MVT (Mobile Verification Toolkit) para Windows
# Uso directo (PowerShell):  irm <url>/scripts/instalar-mvt-windows.ps1 | iex
# Uso local:                .\instalar-mvt-windows.ps1

$ErrorActionPreference = "Stop"
# PowerShell 7+: evita que warnings escritos a stderr por procesos nativos
# (como pip) se conviertan en errores terminantes.
$PSNativeCommandUseErrorActionPreference = $false

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
  Write-Host "winget no esta disponible. Actualiza Windows 10/11 e instala 'App Installer' desde Microsoft Store." -ForegroundColor Red
  exit 1
}

# 2. Python + Android Platform Tools
Write-Host "==> Instalando Python y Android Platform Tools..."
winget install --silent --accept-source-agreements --accept-package-agreements Python.Python.3.11
winget install --silent --accept-source-agreements --accept-package-agreements Google.PlatformTools

# Refrescar PATH para esta sesion
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 3. MVT (pip emite warnings por stderr; los toleramos)
Write-Host "==> Instalando mvt via pip..."
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  python -m pip install --upgrade pip 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) { throw "pip upgrade fallo (exit $LASTEXITCODE)" }

  python -m pip install --user mvt 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) { throw "Instalacion de mvt fallo (exit $LASTEXITCODE)" }
} finally {
  $ErrorActionPreference = $prevPref
}

# 4. Anadir la carpeta Scripts de pip --user al PATH (sesion + persistente)
Write-Host "==> Configurando PATH para mvt..."
$scriptsDir = $null
try {
  $scriptsDir = (python -c "import sysconfig,os; p=sysconfig.get_path('scripts', os.name+'_user'); print(p)" 2>$null).Trim()
} catch {}
if ([string]::IsNullOrWhiteSpace($scriptsDir) -or -not (Test-Path $scriptsDir)) {
  # Fallback: <user-base>\Python311\Scripts
  try {
    $userBase = (python -m site --user-base 2>$null).Trim()
    if ($userBase) {
      $candidate = Join-Path $userBase "Python311\Scripts"
      if (Test-Path $candidate) { $scriptsDir = $candidate }
    }
  } catch {}
}

if ($scriptsDir -and (Test-Path $scriptsDir)) {
  # Sesion actual
  if (-not ($env:Path.Split(';') -contains $scriptsDir)) {
    $env:Path = "$env:Path;$scriptsDir"
  }
  # Persistir en PATH del usuario
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $userPath) { $userPath = "" }
  if (-not ($userPath.Split(';') -contains $scriptsDir)) {
    $newUserPath = if ($userPath.TrimEnd(';')) { "$($userPath.TrimEnd(';'));$scriptsDir" } else { $scriptsDir }
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    Write-Host "    Anadido a PATH (usuario): $scriptsDir" -ForegroundColor Green
  } else {
    Write-Host "    Ya estaba en PATH: $scriptsDir" -ForegroundColor DarkGray
  }
} else {
  Write-Host "    No se pudo localizar la carpeta Scripts de pip --user." -ForegroundColor Yellow
}

# 5. Verificacion
Write-Host ""
Write-Host "==> Verificando instalacion..."
try { adb version | Select-Object -First 1 } catch { Write-Host "adb no encontrado (reinicia PowerShell)" -ForegroundColor Yellow }

$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  & mvt-android version 2>&1 | Select-Object -First 1
  & mvt-ios version 2>&1 | Select-Object -First 1
} finally {
  $ErrorActionPreference = $prevPref
}

Write-Host ""
Write-Host "Listo. Cierra y reabre PowerShell, luego ya puedes ejecutar:" -ForegroundColor Green
Write-Host "   mvt-android  (para Android)"
Write-Host "   mvt-ios      (para iOS)"
