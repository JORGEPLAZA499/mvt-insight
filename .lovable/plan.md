# Compilar el .exe en tu PC vía GitHub

## Resumen

No hay cambios de código que hacer. El proyecto ya tiene la carpeta `desktop/` con todo listo (Electron + Vite + scripts de packaging). Solo falta sacarlo de Lovable, ponerlo en tu PC y correr 3 comandos.

## Paso 1 — Requisitos en tu Windows

Instala antes de seguir (si no los tienes):

- **Node.js LTS** (incluye npm): https://nodejs.org/
- **Git**: https://git-scm.com/download/win

Verifica en PowerShell:

```
node --version
npm --version
git --version
```

## Paso 2 — Conectar el proyecto Lovable a GitHub

En la barra superior de Lovable, arriba a la derecha:

1. Clic en el botón **GitHub** → **Connect to GitHub**.
2. Autoriza la app de Lovable en tu cuenta GitHub.
3. Elige crear un repo nuevo (ej: `mvt-insight`) en tu usuario u organización.
4. Lovable hace push automático del código actual.

Cuando termine, tendrás una URL tipo `https://github.com/TU-USUARIO/mvt-insight`.

## Paso 3 — Clonar en tu PC

Abre PowerShell en una carpeta donde quieras el código (ej: `C:\Users\GAMING F15\Documents`):

```
cd C:\Users\GAMING F15\Documents
git clone https://github.com/TU-USUARIO/mvt-insight.git
cd mvt-insight\desktop
```

Nota: usa **backslash** `\` en Windows, no `/`. Y fíjate que ahora estás dentro de `mvt-insight\desktop`, no en el Escritorio.

## Paso 4 — Instalar y empaquetar

```
npm install
npm run package:win
```

Si tu PowerShell es viejo (5.1) y quieres encadenar, usa `;` no `&&`:

```
npm install; if ($?) { npm run package:win }
```

El proceso descarga Electron (~150 MB la primera vez, paciencia).

## Paso 5 — Recoger el binario

Al terminar, el .exe está en:

```
mvt-insight\desktop\release\MvtInsight-win32-x64\MvtInsight.exe
```

Doble clic para abrir. La primera vez Windows SmartScreen avisará ("Windows protegió tu PC") porque no está firmado — clic en **Más información → Ejecutar de todas formas**.

## Para distribuir a otros usuarios

Comprime toda la carpeta `MvtInsight-win32-x64\` en un .zip y súbela donde quieras (Google Drive, GitHub Releases, tu servidor). El usuario final descomprime y ejecuta el `.exe` directamente — no necesita instalar Node ni nada.

## Actualizaciones futuras

Cuando yo cambie código en Lovable, GitHub se sincroniza automáticamente. Tú en tu PC solo haces:

```
cd mvt-insight
git pull
cd desktop
npm install
npm run package:win
```

## Notas técnicas

- El sandbox de Lovable no puede firmar binarios con certificado de código (eso requiere certificado de pago + máquina Windows real). Por eso compilas tú.
- Para `.dmg` de macOS necesitarás una Mac (cross-compile desde Windows no firma para Apple).
- Para Linux, mismo flujo pero `npm run package:linux`.

## Próximo paso del plan

Cuando confirmes este plan y termines el Paso 2 (GitHub conectado), avísame con la URL del repo. Si algo falla en el `npm install` o el `package:win`, pega el error y lo arreglamos juntos.
