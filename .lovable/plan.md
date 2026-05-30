## Problema

`Compress-Archive` falla silenciosamente (o tira un warning) porque `run.log` está bloqueado por `Start-Transcript`, que está activo mientras el script comprime. Resultado: no aparece el `.zip`.

## Fix

En `public/scripts/analizar-android.ps1`, justo antes del bloque "Comprimiendo resultados" (línea 112), parar la transcripción para liberar `run.log`:

```powershell
# Cerrar el log para que no este bloqueado al comprimir
try { Stop-Transcript | Out-Null } catch {}

# Empaquetar (siempre, aunque solo contenga el log)
Write-Host "==> Comprimiendo resultados..."
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
Compress-Archive -Path "$outDir\*" -DestinationPath $zipFile -Force
```

Y dejar el `Stop-Transcript` en el bloque `finally` envuelto en try/catch (ya lo está) para que no falle si ya se detuvo.

## Alcance

- Solo `public/scripts/analizar-android.ps1`.
- Sin cambios en el `.sh`, en la guía ni en la UI.
