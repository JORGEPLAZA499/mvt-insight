## Cambio de runner macOS Intel en workflow de GitHub Actions

**Objetivo:** Resolver la cola infinita del job `darwin-x64` en el workflow `build-ios-tools.yml` sustituyendo el runner obsoleto/saturado `macos-13` por el nuevo runner oficial `macos-15-intel`.

**Cambio técnico:**
- Archivo: `.github/workflows/build-ios-tools.yml`
- Línea 37: `os: macos-13` → `os: macos-15-intel`

**Motivación:**
- `macos-13` está saturado o siendo retirado por GitHub → jobs se quedan horas esperando runner.
- `macos-15-intel` es el reemplazo gratuito oficial para builds Intel (x64) en macOS.
- El resto del job (Homebrew x86_64, PyInstaller, empaquetado) funciona igual sin modificaciones.

**Impacto:**
- El job `darwin-x64` pasará de quedarse atascado en cola a ejecutarse en minutos.
- Las releases seguirán publicando `ios-tools-darwin-x64.tar.gz` como antes.