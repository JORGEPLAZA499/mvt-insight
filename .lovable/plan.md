# Actualizar la app de escritorio (.exe / .dmg / .AppImage) a v1.0.2

## Qué cambia respecto a v1.0.1

De los cambios hechos en esta sesión, casi todos son del web app y NO requieren tocar el desktop:

| Cambio (web) | Afecta al .exe |
|---|---|
| Integración Stripe + paquetes de crédito | No |
| Créditos en tiempo real en el dashboard | No |
| Banner de cookies más lento | No |
| Gate de "sin créditos" en `/upload` | No (pero ver punto 1 abajo) |
| Reordenar subpasos del wizard de subida | No |

Lo que sí toca en el desktop:

1. **URL del backend desactualizada.** El binario instalado en los usuarios sigue abriendo `https://mvt-insight.lovable.app/upload` al terminar el análisis. El dominio real de la plataforma ahora es `https://spyware.rpjsoftware.com`. Hay que actualizarlo en:
   - `desktop/src/App.tsx` (botón "Subir al informe")
   - `desktop/package.json` (`description`, `homepage`, `author.email`)
   - `public/scripts/analizar-android.ps1` (`Start-Process`)
   - `public/scripts/analizar-android.sh` (mensaje final + `open` / `xdg-open`)

2. **Bump de versión** en `desktop/package.json`: `1.0.1` → `1.0.2`. Sin esto `electron-updater` no detecta una nueva release.

3. **Release en GitHub** (`v1.0.2`). El workflow `.github/workflows/release.yml` ya construye y publica `.exe` (Windows), `.dmg` (mac x64 + arm64), `.AppImage` (Linux) y los `latest*.yml` que `electron-updater` necesita.

## Pasos de la actualización

1. Sustituir `https://mvt-insight.lovable.app` → `https://spyware.rpjsoftware.com` en los 4 archivos listados arriba. La cadena `mvt-insight.lovable.app` se mantiene solo en el `email` de autor (lo dejamos o lo cambias tú).
2. Subir `desktop/package.json` versión a `1.0.2`.
3. (Opcional, recomendable) Actualizar las URLs hard-codeadas de los instaladores en `src/routes/upload.tsx` (`RELEASES_BASE_URL`) si quieres que el botón "descargar" del wizard apunte al nombre nuevo `MvtInsight-Setup-1.0.2.exe` automáticamente — actualmente apunta a `1.0.0`. Si lo cambiamos a `latest/download/MvtInsight-Setup.exe`-style sin versión, GitHub no soporta alias sin versión; mejor pasar a la URL "latest release page" sin versión específica, o actualizar el número a `1.0.2`.

## Liberar la release

Una vez aplicados los cambios y mergeado a `main`, crear y subir el tag para disparar GitHub Actions:

```
git tag v1.0.2
git push origin v1.0.2
```

Yo no puedo ejecutar `git tag`/`git push` desde aquí — ese paso lo tienes que lanzar tú localmente (o desde la pestaña Releases de GitHub). El workflow tarda ~5–10 min y publica los binarios + `latest.yml` automáticamente.

Cuando termine, los usuarios con `1.0.1` ya instalada verán el modal "Actualización disponible" la próxima vez que abran la app y se actualizarán solos.

## Preguntas antes de implementar

- ¿Confirmas el cambio de URL a `https://spyware.rpjsoftware.com` (custom domain) o prefieres el subdominio Lovable `https://spyware-rpjsoftware-com.lovable.app`?
- ¿Actualizo también el botón de descarga del wizard web (`src/routes/upload.tsx`) para que apunte a `MvtInsight-Setup-1.0.2.exe`?
- ¿Quieres añadir alguna funcionalidad nueva al desktop (p. ej. mostrar saldo de créditos del usuario antes de empezar el análisis, login, etc.) o solo el refresco de URL + bump de versión?
