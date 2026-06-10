## Bump versión desktop a v1.0.25

**Objetivo:** Publicar una nueva release de la app de escritorio con todos los cambios acumulados.

**Cambio único:**
- `desktop/package.json`: bump de `"version"` de `"1.0.24"` → `"1.0.25"`

**Qué pasa después:**
- El push automático a `main` dispara el workflow `.github/workflows/release.yml`
- Se crea el tag `v1.0.25`
- GitHub Actions compila y publica installers para Windows (NSIS), macOS (DMG) y Linux (AppImage)

No se toca código funcional; solo se incrementa el número de versión para agrupar los ~20 commits pendientes en una sola release.