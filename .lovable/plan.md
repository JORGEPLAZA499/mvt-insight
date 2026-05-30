
# Plan: Conectar la plataforma con MVT (resultados reales)

## Objetivo

Sustituir el flujo simulado por uno donde el usuario:
1. Sigue una guía dentro de la plataforma para ejecutar MVT en su computador (iOS y Android).
2. Sube la carpeta de resultados (ZIP) o archivos JSON sueltos generados por MVT.
3. La plataforma parsea esos JSON, detecta indicadores de compromiso (IOCs) reales y muestra un informe.

No se ejecuta MVT en el servidor. MVT corre **siempre en la máquina del usuario** (única forma técnica y legalmente correcta).

---

## 1. Guía integrada para generar resultados MVT

Nueva ruta `/guia` con dos pestañas: **iOS** y **Android**. Cada una con pasos numerados, bloques de código copiables y avisos legales/seguridad.

### iOS (mvt-ios)
1. Hacer backup cifrado del iPhone con Finder (macOS) o iTunes (Windows). Conectar por cable USB. Marcar "Cifrar copia de seguridad local" y guardar contraseña.
2. Instalar dependencias:
   ```
   pip install mvt
   ```
3. Localizar el backup (rutas típicas en macOS/Windows).
4. Descifrar:
   ```
   mvt-ios decrypt-backup -p <password> -d ./backup_descifrado <ruta_backup>
   ```
5. Analizar:
   ```
   mvt-ios check-backup -o ./resultados ./backup_descifrado
   ```
6. Comprimir `./resultados` en un ZIP y subirlo a la plataforma.

### Android (mvt-android)
1. Activar Opciones de desarrollador y Depuración USB. Conectar por cable. Autorizar el equipo.
2. Instalar dependencias (`adb`, `libusb`, `pip install mvt`).
3. Análisis vía ADB:
   ```
   mvt-android check-adb -o ./resultados
   ```
   o sobre un backup:
   ```
   mvt-android check-backup -o ./resultados backup.ab
   ```
4. Comprimir y subir.

Cada bloque tiene botón **Copiar**. Sección de troubleshooting (backup no detectado, contraseña incorrecta, adb no autorizado).

---

## 2. Uploader real (reemplaza el mock)

Refactor de `/upload`:
- Acepta **ZIP** (carpeta `resultados/` comprimida) o múltiples archivos `.json` sueltos.
- Drag & drop + selector. Validación de tamaño (límite 50 MB).
- Detecta tipo (iOS / Android) según los nombres de archivo presentes.
- Muestra preview de los módulos detectados antes de procesar.

---

## 3. Parser de resultados MVT (cliente)

Todo el parsing ocurre en el navegador — los JSON nunca salen del dispositivo del usuario salvo que se decida lo contrario. Más privado, más simple, sin backend.

Módulo nuevo `src/lib/mvt-parser.ts`:
- Descomprime ZIP con `jszip`.
- Identifica módulos MVT conocidos por nombre de archivo (iOS: `sms.json`, `safari_history.json`, `webkit_resource_load_statistics.json`, `calls.json`, `contacts.json`, `idstatuscache.json`, `interactionc.json`, `locationd.json`, `manifest.json`, etc. Android: `dumpsys_*.json`, `packages.json`, `processes.json`, `sms.json`, `settings.json`, etc.).
- Reconoce los archivos `*_detected.json` que MVT genera cuando hay match contra IOCs.
- Extrae para cada módulo: número de entradas, timestamp rango, IOCs detectados.
- Calcula un **riesgo agregado** basado en cantidad y tipo de detecciones (alto si hay `*_detected.json` con entradas; medio si hay anomalías; bajo si solo evidencia limpia).

---

## 4. Dashboard de análisis real

Refactor de `/analysis/$id`:
- Resumen: dispositivo (iOS/Android), nº de módulos analizados, nº de IOCs detectados, nivel de riesgo.
- Tarjetas por módulo con conteo y badge de detección.
- Tabla detallada de cada `*_detected.json` (timestamp, indicador, fuente).
- Gráfico de actividad temporal (eventos por día) si hay datos con timestamp.
- Botón "Generar PDF" usando `src/lib/pdf-report.ts` ya existente, alimentado con datos reales.

---

## 5. Almacenamiento

Por defecto, **todo en memoria del navegador** (`src/lib/mock-store.ts` se renombra a `analysis-store.ts` y guarda objetos parseados en sessionStorage). Los JSON crudos no se persisten — solo el resumen.

Esto evita necesidad de Lovable Cloud por ahora. Si más adelante el usuario quiere guardar histórico entre sesiones o compartir informes, añadimos Cloud (auth + tabla `analyses` + storage). Lo dejo fuera de este plan para mantenerlo enfocado.

---

## 6. Aviso legal reforzado

Banner persistente en `/upload` y `/guia`:
- La plataforma no instala spyware, no accede a dispositivos, no realiza vigilancia.
- El usuario debe ser propietario del dispositivo analizado o tener autorización.
- Los archivos se procesan localmente en el navegador.

---

## Detalles técnicos

- **Nuevas dependencias**: `jszip` (descompresión ZIP en navegador).
- **Archivos nuevos**:
  - `src/routes/guia.tsx` (con tabs iOS/Android)
  - `src/lib/mvt-parser.ts`
  - `src/lib/mvt-modules.ts` (catálogo de módulos conocidos)
  - `src/components/code-block.tsx` (bloque copiable)
- **Archivos modificados**:
  - `src/routes/upload.tsx` (uploader real)
  - `src/routes/analysis.$id.tsx` (dashboard con datos reales)
  - `src/lib/mock-store.ts` → `analysis-store.ts`
  - `src/lib/pdf-report.ts` (acepta datos reales)
  - `src/components/app-shell.tsx` (añadir link a /guia)

---

## Lo que NO hace este plan (intencionalmente)

- No ejecuta MVT en el servidor.
- No accede al teléfono desde el navegador (WebUSB no sirve para esto).
- No persiste informes entre sesiones (se puede añadir luego con Lovable Cloud).
- No valida criptográficamente la autenticidad de los JSON (MVT no los firma).

Si apruebas el plan, lo implemento en este orden: parser → uploader → dashboard real → guía → aviso legal.
