## Diagnóstico

El error cambió de `spawn UNKNOWN` a `spawn EBUSY`. Eso indica que ahora el ejecutable sí existe, pero Windows lo tiene ocupado/bloqueado en el momento de ejecutarlo. Las causas más probables son:

- el `.exe` acaba de descargarse y Windows Defender/SmartScreen aún lo está analizando;
- quedó un proceso `androidqf.exe` anterior abierto;
- el archivo se está sobrescribiendo o usando demasiado pronto después de la descarga.

## Plan de cambios

1. **Hacer la ejecución de AndroidQF más robusta** en `desktop/electron/main.cjs`:
   - esperar brevemente después de descargar el binario antes de ejecutarlo;
   - verificar que el archivo se pueda abrir en modo lectura antes de llamar a `spawn`;
   - si `spawn` falla con `EBUSY`, reintentar automáticamente varias veces con pausa entre intentos;
   - mostrar un mensaje más claro si Windows sigue bloqueando el archivo.

2. **Evitar procesos duplicados**:
   - antes de iniciar AndroidQF, intentar cerrar cualquier `androidqf.exe` anterior con `taskkill` en Windows;
   - esto reduce errores cuando el usuario pulsa de nuevo o quedó una ejecución colgada.

3. **Mantener/confirmar el icono del escritorio**:
   - el instalador ya tiene configurado `createDesktopShortcut: true` y `shortcutName: "MvtInsight"` en `desktop/package.json`;
   - no hace falta añadirlo: al instalar el `.exe` debe crear el acceso directo en el escritorio;
   - si no aparece, normalmente es porque Windows no reinstaló la app limpia o el instalador no se regeneró con esa configuración.

4. **Subir versión del desktop**:
   - aumentar `desktop/package.json` de `1.0.7` a `1.0.8`;
   - actualizar `APP_VERSION` en `src/routes/upload.tsx` a `1.0.8`;
   - después tendrás que compilar/publicar un nuevo `MvtInsight-Setup-1.0.8.exe` e instalarlo.

## Resultado esperado

Con la nueva versión, si Windows bloquea temporalmente `androidqf.exe`, la app esperará y reintentará en vez de fallar directamente con `spawn EBUSY`. Además, el instalador seguirá creando el icono/acceso directo de escritorio.