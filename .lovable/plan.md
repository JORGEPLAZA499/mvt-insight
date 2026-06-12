## Plan

1. **Cambiar la estrategia de `tldextract` en el launcher**
   - Mantener `multiprocessing.freeze_support()`.
   - Crear una carpeta de caché escribible como ya se hizo.
   - Además, configurar `tldextract` para que no dependa de descargar `public_suffix_list.dat` en runtime.
   - La idea es parchear el extractor por defecto antes de importar/ejecutar `mvt.ios.cli`, usando `suffix_list_urls=()` y/o `fallback_to_snapshot=True`, para que use el snapshot incluido en el paquete en vez de intentar escribir/descargar la lista.

2. **Hacer el fix tolerante a versiones distintas de `tldextract`**
   - Implementar el parche dentro de un `try/except` seguro.
   - Si una versión no soporta algún argumento, caer a una configuración compatible sin romper el CLI.
   - Evitar que el warning se convierta en fallo de análisis.

3. **Actualizar documentación del plan local**
   - Ajustar `.lovable/plan.md` para reflejar que el primer fix de carpeta de caché no fue suficiente.
   - Documentar que el segundo fix desactiva la descarga runtime de Public Suffix List y fuerza el fallback embebido.

4. **No cambiar la versión desktop**
   - No tocar `desktop/package.json`.
   - La app puede seguir en `1.0.34`; el cambio vive en el asset descargable `ios-tools-v1`.

5. **Regenerar y probar**
   - Tras aplicar el cambio, el workflow `Build iOS Tools` debería reconstruir `ios-tools-v1`.
   - En Windows: cerrar MvtInsight, matar `mvt-ios.exe` si queda, borrar `C:\Users\TU_USUARIO\Downloads\mvt-insight\ios-tools`, abrir de nuevo y lanzar el análisis iOS.
   - Resultado esperado: no intenta descargar `https://publicsuffix.org/list/public_suffix_list.dat` y el análisis no se rompe por ese error.