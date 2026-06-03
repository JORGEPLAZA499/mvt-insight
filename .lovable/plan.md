
## Por qué falló

AndroidQF NO usa preguntas estilo "1/2/3 + Enter". Usa la librería Go **`survey`**, que pinta un menú interactivo con **teclas de flecha** (↓ ↑ → ←) y necesita un **TTY real** para leer pulsaciones crudas.

En `main.cjs` lanzamos AndroidQF con `spawn(binPath, [])`, lo cual abre **pipes normales**, no un TTY. Resultado:
- `survey` detecta que no hay terminal y aborta inmediatamente con `^D` (EOF).
- Por eso ves `ERROR: failed to make selection for backup option: ^D`.
- Nuestro `child.stdin.write("1\n")` no hace nada útil — esos caracteres llegan a un proceso que ya ni siquiera está escuchando con el modo correcto.
- Como el módulo de backup falla, AndroidQF salta al siguiente paso y al final no genera ZIP ni carpeta válida.

Las "opciones" (`> Only SMS`, `Everything`, `No backup`) sí aparecen pintadas en pantalla, pero no podemos navegarlas sin teclas de flecha sobre un TTY.

Comprobado además que AndroidQF **no tiene flags CLI no-interactivas** (ni `--module`, ni `--backup=none`, ni `-y`). El README confirma que todo es a través del menú.

## Solución

Sustituir `child_process.spawn` por **node-pty**, que crea un pseudo-terminal real. Así `survey` cree que está en una terminal de verdad y podemos enviarle escapes ANSI de flechas + Enter para seleccionar opciones.

Para evitar compilar binarios nativos en cada build, usar el paquete con **prebuilds**:

```
@homebridge/node-pty-prebuilt-multiarch
```

Trae binarios precompilados para Windows (x64), macOS (x64 + arm64) y Linux (x64) y para varias versiones de Electron. Encaja directo con el workflow de GitHub Actions sin paso extra.

### Respuestas que enviamos

Para cada prompt detectado en stdout, enviar la combinación de teclas:

| Prompt | Acción | Bytes |
|---|---|---|
| `? Backup:` | Bajar 2 veces → "No backup" | `\x1b[B\x1b[B\r` |
| `? Download:` (APKs) | Bajar 1 vez → "Only non-system" (más rápido) | `\x1b[B\r` |
| `? SMS:` o similar | Enter (default) | `\r` |
| `Press Enter to finish` | Enter | `\r` |

Elegimos **"No backup"** porque:
- En Android 12+ el backup está rota para casi todas las apps (lo dice el README).
- Evita el error AAPM-incompatible que ya se vio en el log.
- Acelera el análisis a la mitad.

### Cambios concretos en `desktop/electron/main.cjs`

1. `npm install` de `@homebridge/node-pty-prebuilt-multiarch` en `desktop/package.json` (`dependencies`).
2. Quitar `const { spawn } = require("child_process")` en lo que afecta al binario de AndroidQF (lo seguimos usando para `taskkill` y `zip`/PowerShell).
3. Sustituir `spawnWithRetry` por una versión que use `pty.spawn(binPath, [], { name: 'xterm-color', cwd: dir, cols: 120, rows: 30, env: process.env })`.
4. Reescribir el handler de `onData`:
   - Quitar el ANSI con un regex para detectar prompts limpios.
   - Mantener la heurística de progreso (backup, APKs, apps).
   - Tabla de respuestas como arriba; cada prompt se envía **una sola vez** marcándolo en un `Set` para no spamear.
   - Cuando se detecte `Press Enter to finish`, `pty.write("\r")`.
5. Esperar `pty.onExit` en vez de `child.on("close")`.

### Cambios en empaquetado

`electron-builder` debe incluir los prebuilds nativos. Añadir en `desktop/package.json` → `build.asarUnpack`:

```json
"asarUnpack": [
  "node_modules/@homebridge/node-pty-prebuilt-multiarch/**/*"
]
```

### Versión

Bump a **1.0.11** para que los usuarios con 1.0.10 reciban el fix por auto-updater.

## Sección técnica — fallback si node-pty falla en algún user

Si `pty.spawn` lanza un error al cargar el `.node` (raro pero posible en Windows sin Visual C++ runtimes antiguos), capturarlo y mostrar mensaje claro: "Tu Windows necesita el Redistributable de Visual C++ 2015-2022". No reintentamos con `spawn` clásico porque ya sabemos que no funciona.

## Archivos a tocar

- `desktop/package.json` — añadir dependencia + `asarUnpack` + bump a 1.0.11
- `desktop/electron/main.cjs` — reemplazar el spawn de androidqf por node-pty y reescribir el handler de respuestas

Después: **Run workflow** `release.yml` para publicar 1.0.11. Los usuarios con 1.0.10 verán el aviso de actualización al abrir la app.
