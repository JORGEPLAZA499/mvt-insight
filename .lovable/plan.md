## Publicar nueva versión de la app de escritorio

1. Bump de `desktop/package.json` → `version: "1.0.28"` a `"1.0.29"` (un solo bump agrupa todos los cambios pendientes, según la regla del proyecto).
2. El push al repo dispara `.github/workflows/release.yml`, que compila Windows / macOS / Linux y publica los instaladores en la release de GitHub.
3. `electron-updater` detectará la nueva versión en los clientes ya instalados y ofrecerá la actualización automática.

### Notas
- No se toca `.github/workflows/build-ios-tools.yml` (release independiente con tag `ios-tools-v1`).
- Si prefieres saltar a `1.1.0` (cambio menor) en lugar de patch, dímelo antes de implementar.

Confirma para cambiar a build mode y aplicar.
