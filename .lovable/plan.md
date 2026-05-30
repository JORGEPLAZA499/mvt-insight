## Igualar el tamaño de todas las tarjetas del hero

Actualmente la tarjeta **"Nivel de amenaza global"** ocupa el doble de ancho (`lg:col-span-2`) que las 3 mini-tarjetas apiladas a su derecha, por eso se ve desproporcionada.

### Cambios

**`src/routes/dashboard.tsx`**
- Cambiar el grid hero de `lg:grid-cols-3` con `col-span-2` a un grid de **4 columnas iguales** (`lg:grid-cols-4`), donde cada tarjeta ocupa 1 columna.
- Quitar el contenedor `flex flex-col` que apila las 3 mini-gauges verticalmente. Pasarán a estar en línea junto a la principal.
- Resultado: 4 tarjetas del mismo tamaño en fila (Nivel amenaza | Totales | Completados | Coincidencias).

**`src/components/gauge-clock.tsx`**
- Ajustar el `GaugeClock` para que se adapte a un contenedor más estrecho: reducir el tamaño del SVG (de ~grande a ~tamaño coherente con MiniGauge), centrar el contenido y mantener `h-full` para que la altura coincida con las mini-gauges.

**`src/components/mini-gauge.tsx`**
- Sin cambios estructurales; ya tienen `h-full`. Solo verificar que el padding interno coincida con el de GaugeClock para que se vean visualmente iguales.

### Sin cambios
- Lógica de datos, `stats`, tabla de análisis recientes, HUD pills, rutas, navegación.

### Resultado visual
```
┌──────────┬──────────┬──────────┬──────────┐
│  Nivel   │ Totales  │Completad │Coinciden │
│ amenaza  │          │          │   IOC    │
└──────────┴──────────┴──────────┴──────────┘
```
Todas con la misma anchura y altura.