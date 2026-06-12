## Diagnóstico

El error 404 buscando `latest.yml` ocurrió porque el auto-updater de la app consultó la release **mientras GitHub Actions todavía estaba subiendo artefactos**. Acabo de comprobar la release v1.0.31 en GitHub y ahora contiene todos los archivos necesarios:

- `latest.yml` ✓ (Windows)
- `latest-mac.yml` ✓
- `latest-linux.yml` ✓
- `MvtInsight-Setup-1.0.31.exe` ✓
- DMGs y AppImage ✓

Cada plataforma (win/mac/linux) corre en paralelo en el workflow y sube sus artefactos a la misma release de forma incremental. Si el usuario pulsó "Buscar actualizaciones" durante esa ventana (~5-10 min tras el bump), el `latest.yml` aún no existía → 404.

## Acción

**No hace falta cambiar código ni publicar nada nuevo.** La release ya está completa.

El usuario solo necesita:
1. Pulsar de nuevo el botón **"Buscar actualizaciones"** en la app.
2. Debería detectar 1.0.31, descargar el instalador y aplicar la actualización.

## Mejora opcional (NO incluida ahora)

Para evitar que esto se repita en futuras releases, podríamos:
- Cambiar el workflow para que el job de Windows espere a los demás antes de publicar (serializar), **o**
- Que el bump de versión se haga al final del workflow tras confirmar que los 3 builds subieron sus artefactos.

Ambas opciones complican el flujo. La realidad práctica: si el usuario espera ~10 minutos tras un "publica" antes de pulsar "Buscar actualizaciones", el problema desaparece. Lo dejo como mejora futura si lo pides explícitamente.