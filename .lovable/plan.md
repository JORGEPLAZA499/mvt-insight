## Problema

`mvt-ios check-backup` **no acepta `--backup-password`** (lo confirmé en el CLI oficial de mvt en GitHub). Las opciones reales son: `-i`, `-o`, `-f`, `-l`, `-m`, `-H`, `-v` y el argumento posicional `BACKUP_PATH`.

La contraseña se gestiona en dos sitios:
- **`decrypt-backup`** acepta `-p/--password` y descifra el backup a otra carpeta.
- **`check-backup`** opera sobre un backup ya descifrado (o sin cifrar). Lee la variable de entorno `MVT_IOS_BACKUP_PASSWORD` solo en algunos módulos internos, pero el flujo robusto es **descifrar primero y analizar después**.

## Solución

Modificar `runMvtIos()` en `desktop/electron/ios-tools.cjs` para que haga dos pasos:

1. **Descifrar el backup** a una carpeta temporal:
   ```
   mvt-ios decrypt-backup -d <decryptedDir> -p <password> <backupDir>
   ```
2. **Analizar el backup descifrado**:
   ```
   mvt-ios check-backup -o <resultsDir> <decryptedDir>
   ```

Detalles:
- `decryptedDir` = `<workDir>/ios-backup-decrypted` (limpiar antes si existe para evitar conflictos de reintentos).
- Si el paso 1 falla por contraseña incorrecta (mensaje típico de mvt: "Failed to decrypt" / "Invalid password"), propagar un error claro: "Contraseña del backup incorrecta".
- Mantener la misma firma `runMvtIos(workDir, backupDir, resultsDir, password, onData)` para no romper la llamada en `main.cjs`.
- Emitir las dos fases por `onData` para que se vean en el log de la UI.

## Lo que NO se toca

- `desktop/package.json > version` se bumpeó a `1.0.32` y se publicó.
- El flujo Android no cambia.
- La UI (`App.tsx`) no cambia; solo verá el progreso vía logs.

## Prueba tras publicar

1. Conectar iPhone, introducir contraseña del backup.
2. Tras "Conectando con el iPhone" debe aparecer el descifrado y luego "Analizando backup con MVT-iOS…".
3. Si la contraseña está mal, error legible en español sin volcado de stack.