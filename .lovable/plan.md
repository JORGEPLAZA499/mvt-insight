## Objetivo

El Paso 3 actual ("Descarga el lanzador y haz doble clic") asume que el usuario ya tiene el móvil en modo desarrollador, la depuración USB activada, el cable conectado y autorizado. Hay que descomponerlo en una checklist visual numerada, con sub-pasos concretos por marca/SO, para que cualquier persona sin conocimientos técnicos pueda repetir el análisis.

## Cambios

### 1. Rediseñar Paso 3 (`StepRun` en `src/routes/upload.tsx`)

Reemplazar el bloque actual por una lista numerada de **5 pasos visuales** (cada uno en una tarjeta con número, título, descripción y, si aplica, sub-pasos plegables). Solo afecta a la presentación; el lanzador y el comando alternativo siguen igual.

**Android:**

1. **Activa el modo desarrollador en tu móvil**
   - Ajustes → Información del teléfono → Toca 7 veces "Número de compilación".
   - Sub-bloque desplegable con la ruta exacta para Samsung / Xiaomi / Pixel / Huawei.

2. **Activa la Depuración USB**
   - Ajustes → Opciones de desarrollador → Activa "Depuración USB".

3. **Conecta el móvil al ordenador con un cable USB**
   - Usa el cable original si es posible (algunos cables solo cargan).
   - En el móvil aparecerá un aviso "¿Permitir depuración USB?" → marca "Permitir siempre" y pulsa Aceptar.

4. **Descarga el lanzador y haz doble clic** ← (lo que ya existe hoy, intacto)
   - Se abrirá una ventana negra (Terminal/PowerShell). **No la cierres.**
   - Puede tardar entre 5 y 15 minutos. Verás texto avanzando: es normal.

5. **Cuando termine, busca el ZIP**
   - El script deja un archivo `mvt-resultados-AAAAMMDD.zip` en tu carpeta de Descargas (o donde ejecutaste el lanzador).
   - Pulsa "Ya tengo el ZIP" para subirlo.

**iOS** (variante equivalente):

1. **Confía en el ordenador desde el iPhone**
   - Conéctalo por USB → desbloquéalo → pulsa "Confiar" y mete el código.
2. **Crea un backup cifrado**
   - Finder (macOS Catalina+) o iTunes → selecciona iPhone → "Cifrar copia de seguridad local" → define contraseña y recuérdala.
3. **Descarga el lanzador y haz doble clic** (igual que hoy).
4. **Introduce la contraseña del backup** cuando la Terminal lo pida.
5. **Cuando termine, busca el ZIP** en la misma carpeta.

### 2. Mensaje de aviso superior

Añadir, justo bajo el título, un banner pequeño con icono:
> "Sigue los pasos en orden. Si te saltas uno, el análisis fallará."

### 3. Aviso de tiempo y pantalla encendida

Dentro del paso 4 (lanzador), añadir nota:
> "Mantén el móvil desbloqueado y con la pantalla encendida durante todo el proceso."

### 4. Sin cambios funcionales

- No se toca la generación del `.bat`/`.sh`/`.command`, ni el endpoint `/api/public/scripts/*`, ni `StepUpload`.
- El botón "Ya tengo el ZIP" sigue llevando al paso 4.
- "Prefiero copiar el comando manualmente" y "¿Cómo abro la Terminal?" se mantienen al final como hoy.

## Detalles técnicos

- Un único componente nuevo `NumberedStep` dentro de `upload.tsx` (número en círculo con `bg-gradient-primary`, título, children con instrucciones y sub-detalles en `<details>` para Samsung/Xiaomi/Pixel).
- Tokens del design system (`text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `shadow-glow`) — sin colores hardcoded.
- Renderizado condicional por `device` (android vs ios). El switch por `os` (mac/win/linux) solo afecta al paso del lanzador, que ya estaba ramificado.
- Sin nuevas dependencias.

## Fuera de alcance

- No se toca el flujo de subida (Paso 4), el parser, ni el informe.
- No se añaden vídeos ni GIFs (se podrían añadir después si el usuario los aporta).
