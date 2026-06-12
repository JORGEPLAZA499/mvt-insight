## Objetivo

Evitar que `mvt-ios.exe` falle o ensucie la salida con:

```text
Failed fetching 'https://publicsuffix.org/list/public_suffix_list.dat'. Reason: [Errno 2] No such file or directory: 'C:\\Users\\GAMING~1\\A…'
```

## Diagnóstico

El mensaje viene de `tldextract`, una dependencia usada durante el análisis de dominios. Al ejecutarse dentro del binario empaquetado con PyInstaller en Windows, intenta crear/usar una caché para descargar la Public Suffix List y falla con una ruta temporal o de perfil no válida.

Esto no requiere cambiar la app desktop ni subir versión todavía: el arreglo debe ir en el launcher Python que se empaqueta como `mvt-ios.exe` y luego regenerar los assets de `ios-tools-v1`.

## Cambios propuestos

1. Editar `.github/workflows/mvt_ios_launcher.py` para inicializar un entorno seguro antes de arrancar el CLI de MVT:
   - Mantener `multiprocessing.freeze_support()` para no romper el fix anterior de `--multiprocessing-fork`.
   - Crear una carpeta de caché persistente y escribible para MVT/tldextract, preferentemente en `%LOCALAPPDATA%\\MvtInsight\\mvt-ios-cache` en Windows.
   - Definir variables de entorno de caché (`TLDEXTRACT_CACHE`, `XDG_CACHE_HOME`) antes de importar `mvt.ios.cli`.

2. Hacer que el launcher cree la carpeta si no existe y siga funcionando en macOS/Linux usando una ruta equivalente bajo el home/cache del usuario.

3. No modificar `desktop/package.json` ni bumpear `1.0.34`, porque el cambio vive en el asset descargable `ios-tools-v1`.

4. Actualizar `.lovable/plan.md` para documentar este segundo fix del binario iOS.

## Validación

1. Disparar el workflow `Build iOS Tools` para reconstruir y republicar `ios-tools-win-x64.zip` en `ios-tools-v1`.
2. En el PC del usuario, cerrar MvtInsight, matar procesos `mvt-ios.exe` si quedan y borrar:

```text
C:\Users\TU_USUARIO\Downloads\mvt-insight\ios-tools
```

3. Abrir MvtInsight y lanzar de nuevo el análisis iOS para confirmar que desaparece el error de `public_suffix_list.dat`.

## Notas

- La versión desktop puede seguir siendo `1.0.34`.
- Solo sería necesario sacar `1.0.35` si queremos publicar un nuevo instalador desktop, no para este arreglo del binario descargable.