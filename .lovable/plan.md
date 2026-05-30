## Objetivo

Que la próxima ejecución de `analizar-android.ps1` muestre señales de vida mientras AndroidQF trabaja, sin romper su modo interactivo (sigue pidiendo respuestas al usuario por consola).

> Nota: esta mejora **no afecta la sesión actual** que ya está corriendo. Aplica a la próxima vez que el usuario ejecute el comando `irm ... | iex`.

## Qué se añade

1. **Heartbeat en background cada 15 segundos** mientras corre AndroidQF, imprimiendo en la misma consola:
   - Tiempo transcurrido desde que arrancó AndroidQF (`mm:ss`).
   - Nº de ficheros generados hasta ahora en `acquisition/`.
   - Tamaño acumulado de `acquisition/` en MB.
   - Último fichero modificado (pista de "en qué está trabajando").
   
   Ejemplo de línea:
   ```
   [heartbeat 04:30] acquisition: 312 ficheros, 18.4 MB - ultimo: packages/com.whatsapp.json
   ```

2. **Detección de fase por nombre de fichero/carpeta** (best-effort). Cuando aparezcan carpetas conocidas (`packages/`, `processes`, `services`, `settings`, `dumpsys`, `bugreport`, `logs`), el heartbeat añade una etiqueta:
   ```
   [heartbeat 06:10] fase: bugreport | 540 ficheros, 42.1 MB
   ```

3. **Resumen al terminar AndroidQF**: tiempo total, ficheros, tamaño. Ya existe parcialmente; se amplía con el tiempo.

4. **Limpieza garantizada**: el job de heartbeat se detiene con `Stop-Job`/`Remove-Job` en un `finally`, incluso si AndroidQF falla o el usuario lo cancela.

## Por qué no usar `Write-Progress`

`Write-Progress` ocupa una línea superior reservada y se mezcla mal con la salida interactiva de AndroidQF (menús, prompts), pudiendo tapar las preguntas. Un heartbeat por `Write-Host` cada 15s es menos intrusivo y mantiene el log legible.

## Detalle técnico

- Implementar como `Start-Job -ScriptBlock { ... }` que recibe `$acqDir` y `$startTime` por `-ArgumentList`.
- Bucle `while ($true) { Start-Sleep 15; <print> }` dentro del job.
- En el bloque principal: arrancar el job **justo antes** de `& $aqfExe`, guardarlo en `$hbJob`.
- En el `finally` del `Push-Location`: `Stop-Job $hbJob; Receive-Job $hbJob | Out-Host; Remove-Job $hbJob`.
- Las líneas del heartbeat se imprimen vía `Receive-Job` periódicamente — alternativa más simple: el job escribe a un fichero temporal y un `Register-ObjectEvent` no es necesario; basta con `Receive-Job` cada vez que se recoja, pero como AndroidQF bloquea el hilo principal, **mejor opción**: el job usa `[Console]::WriteLine(...)` directamente, que sí aparece en tiempo real en la misma consola.

## Archivos a modificar

- `public/scripts/analizar-android.ps1` — único fichero a tocar. Cambios localizados en la sección "Ejecutar AndroidQF" (líneas ~93-105 aprox.).

## Lo que **no** cambia

- La interactividad de AndroidQF (sigue pidiendo input al usuario).
- El flujo posterior (download-iocs, check-androidqf, compresión, apertura del navegador).
- La estructura de carpetas ni el nombre del zip de salida.

## Verificación

Como el script corre en Windows del usuario, no se puede ejecutar aquí. Verificación al desplegar:
- Revisar sintaxis PowerShell con `pwsh -NoProfile -Command "& { . ./public/scripts/analizar-android.ps1 -WhatIf }"` no aplica (script no parametrizado), así que se valida visualmente que el bloque `Start-Job` / `Stop-Job` esté bien cerrado y que el `finally` libere el job.
