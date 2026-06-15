# Fix: el panel de "información del dispositivo" en iPhone aparece vacío

## Causa

El parser de informes (`desktop/src/lib/mvt-parser.ts`) intenta sacar los datos del dispositivo iOS de un fichero llamado `info.json` con claves tipo `ProductType`, `ProductVersion`, `DeviceName`, etc.

Pero `mvt-ios check-backup` no produce ese fichero. El módulo que lee `Info.plist` del backup se llama `BackupInfo`, y por la convención de `slug` de MVT (snake_case del nombre de la clase) genera **`backup_info.json`**, no `info.json`. Además las claves dentro de ese JSON llevan **espacios**: `Product Type`, `Product Version`, `Device Name`, `Build Version`, `Serial Number`, `Phone Number`, `Last Backup Date`, etc.

Resultado: el parser nunca encuentra el fichero, `deviceInfo` queda `undefined` y en el informe sólo se ve "Apple" (puesto a fuego en otro sitio) y el resto de campos en blanco — exactamente lo que muestra la captura.

## Cambios

1. **`desktop/src/lib/mvt-parser.ts`**
   - En el bucle principal, reconocer también `meta.key === "backup_info"` como fuente de info iOS (además de `"info"`, por compatibilidad con dumps antiguos).
   - Reescribir `extractIosInfo` para que acepte ambos esquemas de claves:
     - Las con espacios que produce realmente MVT (`Product Type`, `Product Version`, `Device Name`, `Build Version`, `Serial Number`, `Phone Number`, `Last Backup Date`, `Target Identifier`, `Unique Identifier`, `iTunes Version`).
     - Las antiguas sin espacios (`ProductType`, `ProductVersion`, `DeviceName`, `BuildVersion`, `SerialNumber`, etc.) para no romper informes ya generados.
   - Rellenar:
     - `model` ← `Product Type` (ej. `iPhone14,5`)
     - `osVersion` ← `Product Version`
     - `buildId` ← `Build Version`
     - `deviceName` ← `Device Name` / `Display Name`
     - `serialLast4` ← últimos 4 de `Serial Number`
     - Y dejar `brand`/`manufacturer` = `Apple`.
   - Los campos que el backup nunca trae (parche de seguridad, zona horaria, idioma/región, operador SIM, bootloader, modo desarrollador) se quedan vacíos a propósito — no existen en `Info.plist` de un backup iOS y mostrarán "—" como ahora.

2. **Versión del desktop**
   - Bump `desktop/package.json` a `1.0.43` para que la GitHub Action publique la build con el fix (los informes nuevos lo aprovechan; los antiguos no se reparsean).

## Lo que NO se cambia

- Nada del flujo de subida ni de la edge function — el JSON que se sube ya contiene `backup_info.json`, simplemente el cliente no lo estaba leyendo.
- Los campos vacíos en la captura que sólo existen en Android (parche de seguridad, bootloader, modo desarrollador, operador SIM) se quedan como "—" en iPhone porque MVT no los extrae del backup; podemos ocultarlos condicionalmente en un cambio aparte si quieres.
