## Problema

AndroidQF falla con `Impossible to find ADB: failed to find a usable adb executable`. Solo genera 3 ficheros básicos en `acquisition/` y MVT acaba reportando 0 alertas sin haber analizado realmente nada. Causa: AndroidQF busca `adb.exe` en su propia carpeta de trabajo, no en el `PATH` del sistema.

## Fix

En `public/scripts/analizar-android.ps1`, justo después de descargar `androidqf.exe` y antes del `Push-Location $acqDir` (alrededor de la línea 70), añadir un bloque que copie `adb.exe` y sus DLLs al lado del binario de AndroidQF:

```powershell
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
```

Tambien mover el `androidqf.exe` descargado a `$acqDir` (en vez de `$outDir`) para que conviva con `adb.exe` en el mismo directorio de trabajo, y actualizar la invocacion para usar la nueva ruta:

```powershell
$aqfExe = Join-Path $acqDir "androidqf.exe"
```

## Alcance

- Solo `public/scripts/analizar-android.ps1`.
- Sin cambios en el `.sh`, en la guia ni en la UI.

## Como probar

1. Volver a lanzar en PowerShell: `irm https://mvt-insight.lovable.app/scripts/analizar-android.ps1 | iex`.
2. AndroidQF debe arrancar sin el error "Impossible to find ADB" y presentar el menu interactivo de modulos.
3. Seleccionar todos los modulos ofrecidos y aceptar los prompts del movil (incluido el de backup).
4. El `.zip` final debe contener una carpeta `acquisition/` con muchos mas ficheros (sms, packages, processes, settings, dumpsys, backup.ab, bugreport.zip, etc.) y MVT producir un analisis real.
