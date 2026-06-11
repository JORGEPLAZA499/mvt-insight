# Fix definitivo del workflow Build iOS Tools

## Causa probable

El workflow genera `mvt_ios_launcher.py` con heredocs incrustados dentro de un bloque YAML `run: |`. Ambos here-docs (bash y PowerShell) están rotos por la indentación:

- **Unix (`<<'PY'`)**: bash NO elimina la indentación. El archivo `.py` generado queda con 10 espacios al principio de cada línea → `IndentationError: unexpected indent` antes de que PyInstaller llegue a importar nada.
- **Windows (`@'...'@`)**: el cierre `'@` debe estar al inicio absoluto de línea, sin espacios. Aquí va indentado dentro del YAML, así que PowerShell falla al parsear el here-string o produce un archivo con indentación inválida.

Es decir, el "fix con launcher .py" anterior no se aplicó realmente: ambos jobs siguen fallando antes incluso de ejecutar PyInstaller.

## Solución

Dejar de generar el launcher en línea y **commitearlo como archivo real** en el repo. Es 4 líneas, no necesita lógica del workflow.

### Cambios

1. **Nuevo archivo** `.github/workflows/mvt_ios_launcher.py`:
   ```python
   from mvt.ios.cli import cli
   if __name__ == "__main__":
       cli()
   ```

2. **Editar** `.github/workflows/build-ios-tools.yml`:
   - Step "Bundle mvt-ios with PyInstaller (unix)" → eliminar el heredoc, copiar el launcher y llamar a PyInstaller:
     ```yaml
     run: |
       cp .github/workflows/mvt_ios_launcher.py .
       pyinstaller --onefile --name mvt-ios \
         --collect-all mvt \
         --hidden-import iOSbackup \
         mvt_ios_launcher.py
       cp dist/mvt-ios staging/bin/
     ```
   - Step "Bundle mvt-ios with PyInstaller (windows)" → equivalente en pwsh:
     ```yaml
     run: |
       Copy-Item .github/workflows/mvt_ios_launcher.py .
       pyinstaller --onefile --name mvt-ios --collect-all mvt --hidden-import iOSbackup mvt_ios_launcher.py
       Copy-Item dist/mvt-ios.exe staging/bin/ -Force
     ```

Con esto el contenido del .py es idéntico byte a byte en las 4 plataformas y no depende de cómo YAML/bash/pwsh interpretan la indentación.

## Después de aplicar

Volver a lanzar manualmente **"Build iOS Tools"** desde la pestaña Actions en GitHub. Si vuelve a fallar, necesito que me pegues las últimas ~40 líneas del log del step que rompa — sin eso estoy adivinando la causa.
