## Problema

El step **"Bundle mvt-ios with PyInstaller (unix)"** falla en los 3 jobs Unix (macOS arm64, macOS x64, Linux). PyInstaller necesita un archivo `.py` como script, pero el workflow le pasa:

1. Primero: la salida de `python -c "import mvt.ios.cli, os; print(...)"` — que devuelve la ruta a `__init__.py` de `mvt.ios.cli`, **pero ese módulo en mvt moderno no expone `cli` en `__init__.py`** → error `'Group' object has no attribute '__file__'`.
2. Fallback: `-c "import mvt.ios.cli; mvt.ios.cli.cli()"` — pero `-c` en PyInstaller espera **un archivo**, no código inline → error `Script file 'import mvt.ios.cli; ...' does not exist`.

El step de Windows ya lo hace bien: crea un `mvt_ios_launcher.py` con el contenido del launcher y se lo pasa a PyInstaller. Hay que replicar exactamente eso en Unix.

## Cambio

En `.github/workflows/build-ios-tools.yml`, reemplazar el step **"Bundle mvt-ios with PyInstaller (unix)"** por:

```yaml
- name: Bundle mvt-ios with PyInstaller (unix)
  if: matrix.os != 'windows-latest'
  run: |
    cat > mvt_ios_launcher.py <<'PY'
    from mvt.ios.cli import cli
    if __name__ == "__main__":
        cli()
    PY
    pyinstaller --onefile --name mvt-ios \
      --collect-all mvt \
      --hidden-import iOSbackup \
      mvt_ios_launcher.py
    cp dist/mvt-ios staging/bin/
```

Sin cambios en código de la app de escritorio ni en el resto del workflow.

## Siguiente paso

Después de aplicar el fix, vuelves a lanzar manualmente el workflow **"Build iOS Tools"** desde la pestaña Actions de GitHub (mismo procedimiento que te indiqué antes). Los 4 jobs deberían completarse y publicar los binarios en la release `ios-tools-v1`.
