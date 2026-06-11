# Más información relevante extraíble del MVT

Tras revisar el parser y los módulos MVT que se procesan, el informe actual aprovecha bien las **detecciones contra IOCs conocidos** (Pegasus, stalkerware, etc.), pero **ignora varios campos de alto valor** que ya vienen en el JSON de MVT y que son comprensibles sin ser experto.

## Qué se está perdiendo hoy

| Módulo MVT | Qué contiene | Qué hace el parser hoy |
|---|---|---|
| `root_binaries` (Android) | Lista de binarios root encontrados (`su`, `magisk`…) | Solo cuenta cuántos hay |
| `selinux_status` (Android) | Estado SELinux: enforcing / permissive / disabled | Solo cuenta entradas |
| `dumpsys_accessibility` (Android) | Lista de servicios de accesibilidad activos (vector #1 de stalkerware) | Solo procesa los que matchean IOC |
| `configuration_profiles` (iOS) | Perfiles MDM/config instalados (pueden redirigir tráfico, instalar CAs) | Solo cuenta |
| `net_datausage` (iOS) | Tráfico de red por proceso/app, incluido background | Solo cuenta |
| `version_history` (iOS) | Historial de actualizaciones de iOS con timestamps | Solo cuenta |
| `sms` _detected | Cuerpo y remitente extraídos pero diluidos en "Indicios" | Sin sección propia |

## Propuesta: 4 secciones nuevas

Se añaden 4 secciones (sin tocar lógica de riesgo, BD ni i18n), reenumerando el informe. Web y PDF en paralelo.

### Sección nueva — Estado de seguridad del sistema (Android)
- Binarios root encontrados (lista de nombres): `su`, `magisk`, etc.
- Estado de SELinux con explicación humana ("enforcing = protección activa", "permissive = protección reducida").
- Bandera visible si bootloader desbloqueado + debuggable + root presentes simultáneamente.
- **Por qué importa**: un usuario ve "Magisk instalado" y entiende que su móvil está rooteado, en lugar de "2 indicios en root_binaries".

### Sección nueva — Servicios de accesibilidad activos (Android)
- Lista de todos los servicios de accesibilidad habilitados con `packageName` y nombre comercial cuando exista.
- Etiqueta: sistema / conocida / **desconocida** (resaltada).
- **Por qué importa**: es el permiso que usa el stalkerware para leer pantalla y teclas. Que el usuario pueda ir a Ajustes y desactivar el que no reconoce es la acción más útil posible.

### Sección nueva — Perfiles de configuración instalados (iOS)
- Lista de perfiles MDM/config: nombre, organización emisora, fecha, UUID corto.
- Resaltar en rojo si el `PayloadType` es VPN gestionada o certificado raíz.
- **Por qué importa**: un perfil MDM colocado por un atacante puede interceptar todo el tráfico HTTPS. El usuario medio ni sabe que estos perfiles existen.

### Sección nueva — Apps con más tráfico de red (iOS)
- Top 5 procesos/bundles por bytes (wifi+wwan, in+out) desde `net_datausage`.
- Filtrar prefijos de sistema; marcar apps desconocidas.
- **Por qué importa**: el spyware exfiltra datos en segundo plano. Una app desconocida con 50 MB de fondo es señal clara.

## Lo que NO se incluye en este plan
- **`version_history` (iOS)**: requiere heurística de "hora inusual" con riesgo de falsos positivos. Lo dejo fuera salvo que lo pidas.
- **Sección dedicada a SMS sospechosos**: ya aparecen en "Indicios detectados". Si quieres una sección propia con remitente + extracto del cuerpo, la añado.
- **`processes` (Android) listando procesos sospechosos sin IOC match**: alta tasa de ruido para usuario no experto.

## Cambios técnicos

1. **`src/lib/mvt-parser.ts`** y **`desktop/src/lib/mvt-parser.ts`**: extender `MvtParsedResult` con `rootBinaries: string[]`, `selinuxStatus: 'enforcing'|'permissive'|'disabled'|null`, `accessibilityServices: {package: string; service: string}[]`, `iosConfigProfiles: {name; org; uuid; type; installDate}[]`, `topNetworkProcs: {name; totalBytes}[]`. Añadir parseo específico por `meta.key` en `parseMvtFiles`.
2. **`src/lib/mvt-translate.ts`** y `desktop/`: 4 builders nuevos (`buildSystemIntegrity`, `buildAccessibilityList`, `buildConfigProfiles`, `buildTopNetwork`) + helpers de clasificación sistema/conocida/desconocida (reutilizar `KNOWN_PACKAGE_PREFIXES`). Ampliar `GLOSSARY` con: SELinux, perfil de configuración MDM, exfiltración.
3. **`src/routes/analysis.$id.tsx`**: insertar las 4 secciones nuevas. Renumerar (pasamos de 12 a 16 secciones). Las nuevas solo aparecen si hay datos (Android-only / iOS-only se ocultan en el SO contrario).
4. **`src/lib/pdf-report.ts`**: replicar las 4 secciones con los estilos actuales (chips, rectángulos redondeados).
5. **No se toca**: lógica de riesgo, veredicto, parser de detecciones IOC, BD, edge functions, i18n, `package.json` (sin bump de versión).

## Compatibilidad con informes anteriores
Igual que en el cambio previo: las secciones se renderizarán **vacías o se ocultarán** en informes guardados antes de este cambio, porque los nuevos campos no estaban en el parseo. Para verlos completos hace falta re-analizar el .zip. No se rompe ningún informe existente.
