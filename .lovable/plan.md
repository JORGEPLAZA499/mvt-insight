
## Problema

En el log se ve claramente que AndroidQF **terminó bien**:

```
Acquisition completed.
Press Enter to finish ...
❌ No se encontró el ZIP de resultados
```

Hay **dos bugs** en `desktop/electron/main.cjs`:

### Bug 1 — Nunca enviamos el último Enter

El código solo responde a prompts que terminan en `?`:
```js
if (/\?\s*$/.test(text) && answerIdx < answers.length) { ... }
```

Pero el prompt final es `Press Enter to finish ...` (sin `?`). Como nadie pulsa Enter, AndroidQF no llega a **comprimir** el resultado en `.zip` — solo deja la carpeta de acquisition cruda. Por eso el `readdirSync` no encuentra ningún `.zip`.

### Bug 2 — Solo buscamos `.zip`

Las versiones recientes de AndroidQF crean una **carpeta** con UUID (ej. `20260121133226-62061841/`) con todos los artefactos dentro, y solo la convierten a `.zip` si el usuario lo confirma. Si por lo que sea el zip no se genera, nos quedamos sin nada que subir aunque la carpeta exista.

## Solución

Editar **solo** `desktop/electron/main.cjs`:

1. **Detectar el prompt final** `Press Enter to finish` y enviar `\n` para que AndroidQF cierre limpiamente y finalice la escritura del zip.

2. **Detectar también prompts sin `?`** (líneas tipo `>` o que terminen en `:` esperando respuesta) — pero con cuidado de no spamear respuestas. Solución simple: añadir el patrón `/Press .*Enter.*to finish/i` como caso especial que dispara un Enter sin consumir la cola de respuestas.

3. **Fallback de carpeta → zip**: si tras cerrar el proceso no hay `.zip`, buscar la carpeta de acquisition más reciente (nombre tipo `YYYYMMDDHHMMSS-XXXXXXXX/`) y comprimirla nosotros usando el módulo `archiver` (ya disponible vía npm; si no, usar el `zlib` nativo + recorrido recursivo, o el comando del sistema `tar`/`powershell Compress-Archive` en Windows).

   Opción más simple y sin dependencias nuevas: usar **PowerShell** en Windows (`Compress-Archive`) y `zip` en macOS/Linux, ejecutados con `spawn`. Esto evita añadir paquetes al bundle de Electron.

4. **Bump versión** a `1.0.10` en `desktop/package.json` para que los usuarios con 1.0.9 reciban el fix vía auto-updater.

## Sección técnica

Cambios concretos en `main.cjs`:

```js
// Dentro del handler de stdout:
child.stdout.on("data", (data) => {
  const text = data.toString();
  buffer += text;
  send("mvt:log", text);

  // ... heurística de progreso sin cambios ...

  // NUEVO: prompt final
  if (/Press\s+.*Enter.*to finish/i.test(text)) {
    try { child.stdin.write("\n"); } catch {}
    return;
  }

  // Prompts normales (?)
  if (/\?\s*$/.test(text) && answerIdx < answers.length) {
    try { child.stdin.write(answers[answerIdx++]); } catch {}
  }
});
```

Y tras `child.close`:

```js
// Buscar zip primero
let files = fs.readdirSync(dir).filter(f => f.endsWith(".zip"));
let zipPath;
if (files.length) {
  const newest = files
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  zipPath = path.join(dir, newest.f);
} else {
  // Fallback: comprimir la carpeta de acquisition más reciente
  const dirs = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d{14}-/.test(d.name))
    .map(d => ({ name: d.name, t: fs.statSync(path.join(dir, d.name)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!dirs.length) throw new Error("No se encontró ni ZIP ni carpeta de resultados");

  const folder = path.join(dir, dirs[0].name);
  zipPath = path.join(dir, `${dirs[0].name}.zip`);
  send("mvt:log", `📦 Comprimiendo ${folder} → ${zipPath}`);
  await zipFolder(folder, zipPath);    // usa PowerShell en win32, zip en otros
}
```

`zipFolder` se implementa con `spawn` invocando:
- Windows: `powershell -Command "Compress-Archive -Path '<folder>\\*' -DestinationPath '<zip>' -Force"`
- macOS/Linux: `zip -r <zip> .` con cwd en la carpeta.

## Archivos a tocar

- `desktop/electron/main.cjs` — los dos fixes anteriores
- `desktop/package.json` — bump a `1.0.10`

Después solo queda hacer **Run workflow** en `release.yml` para publicar 1.0.10; los usuarios con 1.0.9 recibirán el aviso de actualización al abrir la app.
