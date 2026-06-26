## Objetivo
Eliminar las ventanas/avisos flotantes (azul, ámbar, rojo) que aparecen dentro de la tarjeta de progreso y consolidar toda la información del estado del análisis en una sola línea coherente bajo la fase activa, mostrando datos reales cuando existan.

## Cambios

### 1. `desktop/src/App.tsx` — limpiar la tarjeta de progreso
- Eliminar los tres bloques estilizados que se renderizan dentro del `(() => { ... })()` en el área de fase activa:
  - Aviso azul "Recolectando archivos del dispositivo… X transferidos…"
  - Aviso ámbar "Sin actividad de androidqf/mvt-ios desde hace N min…"
  - Aviso rojo "Llevamos N min sin detectar cambios…"
- Eliminar también el panel amarillo de `failedModules` que aparece flotante (se moverá a un resumen al final del análisis, no durante).
- En su lugar, mostrar **una sola línea sutil** (mismo color/estilo que el cronómetro `⏱`) debajo del texto principal de la fase, con jerarquía:
  1. Si la fase es "analyzingAppsCount" → `Analizando aplicaciones (12/87 · 14%)` calculado del `data` real que ya envía `main.cjs`.
  2. Si hay `activity.bytes > 0` y la fase es de recolección → añadir como sufijo discreto: `· 245 MB recolectados`.
  3. Si llevamos > 8 min sin actividad de disco y sin logs → cambiar el texto a `Procesando… esta fase puede tardar varios minutos` (sin color de alerta, solo muted).
  4. Si llevamos > 15 min sin actividad → mostrar inline en rojo discreto, dentro de la misma línea: `Sin cambios desde hace N min — puedes cancelar si tu disco no muestra actividad`. Sin caja, sin borde.

### 2. `desktop/src/App.tsx` — módulos fallidos
- Acumular `failedModules` silenciosamente durante el análisis (sin mostrarlos).
- Mostrarlos solo en la pantalla final de resultado, como nota informativa: "N módulos no disponibles en este dispositivo: …" — no como interrupción visual durante el progreso.

### 3. `desktop/electron/main.cjs` — progreso real más fiable
- Mantener el contador `appsDone/appsTotal` ya existente.
- Cuando `appsTotal` aún no se conoce pero ya se están viendo paquetes, emitir `data: { current: appsDone, total: null }` para que la UI muestre `Analizando aplicaciones (12)` sin porcentaje falso.
- Para fases sin datos cuantificables (backup, dumpsys, compresión de iOS), no mover la barra de progreso de forma simulada: dejarla en el valor de inicio de la fase y que la UI muestre `Procesando…` como subtítulo honesto.

### 4. Traducciones (`es.json` / `en.json`)
- Añadir/ajustar claves: `running.subline.apps`, `running.subline.bytes`, `running.subline.longPhase`, `running.subline.stalled`.
- Eliminar las claves ya no usadas: `running.activity.collecting`, `running.activity.frozen`, `running.activity.frozenHint`, `running.idleWarning.*`, `running.moduleFailed.*` (estas últimas se reusan en la pantalla final).

### 5. Versión
- Bump `desktop/package.json` a **1.0.50** (única release que agrupa estos cambios), siguiendo la regla del proyecto de bumpear solo cuando el usuario pida publicar.

## Resultado visual esperado

```
✓  Descargando AndroidQF
✓  Conectando con el dispositivo
●  Recolectando datos
   Analizando aplicaciones (47/120 · 39%) · 312 MB recolectados
   ⏱ 2:14
4  Empaquetando informe
```

Sin cajas azules, sin avisos flotantes, sin porcentajes inventados.

## Pendiente de confirmación
¿Bumpeamos a 1.0.50 ahora junto con estos cambios para publicar, o lo dejas para una release posterior?
