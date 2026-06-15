## Diagnóstico

El step "Install libimobiledevice (Windows via imobiledevice-net)" hace:

```powershell
$release = Invoke-RestMethod -Uri "https://api.github.com/repos/libimobiledevice-win32/imobiledevice-net/releases/latest" `
  -Headers @{ "User-Agent" = "GitHubActions" }
```

Sin `Authorization`, esa llamada usa el rate limit anónimo (60 req/h por IP). Los runners `windows-latest` comparten IP con miles de jobs, así que GitHub responde con la página HTML de "Unicorn timeout" / 503. `Invoke-RestMethod` intenta parsearla como JSON y aborta. Los logs muestran exactamente ese HTML (`Unicorn! GitHub`, `body { background-color: #f1f1f1 }`...).

Los jobs de macOS y Linux no se ven afectados porque instalan vía `brew`/`apt`, no vía la API de GitHub.

## Plan

Endurecer el step de Windows con dos cambios mínimos:

### 1. Autenticar la llamada a GitHub API con `GITHUB_TOKEN`

Subir rate limit de 60/h a 5000/h y reducir drásticamente los timeouts:

```powershell
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

```powershell
$headers = @{
  "User-Agent"    = "GitHubActions"
  "Authorization" = "Bearer $env:GH_TOKEN"
  "Accept"        = "application/vnd.github+json"
}
```

### 2. Retry con backoff y validación de respuesta

Envolver `Invoke-RestMethod` en un bucle de hasta 5 intentos con `Start-Sleep` exponencial (5s, 10s, 20s, 40s). Si tras los reintentos la respuesta no parsea como JSON o no trae `assets`, hacer `throw` con mensaje claro (en vez de un stacktrace de parser HTML).

Idéntico tratamiento para `Invoke-WebRequest` del `browser_download_url`.

### 3. (Opcional, defensa en profundidad) Pin a una versión conocida

Añadir una variable `LIBIMOBILEDEVICE_TAG` al inicio del workflow (ej. `v1.3.17`) y, si está seteada, saltar el lookup `releases/latest` y construir la URL directamente. Por defecto vacío → comportamiento actual con `latest`. Esto te da escape hatch para cuando la última release del upstream se rompa.

## Lo que NO se toca

- Steps de macOS / Linux (funcionan).
- `desktop/`.
- Workflow de release de la app desktop.

## Resultado

- El step de Windows soporta rate-limits transitorios sin fallar el job entero.
- Mensaje de error útil si el upstream realmente no tiene asset compatible.
- Posibilidad de pinear a un tag concreto en el futuro sin reescribir el step.
