## Objetivo

Rediseñar `/dashboard` como un **panel de control forense moderno** con medidores circulares estilo reloj (gauges con agujas), marcadores luminosos y micro-animaciones — manteniendo los mismos datos actuales (totales, completados, riesgo alto, coincidencias) y la tabla de análisis recientes.

## Qué se construye

### 1. Hero metric — Reloj de riesgo (gauge grande)
Reemplaza la fila plana de 4 tarjetas por una composición de **2 columnas**:

- **Izquierda — Gauge principal "Nivel de amenaza"** (SVG):
  - Arco semicircular de 270°, gradiente de verde → ámbar → rojo
  - Aguja animada que se mueve al cargar (transición `cubic-bezier`)
  - Valor central grande + etiqueta de riesgo
  - Marcas (ticks) cada 30°, marcas mayores etiquetadas
  - Glow pulsante detrás de la aguja cuando el riesgo es alto

- **Derecha — 3 mini-gauges circulares** apilados (donut + aguja corta):
  - Análisis totales (azul)
  - Completados (verde)
  - Coincidencias (ámbar)
  - Cada uno con número grande al centro y aguja que apunta al porcentaje relativo

### 2. Banda de marcadores con efectos
Fila horizontal con 4 "pills" tipo HUD:
- LED pulsante (punto con `animate-ping`) por categoría: pendientes, procesando, completados, error
- Contador animado (count-up al montar)
- Glow lateral en el color de cada estado

### 3. Tabla de análisis recientes
Se mantiene la tabla actual pero con:
- Fila destacada con borde-izquierdo de color según riesgo
- Mini-barra de "intensidad" (sparkline-like) en la columna de detecciones
- Hover con leve elevación (shadow)

## Detalles técnicos

- **Sin librerías nuevas**. Los gauges se dibujan con SVG puro + `stroke-dasharray` animado y `transform: rotate()` para la aguja.
- Componente reutilizable `<GaugeClock value={0-100} max label tone />` en `src/components/gauge-clock.tsx`.
- Componente `<MiniGauge />` para los donuts pequeños.
- Animaciones existentes (`animate-fade-in`, `animate-scale-in`) + nuevos keyframes `needle-sweep` y `pulse-glow` en `src/styles.css`.
- Tokens semánticos ya definidos (`--primary`, `--success`, `--destructive`, `--gradient-primary`, `--shadow-glow`). Solo se añade `--gradient-gauge` (verde→ámbar→rojo) si hace falta.
- Sin cambios de datos ni de lógica: lee `getAnalyses()` igual que ahora y calcula el riesgo agregado a partir de `items`.

## Archivos a tocar

1. `src/components/gauge-clock.tsx` — nuevo (gauge semicircular con aguja)
2. `src/components/mini-gauge.tsx` — nuevo (donut con aguja corta)
3. `src/routes/dashboard.tsx` — recompuesto con la nueva sección hero + banda de marcadores; la tabla se conserva con retoques visuales
4. `src/styles.css` — añadir keyframes `needle-sweep`, `pulse-glow` y token `--gradient-gauge`

## Qué NO cambia

- Rutas, navegación, lógica de datos
- Otras páginas (`/upload`, `/history`, `/reports`, `/analysis/$id`)
- Tabla de columnas (mismos campos)
