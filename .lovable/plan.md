# Arreglar error `spawn UNKNOWN` en MVT Insight Desktop

## Causa raíz

En `desktop/electron/main.cjs` las URLs de AndroidQF apuntan a nombres de archivo que **ya no existen** en el repo `mvt-project/androidqf`. En la release actual (v1.8.3) los assets cambiaron de nombre:

| URL actual (rota → 404) | Asset real en v1.8.3 |
|---|---|
| `androidqf_windows_amd64.exe` | `androidqf_windows_amd64_1.8.3_unsigned.exe` |
| `androidqf_linux_amd64` | `androidqf_linux_amd64_1.8.3` |
| `androidqf_darwin_amd64` | `androidqf_macos_universal_1.8.3_signed` |

Verificado con `curl -I`: la URL de Windows devuelve **HTTP 404**.

Qué pasa en tu PC:
1. La app descargó un HTML de "404 Not Found" y lo guardó como `androidqf.exe` (~1 KB).
2. `fs.existsSync(binPath)` ve que el archivo existe y **salta** la re-descarga en intentos siguientes.
3. Al hacer `spawn("androidqf.exe")`, Windows no reconoce el formato y lanza `spawn UNKNOWN`.

## Cambios

### 1. `desktop/electron/main.cjs`

- **Reemplazar las URLs hardcoded** por una resolución dinámica vía API de GitHub (`/repos/mvt-project/androidqf/releases/latest`), filtrando por plataforma (`windows_amd64*.exe`, `linux_amd64` que no contenga `arm`, `macos_universal*`). Así sobreviviremos a futuros renombrados.
- **Validar la descarga**: comprobar `content-length` y status 200; si el archivo final pesa menos de, p. ej., 1 MB (el .exe real pesa ~12 MB), borrarlo y fallar con un error claro.
- **Reparar caché corrupto**: antes de usar el `binPath` cacheado, comprobar tamaño mínimo; si no cumple, borrarlo y volver a descargar.
- **Mejorar mensaje de error**: cuando `spawn` falle, mostrar el path del binario y sugerir borrar `~/Downloads/mvt-insight/androidqf*`.

### 2. Subir versión y publicar nuevo `.exe`

- Bump de `desktop/package.json` a `1.0.7`.
- Actualizar `APP_VERSION` en `src/routes/upload.tsx` a `1.0.7`.
- Disparar el workflow `.github/workflows/release.yml` para publicar `MvtInsight-Setup-1.0.7.exe`.
- Los usuarios que ya tengan 1.0.6 instalado recibirán la actualización automáticamente vía `electron-updater`.

### 3. Limpieza manual recomendada al usuario

Antes de probar la 1.0.7, borrar el binario corrupto cacheado:
```
C:\Users\GAMING F15\Downloads\mvt-insight\androidqf.exe
```
(la app lo re-descargará bien con las URLs nuevas).

## Detalles técnicos

Función `download()` actual: solo sigue 1 redirect y no valida el cuerpo. Se reescribirá para:
- Seguir hasta N=5 redirects.
- Rechazar si status ≠ 200 tras redirects.
- Verificar `content-length >= 1_000_000` (o tamaño real del stream) y borrar el archivo si la validación falla.

Resolución de asset:
```js
async function resolveAndroidqfUrl() {
  const rel = await fetchJson("https://api.github.com/repos/mvt-project/androidqf/releases/latest");
  const platform = process.platform;
  const match = rel.assets.find(a => {
    if (platform === "win32") return /windows_amd64.*\.exe$/.test(a.name);
    if (platform === "linux") return /linux_amd64(?!.*arm)/.test(a.name);
    if (platform === "darwin") return /macos|darwin/.test(a.name);
  });
  if (!match) throw new Error(`No AndroidQF asset for ${platform}`);
  return match.browser_download_url;
}
```

## No se toca

- UI de React (`desktop/src/App.tsx`).
- Flujo del updater (`electron-updater`).
- Backend / web app (excepto el bump de versión en `upload.tsx`).
