# Botones de descarga dinámicos

## Problema
`src/routes/upload.tsx` tiene `APP_VERSION = "1.0.9"` hardcoded. Cuando se publique `v1.0.14`, los enlaces apuntarán a archivos `1.0.9` inexistentes → 404.

## Solución
Obtener la versión del último release desde la API pública de GitHub al cargar la página, y construir los enlaces dinámicamente. Sin tocar lógica de negocio.

## Cambios en `src/routes/upload.tsx`

1. **Eliminar** la constante `APP_VERSION = "1.0.9"`.
2. **Añadir un `useState<string | null>(null)`** para `latestVersion`.
3. **Añadir un `useEffect`** que haga `fetch("https://api.github.com/repos/JORGEPLAZA499/mvt-insight/releases/latest")`, lea `tag_name` (formato `v1.0.14`), le quite la `v` y guarde la versión.
4. **Modificar los 3 botones de descarga** (Windows/macOS/Linux):
   - Mientras `latestVersion` sea `null` → botón deshabilitado con texto "Cargando…".
   - Cuando se obtenga → enlaces normales usando `latestVersion`.
5. **Fallback**: si el `fetch` falla (rate-limit, sin red), usar `RELEASES_PAGE_URL` (página `/releases/latest`) como destino del botón, para que el usuario siempre pueda llegar al instalador correcto.

## Resultado
- Bumpeás `desktop/package.json` → push a `main` → GitHub Actions tagguea, compila y publica → la web automáticamente sirve los enlaces de la nueva versión sin redeploy.
- Cero mantenimiento manual de versión en el frontend.
