# Plan: corregir `mvt-ios.exe` en Windows (`--multiprocessing-fork`)

## Diagnóstico

El error:

```text
Error: No such option: --multiprocessing-fork
```

indica un problema del binario `mvt-ios.exe` empaquetado con PyInstaller en Windows.

`mvt-ios` usa procesos internos. En Windows, esos procesos relanzan el mismo `.exe` con un argumento especial llamado `--multiprocessing-fork`. Como nuestro launcher no llama a `multiprocessing.freeze_support()` antes de arrancar el CLI de MVT, Click interpreta ese argumento como si fuera una opción normal de `mvt-ios` y falla. Por eso aparecen muchas instancias `mvt-ios.exe` y el análisis no avanza.

## Cambio principal

Editar:

```text
.github/workflows/mvt_ios_launcher.py
```

para que quede así:

```python
import multiprocessing

if __name__ == "__main__":
    multiprocessing.freeze_support()

    from mvt.ios.cli import cli
    cli()
```

Esto hace que los procesos worker de Windows se manejen antes de que el CLI procese los argumentos.

## Qué no tocar

- No tocar `desktop/package.json` ni subir versión todavía.
- No revertir los timeouts ni el barrido preventivo de `mvt-ios.exe`; siguen siendo útiles como red de seguridad.
- No cambiar el workflow salvo que sea necesario: ya copia `mvt_ios_launcher.py` y empaqueta el binario.

## Pasos después del cambio

1. Aplicar el fix en `mvt_ios_launcher.py`.
2. Ejecutar el workflow de GitHub **Build iOS Tools** para regenerar los assets de `ios-tools-v1`.
3. En el PC donde ya se descargaron herramientas antiguas, borrar la carpeta cacheada:

```text
C:\Users\TU_USUARIO\Downloads\mvt-insight\ios-tools
```

Así MvtInsight volverá a descargar el `mvt-ios.exe` corregido.

## Resultado esperado

- Desaparece `Error: No such option: --multiprocessing-fork`.
- No se acumulan decenas de `mvt-ios.exe`.
- El análisis iOS puede avanzar a `decrypt-backup` y `check-backup` correctamente.
