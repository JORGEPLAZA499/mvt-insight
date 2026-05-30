## Cambios propuestos

### Problema
El usuario quiere subir un ZIP de resultados MVT que pesa más de 50 MB (generado por AndroidQF, típicamente 100–300 MB). Actualmente la web tiene un límite de 50 MB que lo bloquea.

### Solución
Subir el límite de archivo de 50 MB a 500 MB. El procesado sigue siendo 100% local en el navegador (no se sube a ningún servidor), por lo que no hay implicaciones de seguridad ni de backend.

### Archivo a modificar
- `src/routes/upload.tsx`

### Cambios específicos
1. **Constante `MAX_SIZE`** (línea 31): cambiar de `50 * 1024 * 1024` a `500 * 1024 * 1024`.
2. **Mensaje de error** (línea 431): actualizar el texto de `"supera el límite de 50 MB"` a `"supera el límite de 500 MB"`.
3. **Texto de la UI** (línea 494): actualizar `"máx. 50 MB"` a `"máx. 500 MB"`.

### Resultado esperado
La pantalla de upload aceptará archivos de hasta 500 MB, suficiente para acquisitions completas de AndroidQF.