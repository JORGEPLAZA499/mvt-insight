# Plan: mejorar errores del análisis y eliminar la “ventana” interna

## Contexto
El usuario reporta dos problemas en el flujo de análisis (app de escritorio,
también accedida vía la web cuando se inicia el proceso desde el panel):

1. Los errores que se muestran son crudos (mensajes en inglés/español técnicos
   provenientes de AndroidQF, mvt-ios, ADB, Windows Defender, node-pty, etc.).
   Si Lovable no está delante para traducir, el usuario final no entiende qué
   pasa ni qué hacer.
2. Dentro del panel de análisis hay una **mini-ventana** con las últimas líneas
   de log en monoespaciado (estilo terminal). Quiere quitarla y que toda la
   información se vea “más maquillada” en el front.

## Alcance
Solo frontend de la app de escritorio (`desktop/src/...`) más añadidos en
locales (`es.json` / `en.json`). No se tocan los `main.cjs`/`ios-tools.cjs` —
los errores se traducen en el cliente por patrón.

## Cambios

### 1) Nuevo fichero `desktop/src/lib/error-humanizer.ts`
Función `humanizeRunError(raw)` que devuelve
`{ id, titleKey, titleFallback, bodyKey, bodyFallback, hintKey?, hintFallback?, severity, raw }`.
Mapea por regex (insensible a mayúsculas) los siguientes casos comunes:

| id | patrón | título / qué hacer |
|---|---|---|
| `cancelled` | `^cancelled$` | Análisis cancelado |
| `sessionExpired` | `NO_TOKEN`, `invalid-token`, `UNAUTHORIZED`, `Sesión caducada` | Sesión caducada — revincular |
| `noCredits` | `INSUFFICIENT_CREDITS`, `No te quedan créditos` | Sin créditos — recarga |
| `adbBlocked` | `tiene .*bloqueado`, `Windows Defender`, `antivirus`, `exclusiones` | Antivirus bloquea archivos |
| `adbDownload` | `No se pudieron preparar las herramientas ADB`, `platform-tools`, `ENOENT.*platform-tools` | Falló preparar ADB |
| `adbNotWorking` | `El ejecutable adb no funciona`, `adb version.*falla`, `failed to use the adb executable` | ADB no arranca (VC++ Redist) |
| `multipleDevices` | `multiple devices connected`, `varios dispositivos conectados`, `provide a serial number` | Hay varios móviles conectados |
| `deviceNotDetected` | `Dispositivo no detectado`, `No se detectó el iPhone`, `device not found` | No vemos el móvil |
| `nodePty` | `node-pty`, `terminal interno`, `Visual C++ Redistributable` | Instalar VC++ Redist |
| `androidqfExited` | `AndroidQF terminó con código`, `androidqf.*exit` | AndroidQF se cerró |
| `iosDrivers` | `IOS_DRIVERS_MISSING` | Drivers Apple |
| `iosBackupPassword` | `Contraseña del backup incorrecta`, `incorrect password` | Contraseña distinta |
| `iosEncryption` | `No se pudo activar el cifrado` | Reset historial y privacidad |
| `iosBackupFailed` | `idevicebackup2`, `backup.*falló` | Mantén iPhone desbloqueado |
| `iosMvtDecrypt` | `decrypt-backup falló` | Contraseña correcta |
| `iosCheckBackup` | `check-backup falló` | Reintenta |
| `backupPasswordRequired` | `Se requiere una contraseña de backup` | Pon contraseña ≥ 4 chars |
| `downloadFailed` | `Demasiados redirects`, `HTTP \d+ (en|al descargar)`, `Descarga inválida` | Comprueba red/VPN |
| `memoryAllocation` | `Array buffer allocation failed`, `out of memory`, `ENOMEM` | Actualizar app |
| `noResults` | `No se encontró ni ZIP ni carpeta` | Reintenta + espacio en disco |
| `toolsMissing` | `Faltan binarios`, `Faltan DLLs` | Antivirus borró binarios |
| `unsupportedPlatform` | `Plataforma no soportada` | SO no soportado |
| `fileMissing` | `\bENOENT\b` | Falta archivo (antivirus) |
| `permissionDenied` | `\bEACCES\b`, `permission denied` | Permisos |
| `generic` | fallback | “El análisis no pudo completarse” + detalle técnico |

### 2) `desktop/src/i18n/locales/{es,en}.json`
Añadir bloque `runErrors.<id>.{title,body,hint}` con copy bilingüe para los 23
casos anteriores (textos en castellano natural y traducciones al inglés).

### 3) `desktop/src/App.tsx`

**a) Quitar la mini-consola dentro de la fase activa.**
Eliminar el bloque `recent = logs.slice(-3)` (≈ líneas 815-828) que pinta una
caja monoespaciada negra con las últimas líneas crudas de log. En su lugar,
mostrar solo el `phase.statusKey` traducido, el cronómetro y el aviso de
inactividad ya existente — todo con el estilo del resto del panel.

**b) Tarjeta de error “maquillada” reutilizable.**
Crear `<RunErrorCard raw={...} onBack={...} onRetry={...} />` que:
- Llama a `humanizeRunError(raw)`.
- Renderiza un `card` con borde según `severity`, icono (⚠ / ⛔ / ℹ), título
  grande, párrafo de causa, bloque destacado “Qué hacer” con el hint, y un
  `<details>` colapsado titulado “Detalle técnico” con el `raw` original
  monoespaciado por si el usuario quiere copiarlo para soporte.
- Botones: «Reintentar» (si aplica) y «Volver al inicio».

**c) Reemplazar usos de errores planos.**
- `setError(result.error ?? ...)` (≈ L260): seguir guardando el string crudo.
- En la pantalla `running` (≈ L989-999), cambiar el bloque `error && (...)` por
  `<RunErrorCard raw={error} onBack={() => setScreen("welcome")} />` con caso
  especial conservado para `IOS_DRIVERS_MISSING` (que ya tiene su propia UI).
- En la pantalla `done` (≈ L1100-1118), reemplazar el `upload.state === "error"`
  por `<RunErrorCard raw={upload.error} severity-aware onRetry={...} />`,
  manteniendo el caso `INSUFFICIENT_CREDITS` ya gestionado.

**d) Limpieza.**
- El estado `logs` se sigue almacenando (lo usa la heurística de inactividad)
  pero ya no se pinta para el usuario.
- Sin cambios en `main.cjs`; los códigos especiales (`cancelled`,
  `invalid-token`, `IOS_DRIVERS_MISSING`, etc.) ya viajan tal cual y casan con
  los patrones del humanizador.

## Resultado esperado
- Mensajes de error en español/inglés con título, causa y solución concretos
  según el idioma del sistema.
- Detalle técnico siempre disponible bajo un desplegable para soporte.
- Panel de análisis más limpio: desaparece la cajita tipo terminal, queda el
  estado de la fase con buen estilo.

## Sin cambios
- Lógica de subida, créditos, vinculación, drivers iOS, bump de versión.
- No se publica nueva release en este turno (el usuario no lo ha pedido).
