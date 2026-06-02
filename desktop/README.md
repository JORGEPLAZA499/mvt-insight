# MVT Insight Desktop

App de escritorio (Electron + React) con auto-actualización obligatoria desde GitHub Releases.

## Estructura

```
desktop/
├── electron/
│   ├── main.cjs              Proceso principal + flujo de auto-update
│   ├── preload.cjs           Bridge React ↔ Node
│   ├── updater.html          UI del modal de actualización
│   └── preload-updater.cjs   Bridge del modal de actualización
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── styles.css
├── index.html
├── vite.config.ts
└── package.json
```

## Desarrollo local

```bash
cd desktop
npm install
npm run electron:dev    # En dev se salta el chequeo de updates
```

## Publicar una nueva versión

1. Sube `version` en `desktop/package.json` (ej. `1.0.2`).
2. Commit y crea el tag correspondiente:
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```
3. GitHub Actions construye los instaladores (Windows / macOS / Linux) y publica
   automáticamente el Release con los archivos `.exe`, `.dmg`, `.AppImage` **y**
   los metadatos `latest.yml`, `latest-mac.yml`, `latest-linux.yml` que
   `electron-updater` necesita.
4. La próxima vez que cada usuario abra su app instalada, verá el modal
   bloqueante "Actualización disponible" y deberá pulsar **Actualizar ahora**
   para continuar.

> El owner/repo se detecta automáticamente del remoto de Git durante el build
> en GitHub Actions, no hay que configurarlo en `package.json`.

## Flujo de auto-actualización

1. Al abrir la app (solo en builds empaquetados, no en dev), se muestra un
   modal "Buscando actualizaciones…" antes de cargar la UI principal.
2. Si hay versión nueva → modal bloqueante con un único botón "Actualizar
   ahora". No se puede cerrar, minimizar ni saltar.
3. Al pulsarlo se descarga el instalador con barra de progreso, luego se
   instala y la app se reinicia sola en la versión nueva.
4. Si no hay versión nueva → arranca la app normal.
5. Si falla la consulta (sin internet) → opción de Reintentar o Continuar
   sin actualizar (única excepción al bloqueo).

## Notas

- **Sin firma de código**: Windows SmartScreen mostrará un aviso la primera
  vez que el usuario instala. Las auto-actualizaciones siguientes funcionan
  igual. Para producción se recomienda firmar el `.exe` (no incluido).
- **Primera actualización**: solo los usuarios que ya tengan instalada una
  versión con `electron-updater` (≥ 1.0.1) recibirán updates automáticos.
  Usuarios con versiones previas deben descargar el nuevo instalador
  manualmente la primera vez.
