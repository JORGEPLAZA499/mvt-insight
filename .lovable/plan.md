## Problema

El botón de descarga apunta a:
`https://github.com/.../releases/latest/download/MvtInsight-Setup-1.0.3.exe`

Pero el release actual es `v1.0.6` y el archivo publicado es `MvtInsight-Setup-1.0.6.exe`. Por eso GitHub devuelve 404.

En `src/routes/upload.tsx` (líneas 402, 413, 424) hay tres enlaces hardcodeados con `1.0.3`:
- `MvtInsight-Setup-1.0.3.exe` (Windows)
- `MvtInsight-1.0.3-arm64.dmg` (macOS)
- `MvtInsight-1.0.3.AppImage` (Linux)

## Solución

Definir una constante `APP_VERSION = "1.0.6"` en el mismo archivo y usar interpolación en los tres enlaces:

```ts
const APP_VERSION = "1.0.6";
// ...
href={`${RELEASES_BASE_URL}/MvtInsight-Setup-${APP_VERSION}.exe`}
href={`${RELEASES_BASE_URL}/MvtInsight-${APP_VERSION}-arm64.dmg`}
href={`${RELEASES_BASE_URL}/MvtInsight-${APP_VERSION}.AppImage`}
```

Así futuras actualizaciones solo requieren cambiar una línea.

## Nota

Solo está publicado el `.exe` de Windows en v1.0.6. Los enlaces de macOS (.dmg) y Linux (.AppImage) seguirán dando 404 hasta que publiques builds para esas plataformas. ¿Quieres que oculte temporalmente esos botones, o los dejamos visibles?
