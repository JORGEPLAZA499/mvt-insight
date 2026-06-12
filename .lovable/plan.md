## Objetivo
Eliminar la causa más probable del error persistente: la app puede estar reutilizando un `mvt-ios.exe` antiguo porque solo comprueba que los binarios existan, no si el asset `ios-tools-v1` fue actualizado.

## Plan
1. **Versionar internamente las herramientas iOS**
   - Añadir una constante tipo `IOS_TOOLS_BUILD_ID` en `desktop/electron/ios-tools.cjs`.
   - Guardar ese ID en un archivo local dentro de `~/Downloads/mvt-insight/ios-tools/` cuando la descarga/extracción termina correctamente.

2. **Forzar redescarga cuando cambie el build de herramientas**
   - Cambiar `ensureIosTools()` para que no acepte “ya están instaladas” si el build ID local no coincide.
   - Si no coincide, borrar la carpeta `ios-tools` y descargar de nuevo el ZIP/TAR del release `ios-tools-v1`.
   - Esto evita tener que pedir al usuario que borre la caché manualmente.

3. **Endurecer el entorno de ejecución de `mvt-ios` desde Electron**
   - En `toolEnv()`, fijar `TLDEXTRACT_CACHE` y `XDG_CACHE_HOME` a una ruta controlada y existente bajo el directorio de trabajo de MvtInsight.
   - Así, incluso si alguna ruta interna ignora parte del monkey-patch, no intentará usar una ruta corta/rota tipo `C:\Users\GAMING~1\A...`.

4. **Añadir una prueba rápida del binario tras descargar**
   - Después de extraer, ejecutar una comprobación liviana de `mvt-ios` (`--help` o equivalente) con ese entorno.
   - Si falla, mostrar un error claro indicando que el asset de herramientas iOS no quedó válido.

5. **Corregir el workflow si hace falta**
   - Revisar que `Build iOS Tools` realmente se dispare cuando cambien `mvt_ios_launcher.py` / `build-ios-tools.yml`.
   - Si el filtro actual impide el rebuild por mezclar `tags` y `paths`, ajustar el trigger para que el workflow pueda correrse manualmente y también por cambios relevantes.

6. **Sin bump automático de versión desktop**
   - No tocar `desktop/package.json` salvo que explícitamente quieras publicar una nueva versión de la app.
   - Si quieres que la redescarga automática llegue a usuarios ya instalados, entonces sí hará falta después publicar una nueva versión desktop, porque el cambio de caché vive en Electron.