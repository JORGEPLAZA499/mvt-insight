## Generar paquete i18n descargable para la app de escritorio `mvt-insight`

### Objetivo
Entregar en `/mnt/documents/mvt-insight-i18n/` (y como `.zip`) todos los archivos necesarios para añadir soporte bilingüe ES/EN con autodetección + selector de banderas a la app Electron `mvt-insight`, listos para pegar en su repo.

### Archivos a generar

1. `src/i18n/index.ts` — config i18next con detector custom: localStorage → `window.electronAPI.getSystemLocale()` → fallback EN.
2. `src/i18n/locales/es.json` y `src/i18n/locales/en.json` — diccionarios con claves para botones, fases de análisis, errores y diálogos.
3. `src/components/LanguageSelector.tsx` — selector con banderas SVG inline (ES + GB), igual al de la web.
4. `electron/preload.cjs` — expone `window.electronAPI.getSystemLocale()` via `contextBridge`.
5. `electron/main.patch.cjs` — snippet con el `ipcMain.handle('get-system-locale', () => app.getLocale())` para añadir al main existente.
6. `src/main.patch.tsx` — snippet con el import de `./i18n` y el montaje del `LanguageSelector`.
7. `README-i18n.md` — instalación (`npm install i18next react-i18next`), ubicación de archivos, ejemplo de uso (`{t('app.startAnalysis')}`), cómo añadir más idiomas.

### Comportamiento (Opción C)
- Primer arranque: lee idioma del SO via Electron → ES si empieza por `es`, EN en otro caso.
- Cambio manual: guardado en `localStorage`, aplicado al instante.
- Arranques siguientes: respeta la elección guardada.

### Entrega
- Carpeta `/mnt/documents/mvt-insight-i18n/` con todos los archivos.
- `mvt-insight-i18n.zip` para descarga única.
- Tag `<presentation-artifact>` para el zip al final.

### Notas
- No se modifica nada del proyecto actual (es un paquete externo).
- Si la estructura del repo `mvt-insight` difiere, solo cambian rutas — el código es válido para Electron + React estándar.