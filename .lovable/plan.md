# Simplificación de la guía: instalación de 1 línea

## Objetivo

Reducir la experiencia del usuario a **abrir la Terminal y pegar 2 comandos**. Eliminar la descarga manual de archivos, `chmod`, navegación por carpetas, etc.

## Cambios

### 1. Scripts (`public/scripts/`)
Revisar los 6 scripts existentes para que sean seguros al ejecutarse vía `curl | bash` / `irm | iex`:
- Añadir cabecera con banner identificativo ("Instalador MVT — Plataforma X")
- Añadir confirmación interactiva (`read -p "¿Continuar? (s/n)"`) antes de instalar dependencias, por transparencia
- Asegurar que el script falla limpiamente si falta algo (`set -e`)
- Verificar que la descarga de `analizar-*.sh` no requiere permisos adicionales (el script de análisis también se puede ejecutar vía pipe)

### 2. Página `/guia` (`src/routes/guia.tsx`)

Reemplazar la sección actual de "Modo rápido — descargar scripts" por una nueva con esta estructura:

**a) Selector de SO** (tabs en la parte superior):
- 🍎 Mac
- 🐧 Linux  
- 🪟 Windows

Solo se muestra el contenido del SO seleccionado (detectar SO por defecto con `navigator.userAgent` / `navigator.platform`).

**b) Bloque "¿Cómo abro la Terminal?"** (acordeón plegable):
- Mac: Cmd+Espacio → escribir "terminal" → Enter
- Linux: Ctrl+Alt+T
- Windows: Tecla Windows → escribir "powershell" → click derecho → "Ejecutar como administrador"

**c) Paso 1 — Instalar MVT** (una sola tarjeta con):
- Título grande: "Paso 1: Instalar MVT (solo la primera vez, ~5 min)"
- Bloque de código con **un solo comando** y botón "Copiar" muy visible:
  - Mac: `curl -fsSL {ORIGIN}/scripts/instalar-mvt-macos.sh | bash`
  - Linux: `curl -fsSL {ORIGIN}/scripts/instalar-mvt-linux.sh | bash`
  - Windows: `irm {ORIGIN}/scripts/instalar-mvt-windows.ps1 | iex`
- La URL `{ORIGIN}` se genera dinámicamente con `window.location.origin` para que funcione en preview y en producción

**d) Paso 2 — Analizar el dispositivo** (segunda tarjeta):
- Título: "Paso 2: Conecta el móvil y analiza"
- Sub-selector Android / iOS
- Instrucciones cortas de preparación (activar depuración USB / hacer backup cifrado) con icono de móvil
- Bloque de código con comando único:
  - Android Mac/Linux: `curl -fsSL {ORIGIN}/scripts/analizar-android.sh | bash`
  - Android Windows: `irm {ORIGIN}/scripts/analizar-android.ps1 | iex`
  - iOS Mac: `curl -fsSL {ORIGIN}/scripts/analizar-ios.sh | bash`
- Botón "Copiar" igual de visible

**e) Paso 3 — Subir resultados** (tercera tarjeta):
- Nota de que el script abre automáticamente la página de upload
- Botón directo a `/upload` por si no se abrió solo

**f) Sección "¿Algo falló?"** (acordeón al final):
- "command not found" → no se ejecutó el instalador
- "permission denied" → ejecutar con `sudo` (Mac/Linux) o como admin (Windows)
- "device not found" → activar depuración USB
- "execution policy" (Windows) → el comando `irm | iex` ya lo bypasea

### 3. Componente reutilizable
- Crear `src/components/copy-command.tsx`: bloque grande con el comando, fondo oscuro, botón "Copiar" prominente con feedback ("¡Copiado!"), y opcionalmente etiqueta del SO. Reemplaza el uso de `CodeBlock` en estos pasos críticos para que el botón sea mucho más visible.

### 4. Modo detallado
- Mantener el toggle "¿Prefieres entender cada paso manualmente?" → muestra la guía técnica original sin cambios.

## Detalles técnicos

- Detección de SO inicial: 
  ```ts
  const ua = navigator.userAgent.toLowerCase();
  const defaultOS = ua.includes('mac') ? 'mac' : ua.includes('win') ? 'windows' : 'linux';
  ```
- URL base: `const origin = typeof window !== 'undefined' ? window.location.origin : '';` (manejar SSR devolviendo placeholder y rellenando en cliente con `useEffect` o renderizado condicional).
- `CopyCommand` usa `navigator.clipboard.writeText()` con fallback a `document.execCommand('copy')`.
- Mantener los archivos descargables como fallback (por si el `curl|bash` falla en algún entorno corporativo con firewall): pequeño link "¿No funciona? Descarga el script manualmente".

## Archivos afectados

- `src/components/copy-command.tsx` (nuevo)
- `src/routes/guia.tsx` (refactor del componente `QuickStart`)
- `public/scripts/instalar-mvt-macos.sh` (banner + confirmación)
- `public/scripts/instalar-mvt-linux.sh` (banner + confirmación)
- `public/scripts/instalar-mvt-windows.ps1` (banner + confirmación)
- `public/scripts/analizar-android.sh` (banner)
- `public/scripts/analizar-android.ps1` (banner)
- `public/scripts/analizar-ios.sh` (banner)

## Lo que NO se cambia

- Lógica del parser MVT (`src/lib/mvt-parser.ts`, `src/lib/mvt-modules.ts`)
- Flujo de subida en `/upload`
- Página de resultados / dashboard
- Modo detallado de la guía
