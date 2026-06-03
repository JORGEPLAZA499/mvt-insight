El log crudo del PTY se envía al renderer en `desktop/electron/main.cjs:500` con `send("mvt:log", text)`, sin limpiar. Ya existe `stripAnsi` justo debajo, solo hay que aplicarlo antes de enviar y reforzar la regex para cubrir más secuencias.

### Cambios
1. **`desktop/electron/main.cjs`**
   - Reemplazar la regex de `stripAnsi` por una versión más completa que cubra:
     - CSI: `\x1b\[...letter`
     - OSC: `\x1b\][^\x07]*\x07`
     - Otras secuencias de un solo carácter: `\x1b[=>()*+]`
     - Caracteres de control no imprimibles (excepto `\n`, `\t`): `[\x00-\x08\x0B-\x1F\x7F]`
     - `\r` solo, sin `\n` detrás → convertir a `\n` para que no sobrescriba la línea anterior.
   - En el handler `child.onData`, enviar `send("mvt:log", stripAnsi(text))` en vez del `text` crudo. El `buffer` interno (usado para detectar prompts) sigue trabajando con el texto original — eso ya hace su propio `stripAnsi` en `tryAnswerPrompt`.

2. **`desktop/package.json`** — Bump `1.0.20` → `1.0.21` para que la nueva versión salga publicada.

### Lo que NO cambia
- Lógica de detección de prompts, fases, cancelación, updater, UI.