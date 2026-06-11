## Plan: Publicar nueva versión de escritorio (1.0.27)

### Contexto
La app de escritorio MVT Insight está en versión **1.0.26**. Desde la última release se han integrado cambios importantes, incluyendo la corrección de una vulnerabilidad crítica de escalación de privilegios. El usuario confirmó que quiere sacar una nueva versión.

### Qué se va a hacer

1. **Bump de versión** en `desktop/package.json`:
   - Cambiar `"version": "1.0.26"` → `"version": "1.0.27"`

2. **Commit del cambio** a la rama `main`.

3. **GitHub Actions se encarga del resto** automáticamente:
   - El workflow `.github/workflows/release.yml` detecta el cambio en `desktop/package.json`
   - Crea el tag `v1.0.27`
   - Compila y publica los instaladores para **Windows** (NSIS), **macOS** (DMG x64/ARM64) y **Linux** (AppImage)
   - Sube todo a GitHub Releases

### Nota técnica
- No se toca el `package.json` de la web app, solo el del escritorio.
- Los usuarios con auto-actualizador recibirán la notificación de nueva versión al abrir la app.