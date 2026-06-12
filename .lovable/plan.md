Ajustar los mensajes de tiempo estimado del análisis para reflejar la duración real según plataforma.

## Cambios

1. **desktop/src/App.tsx**
   - Línea ~629: cambiar el subtítulo genérico `running.subtitle` por un mensaje condicional según el dispositivo seleccionado (`device === "android"` vs `"ios"`).

2. **desktop/src/i18n/locales/es.json**
   - Agregar `running.subtitle.android`: "No cierres esta ventana. Tarda entre 5 y 15 minutos."
   - Agregar `running.subtitle.ios`: "No cierres esta ventana. Puede tardar entre 15 y 40 minutos según el tamaño del backup."
   - El texto actual `running.subtitle` se conserva como fallback por compatibilidad.

3. **desktop/src/i18n/locales/en.json**
   - Agregar `running.subtitle.android`: "Don't close this window. It takes between 5 and 15 minutes."
   - Agregar `running.subtitle.ios`: "Don't close this window. It may take 15–40 minutes depending on backup size."

## Por qué
- iOS ahora implica: crear backup (5-15 min) → descifrar backup (2-5 min) → MVT-iOS check-backup sobre todos los módulos (10-30 min). En backups grandes esto fácilmente excede los "5-15 minutos" anteriores.
- Android sigue siendo realmente 5-15 min.
- Separando por plataforma evita que usuarios de Android vean un mensaje pesimista, y usuarios de iOS no piensen que la app está colgada.