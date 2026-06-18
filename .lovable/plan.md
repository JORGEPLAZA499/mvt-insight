## Publicar nueva versión de escritorio (v1.0.44) con el fix de ADB

El error "Impossible to initialize ADB: failed to use the adb executable: exit status 1" que aparece en la app instalada del usuario ya está corregido en el código (`desktop/electron/main.cjs` → `ensureAdb()` descarga las platform-tools oficiales de Google la primera vez). Pero la app del usuario sigue mostrando el error porque su instalación es una versión anterior. Para que el fix llegue a su PC, hay que publicar una release nueva.

## Cambios

1. **`desktop/package.json`** → bumpear `version` de `1.0.43` a `1.0.44` (un único bump que agrupa el fix de `ensureAdb()` + las claves i18n `preparingAdb` añadidas en español e inglés).

No se toca nada más: el fix ya está en `main.cjs` y los locales ya tienen la traducción.

## Qué pasa después del bump

- Al hacer push a `main`, GitHub Actions construye los instaladores (Windows NSIS, macOS DMG, Linux AppImage) y crea la GitHub Release `v1.0.44` con `electron-builder --publish always`.
- La app instalada del usuario, a los ~30 segundos de arrancar, consulta `electron-updater` contra el repo `JORGEPLAZA499/mvt-insight`, detecta la nueva versión y muestra el diálogo "Actualización disponible".
- Tras instalar `v1.0.44`, la primera vez que el usuario pulse "Android", la nueva fase `preparingAdb` descargará ~13 MB de platform-tools de Google y dejará `adb.exe` (+ DLLs en Windows) dentro de la carpeta de trabajo. El error ya no debería volver a aparecer.

## Notas

- Regla de memoria respetada: solo se bumpea cuando el usuario dice explícitamente "publica / saca versión" — lo acaba de pedir, así que un único bump agrupa todos los cambios pendientes.
- No se necesita ningún cambio en el flujo de iPhone: el problema de la captura es Android, e iOS ya tiene su propio mecanismo (`ios-tools.cjs`) que descarga libimobiledevice + mvt-ios de la release `ios-tools-v1` y no depende de ADB.
- Hay que esperar a que GitHub Actions termine de publicar los assets (Windows suele ser el más lento, ~5–10 min) antes de que el auto-updater del usuario detecte la versión.
