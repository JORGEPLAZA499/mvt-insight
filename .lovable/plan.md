## Objetivo

Reemplazar el `.zip` de Windows por un **instalador `.exe`** real. El cliente descarga un único archivo, hace doble clic, y el instalador se encarga de descomprimir, copiar a `Program Files`, crear acceso directo en el escritorio y menú Inicio, y registrar el desinstalador. Igual para macOS (`.dmg`) y Linux (`.AppImage`).

## Cómo se hará

Cambiar el workflow de GitHub Actions (`.github/workflows/release.yml`) para usar **`electron-builder`** en lugar de `@electron/packager`. `electron-builder` sí puede generar instaladores nativos cuando corre en runners de GitHub (Windows, macOS, Linux reales), cosa que no podíamos hacer en el sandbox de Lovable.

### Cambios concretos

1. **`package.json`**
   - Añadir `electron-builder` como devDependency.
   - Añadir bloque `"build": { ... }` con la configuración de electron-builder:
     - `appId`: `com.jorgeplaza.mvtinsight`
     - `productName`: `MvtInsight`
     - `win`: target `nsis` (instalador `.exe` clásico de Windows con asistente Siguiente → Siguiente → Instalar)
     - `mac`: target `dmg`
     - `linux`: target `AppImage` (un solo archivo ejecutable, sin descomprimir)
     - `nsis`: `oneClick: false`, `allowToChangeInstallationDirectory: true`, `createDesktopShortcut: true`, `createStartMenuShortcut: true`

2. **`.github/workflows/release.yml`**
   - Sustituir los pasos de `@electron/packager` + `zip/tar` por `npx electron-builder --win` / `--mac` / `--linux`.
   - Subir al release los artefactos generados:
     - `MvtInsight-Setup-x.x.x.exe` (Windows)
     - `MvtInsight-x.x.x.dmg` (macOS)
     - `MvtInsight-x.x.x.AppImage` (Linux)

3. **`src/routes/upload.tsx`**
   - Actualizar las URLs de descarga de los tres botones a los nuevos nombres de archivo (`.exe`, `.dmg`, `.AppImage`).

### Experiencia del cliente final

- **Windows**: descarga `MvtInsight-Setup.exe` → doble clic → asistente de instalación → app instalada con acceso directo en escritorio. Windows SmartScreen mostrará un aviso "Editor desconocido" (normal sin certificado de firma de código, que cuesta ~200-400€/año); el usuario pulsa "Más información → Ejecutar de todos modos".
- **macOS**: descarga `.dmg` → doble clic → arrastra app a Applications. Igualmente Gatekeeper avisará sin firma de Apple Developer (~99€/año).
- **Linux**: descarga `.AppImage` → marca como ejecutable → doble clic. No requiere instalación.

### Después del cambio

Hay que volver a lanzar el workflow "Build & Release Desktop App" desde Actions (como la última vez) para generar los nuevos instaladores. Los `.zip` antiguos quedarán reemplazados en el release "latest".

## Nota sobre firma de código

Los instaladores funcionarán perfectamente pero **sin firma digital**, por lo que Windows/macOS mostrarán advertencias de seguridad la primera vez. Firmar requiere certificados de pago. ¿Quieres que lo dejemos así de momento, o prefieres que documente cómo añadir firma más adelante?
