# MVT Insight Desktop

App de escritorio (Electron + React) que reemplaza al lanzador `.ps1` / `.sh` con una interfaz visual: botones, barras de progreso y respuestas automáticas a las preguntas de AndroidQF.

## Estructura

```
desktop/
├── electron/
│   ├── main.cjs      Proceso principal (ventana + spawn de AndroidQF/MVT)
│   └── preload.cjs   Bridge seguro contexto-aislado entre Node y React
├── src/
│   ├── main.tsx      Entry React
│   ├── App.tsx       3 pantallas: bienvenida, ejecución, listo
│   └── styles.css    Tema oscuro (mismo lenguaje visual que la web)
├── index.html
├── vite.config.ts    base: './' (obligatorio para Electron)
└── package.json
```

## Desarrollo local

```bash
cd desktop
npm install
npm run electron:dev    # compila la UI con Vite y abre Electron
```

> **Windows PowerShell 5.1** (el que trae Windows por defecto) NO soporta `&&`.
> Ejecuta los comandos en líneas separadas, o usa `;`, o instala PowerShell 7
> (`https://aka.ms/PSWindows`) que sí acepta `&&` y `||` como bash.
>
> ```powershell
> # ❌ No funciona en PowerShell 5.1
> npm install && npm run package:win
>
> # ✅ Alternativas válidas
> npm install; npm run package:win
> npm install; if ($?) { npm run package:win }   # equivalente a &&
> ```

## Empaquetado

```bash
npm run package:win     # → desktop/release/MvtInsight-win32-x64/
npm run package:mac     # → desktop/release/MvtInsight-darwin-x64/
npm run package:linux   # → desktop/release/MvtInsight-linux-x64/
```

Comprime cada carpeta resultante (`.zip` o `.tar.gz`) y súbela como
release en GitHub. La web (`/upload`) ya enlaza a estas URLs:

- `https://mvt-insight.lovable.app/downloads/MvtInsight-windows-x64.zip`
- `https://mvt-insight.lovable.app/downloads/MvtInsight-macos-x64.zip`
- `https://mvt-insight.lovable.app/downloads/MvtInsight-linux-x64.tar.gz`

> **Nota:** este sandbox no puede generar instaladores `.exe`/`.dmg`
> firmados. Para producción habría que usar GitHub Actions (con runners
> de cada SO) más un certificado de firma de código.

## Cómo funciona el flujo Android

1. Descarga el binario oficial **AndroidQF** desde el release de GitHub
   (`mvt-project/androidqf`) a `~/Downloads/mvt-insight/`.
2. Lo ejecuta con `child_process.spawn` y captura su `stdout`.
3. Cuando AndroidQF imprime una pregunta (`Would you like to take a backup?`,
   `Download: ...`, `Upload to VirusTotal?`, `Remove?`), el proceso escribe
   automáticamente las respuestas óptimas en `stdin`:
   - **Everything** (backup completo)
   - **All** (incluye APKs del sistema)
   - **No** (no VirusTotal)
   - **No** (conservar APKs)
4. Las líneas `Failed to pull log file` aparecen solo en el panel
   colapsable "Ver detalles técnicos", no asustan al usuario.
5. Al terminar, busca el ZIP más reciente en la carpeta y lo muestra junto
   con dos botones: **Subir al informe** (abre el navegador) y **Abrir carpeta**.

## Pendiente (Fase 2)

- Flujo iOS completo en macOS (libimobiledevice + MVT).
- Detección automática de adb instalado vs. descarga de platform-tools.
- Auto-actualización con `electron-updater`.
- Firma de código y notarización para evitar avisos de SmartScreen/Gatekeeper.
