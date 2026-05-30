# Servir los scripts de instalación de forma fiable

## Problema

`irm https://<preview>.lovableproject.com/scripts/instalar-mvt-windows.ps1 | iex` devuelve el `index.html` del SPA en vez del script. PowerShell intenta ejecutar HTML y falla con docenas de `ParserError`. Lo mismo le pasaría a `curl … | bash` en Mac/Linux (ejecutaría HTML como shell).

La raíz es que el preview de Lovable no sirve `public/scripts/*` de forma fiable como estáticos: el router cae al fallback SPA y responde `index.html` con `200 OK` + `Content-Type: text/html`.

## Solución

Servir los scripts como **server routes** bajo `src/routes/api/public/scripts/` para garantizar:

- Contenido correcto (el texto literal del script).
- `Content-Type` adecuado (`text/x-shellscript` / `text/plain` para .sh, `text/plain` para .ps1).
- Header `X-Content-Type-Options: nosniff` para que `irm`/`curl` no malinterpreten.
- Funcionamiento idéntico en preview, sandbox y producción.

### Implementación

1. **Crear una sola ruta dinámica** `src/routes/api/public/scripts/$file.ts` que:
   - Importa los 6 scripts como texto bruto usando `?raw` de Vite:
     ```ts
     import macInstall from "../../../../../public/scripts/instalar-mvt-macos.sh?raw";
     // ...etc
     ```
   - Mapea `params.file` → contenido + content-type:
     - `.sh` → `text/x-shellscript; charset=utf-8`
     - `.ps1` → `text/plain; charset=utf-8`
   - Devuelve 404 si el nombre no está en la lista permitida (whitelist).
   - Cabeceras: `Cache-Control: no-store` (para que cambios se reflejen al instante) y `X-Content-Type-Options: nosniff`.

2. **Actualizar `src/routes/guia.tsx`** — cambiar las URLs en `installCmd` y `analyzeCmd` de:
   - `${base}/scripts/instalar-mvt-macos.sh`
   
   a:
   - `${base}/api/public/scripts/instalar-mvt-macos.sh`

   Y lo mismo para los enlaces de descarga manual del bloque `<details>`.

3. **Mantener `public/scripts/*` como fallback** — los archivos siguen ahí, no se eliminan. Solo cambia la URL canónica.

### Por qué `/api/public/*`

Es el prefijo recomendado en este template para endpoints públicos que no requieren auth ni firma. Bypasea la autenticación en sitios publicados y no necesita validación porque solo devuelve archivos de texto inmutables del propio repo.

### Verificación

Después del cambio:
1. Abrir en navegador `https://<preview>/api/public/scripts/instalar-mvt-windows.ps1` y comprobar que descarga el `.ps1` literal, no HTML.
2. Probar `irm <url> | iex` desde PowerShell (idealmente el usuario lo confirma).
3. Confirmar que `curl -fsSL <url>/api/public/scripts/instalar-mvt-macos.sh | head -5` muestra `#!/usr/bin/env bash`.

## Archivos afectados

- **Nuevo:** `src/routes/api/public/scripts/$file.ts`
- **Editar:** `src/routes/guia.tsx` (URLs en `installCmd`, `analyzeCmd` y fallback de descarga)

## Lo que NO cambia

- Contenido de los scripts en `public/scripts/` (se siguen leyendo desde ahí vía `?raw`).
- Resto de la guía, parser, upload, etc.
