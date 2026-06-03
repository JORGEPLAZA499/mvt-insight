# Fix: Auto-responder a TODOS los prompts de AndroidQF

## Problema

AndroidQF es interactivo. Pregunta cosas como:
1. `? Modules:` (qué módulos ejecutar)
2. `? Backup:` (hacer backup ADB)
3. `? Download:` (descargar APKs: all / non-system)
4. `? Remove:` (eliminar APKs firmadas por CA confiable para reducir tamaño) ← **aquí se cuelga ahora**
5. `Press Enter to finish`

La app ya tiene un parser de prompts en `main.cjs`, pero:
- La regla genérica `default` se marca como "ya enviada" tras el primer prompt y los siguientes nunca reciben respuesta.
- Las reglas específicas (`backup`, `download`) buscan labels que no coinciden con la versión actual de AndroidQF.

Resultado: AndroidQF se queda esperando flechas en el prompt nº 4 y la fase 3 nunca termina → nunca se genera el ZIP.

## Solución (Opción A — auto-responder a todo)

Reescribir la detección de prompts en `desktop/electron/main.cjs` para responder a **cada prompt nuevo** según su label, sin reglas genéricas que se "quemen".

### Cambios en `desktop/electron/main.cjs` (líneas ~410-458)

1. **Detectar prompts por label** con regex `/\?\s+([A-Za-z ]+?):\s*$/m` sobre líneas recientes (no sobre todo el buffer).
2. **Tabla de respuestas por label** (case-insensitive):
   - `Modules` → `ENTER` (defaults: todos los módulos seleccionados)
   - `Backup` → `DOWN+DOWN+ENTER` (No backup — evita errores AAPM y es más rápido)
   - `Download` → `DOWN+ENTER` (Only non-system — más rápido que All)
   - `Remove` → `ENTER` (Yes — reduce tamaño del output)
   - `Acquire` / `Collect` / cualquier otro `Yes/No` → `ENTER` (acepta default)
   - **Fallback para prompts desconocidos**: `ENTER` (acepta lo que esté preseleccionado)
3. **Dedup por hash del prompt completo** (label + opciones visibles), no por rule-id. Así cada prompt nuevo se responde una vez y los re-pintados del mismo prompt se ignoran.
4. **Detectar prompt "estable"**: esperar 300 ms sin nuevos datos antes de responder, para no responder a un prompt a medio renderizar.
5. **Detectar `Press Enter to finish`** → `ENTER` (igual que antes).
6. **Log limpio de qué prompt se detectó y qué se respondió** (para depurar futuros prompts nuevos sin tener que descifrar ANSI).

### Bump de versión

- `desktop/package.json`: `1.0.16` → `1.0.17`
- El push dispara el workflow que publica `v1.0.17` con los 3 instaladores.

### Auto-update

La v1.0.16 ya tiene `electron-updater` funcionando (el usuario está corriendo v1.0.16 con node-pty OK). Cuando publique v1.0.17, la app instalada lo detectará automáticamente 30 s después de abrir y ofrecerá actualizar.

## Resultado esperado

- AndroidQF avanza sin pararse por todos sus prompts.
- Fase 3 progresa hasta "Empaquetando".
- Se genera el ZIP en `Downloads/mvt-insight/` y aparece la pantalla final con "Abrir carpeta" / "Subir".

## Riesgo y mitigación

Si AndroidQF añade un prompt nuevo en una release futura con un label desconocido, el fallback `ENTER` acepta el default, que suele ser la opción segura. Si el default fuera destructivo, lo veríamos en el log limpio y añadiríamos una regla específica.

## Lo que NO cambia

- Auto-update, workflow de CI, lógica de descarga de AndroidQF, lógica de empaquetado del ZIP, UI de la app, traducciones, instalador NSIS.
