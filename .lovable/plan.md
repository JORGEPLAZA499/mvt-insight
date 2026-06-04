## Contexto

La app desktop **ya implementa** el flujo correcto: cuando termina el análisis MVT, lee el ZIP local, lo parsea con `parseMvtFiles()` y envía solo el JSON resultante (pequeño, ~KB-MB) a `/api/public/desktop/submit-analysis`. Los 1.82 GB del backup nunca salen del equipo del usuario.

Lo que falta es: (a) cerrar el círculo abriendo el informe en el navegador automáticamente, y (b) retirar de la web la subida manual de ZIP grandes que nunca funcionará por el límite de Cloudflare Workers.

## Cambios

### 1. Desktop — apertura automática del informe (`desktop/src/App.tsx`)

En el `useEffect` que dispara `autoUpload`, cuando `upload.state` pase a `"done"`:
- Abrir `https://spyware.rpjsoftware.com/analysis/{analysisId}` con `window.mvt.openExternal(...)` automáticamente tras ~1.5s (delay corto para que el usuario vea el toast/mensaje de éxito).
- Mantener un botón "Abrir informe" en la pantalla `done` por si el navegador no se abre (fallback).

Sin cambios en el parser ni en el endpoint — ya funcionan.

### 2. Web — retirar subida manual

**`src/components/app-shell.tsx`** (sidebar):
- Eliminar el botón "Subida rápida" (input file + `handleQuickUpload` + estado `quickBusy` + ref `quickInputRef`).
- Eliminar imports ahora no usados: `parseMvtFiles`, `processAndStoreAnalysis`, `Zap`, `Loader2`, `UploadCloud` (donde solo se usaba ahí), constante `QUICK_MAX_SIZE`.
- Mantener el botón "Comprar créditos" en el mismo bloque.

**`src/routes/upload.tsx`**:
- Reemplazar la página entera por una pantalla "Analiza tu dispositivo" que explica el flujo y promueve la app de escritorio:
  - Título + explicación: "Por seguridad y rendimiento, el análisis se hace en tu equipo. Solo el informe (no tus datos) se sincroniza con la web."
  - Botón principal → `/settings/desktop` ("Descargar / vincular app de escritorio").
  - Lista corta de pasos (1. Descarga la app, 2. Vincúlala con tu cuenta, 3. Conecta el dispositivo, 4. Recibe el informe aquí).
- Eliminar dropzone, parser cliente, llamada a `processAndStoreAnalysis`.

**Entrada de navegación**: mantener el item "Nuevo análisis" del sidebar apuntando a `/upload` (ahora reconvertida en la página informativa). El badge "new" puede quedar.

### 3. i18n

- Añadir en `src/i18n/locales/es.json` y `en.json`:
  - `upload.desktopOnly.title`, `upload.desktopOnly.intro`, `upload.desktopOnly.cta`, `upload.desktopOnly.step1..4`, `upload.desktopOnly.security`.
- Eliminar/limpiar claves `shell.quick.*` que ya no se usen (o dejarlas si las usa otro sitio — revisar con grep antes de borrar).
- En `desktop/src/i18n/locales/{es,en}.json`: añadir `upload.openingReport` ("Abriendo informe en el navegador…").

### 4. Mantener intactos

- `src/lib/analyses.functions.ts` → el server fn `processAndStoreAnalysis` se queda (no rompe nada y permitiría reactivar la subida web en el futuro si quisieras). Si prefieres limpieza total, también puede borrarse — dime y lo elimino.
- Endpoint `/api/public/desktop/submit-analysis`: sin cambios.
- Función RPC `consume_credit_and_insert_analysis`: sin cambios (98 créditos sigue siendo el coste).

## Archivos afectados

- `desktop/src/App.tsx`
- `desktop/src/i18n/locales/es.json`, `en.json`
- `src/components/app-shell.tsx`
- `src/routes/upload.tsx`
- `src/i18n/locales/es.json`, `en.json`

## Versionado desktop

Per memoria: **no bumpeo** `desktop/package.json` ahora. Cuando me digas "publica" agruparé este cambio (apertura automática del informe) en una sola release.
