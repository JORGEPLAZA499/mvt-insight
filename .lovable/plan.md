## Problema

El build de Windows falla:
```
image D:\a\mvt-insight\mvt-insight\desktop\build-resources\icon.ico must be at least 256x256
```

El `icon.ico` que generé antes solo incluye hasta 256x256 pero al parecer falta ese tamaño exacto (o el mayor es menor). electron-builder exige que el .ico contenga una imagen ≥256×256.

## Plan

1. Regenerar `desktop/build-resources/icon.ico` desde `icon.png` (escudo) asegurando que incluya un frame de **256×256** (y opcionalmente tamaños menores 16, 32, 48, 64, 128).
2. Bumpear `desktop/package.json` de `1.0.53` → `1.0.54` para disparar una nueva release en GitHub Actions.

No se tocan otros archivos.
