Arreglar la detección del ZIP/carpeta de resultados de AndroidQF para que funcione independientemente del patrón de nombre. Acumular los cambios sin bumpear versión (regla nueva: solo bumpeo cuando digas "publica").

### Causa raíz
`desktop/electron/main.cjs:547` filtra subdirectorios con la regex estricta `/^\d{14}-/` (14 dígitos + guion). Si AndroidQF nombra la carpeta de otra forma, el filtro la descarta y lanzamos "No se encontró ni ZIP ni carpeta de resultados" aunque la captura terminó bien.

### Cambios

**1. `desktop/electron/main.cjs` — bloque de búsqueda de resultados (líneas 532-559)**

Reescribir para ser robusto:

- Capturar `const startMs = Date.now()` **antes** de `pty.spawn(...)`.
- Tras `Acquisition completed` / `exit`, escanear `dir` y considerar **cualquier** entrada (archivo o carpeta) cuyo `mtimeMs >= startMs - 5000` (margen de 5 s).
- Prioridad de elección:
  1. Si hay un `.zip` nuevo → usarlo directamente.
  2. Si hay una carpeta nueva → comprimirla (mantener `zipFolder`).
  3. Si no hay nada nuevo → recién entonces lanzar error, **incluyendo en el mensaje el listado del directorio** (`fs.readdirSync(dir).join(", ")`) para diagnosticar futuras versiones de AndroidQF.
- Añadir `send("mvt:log", "...")` con qué carpeta/archivo se eligió, para trazabilidad.

**2. Versión** — NO bumpear. Mantener `1.0.21` hasta que pidas "publica".

### Regla nueva confirmada
A partir de ahora no toco `desktop/package.json > version` en ningún cambio. Solo lo bumpeo cuando me escribas explícitamente **"publica"** o **"saca versión"**, y entonces hago un único bump (`1.0.21 → 1.0.22`) que dispara una sola release en GitHub Actions con todos los cambios acumulados.

### Lo que NO cambia
- Lógica de spawn de AndroidQF, prompts, fases, cancelación, updater, UI, i18n.