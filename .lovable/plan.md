## Cambio

Hacer que la pantalla **«Vincular cuenta»** sea la primera vista cuando la app arranca sin token guardado, en vez de mostrar directamente las tarjetas Android / iPhone. Una vez vinculada (o si ya había token válido), la app cae al `welcome` actual con las dos tarjetas.

## Implementación (un solo archivo: `desktop/src/App.tsx`)

1. **Forzar pantalla de link al arranque sin cuenta.** En el `useEffect` que carga el token y llama a `/whoami` (líneas 87-115), cuando termina sin `account`, hacer `setScreen("link")` antes de marcar `authChecked = true`. Si hay `account`, dejar `welcome` como ahora.
2. **Estado de carga.** Mientras `!authChecked`, renderizar un placeholder mínimo (logo + spinner) para evitar el parpadeo de la pantalla `welcome` antes de decidir.
3. **Ocultar «Cancelar» en el primer arranque.** En la vista `link`, mostrar el botón Cancelar solo cuando ya hay `account` (entrada manual desde el topbar). Si no hay cuenta, el único camino es vincular o cerrar la app.
4. **Tras vincular** (`handleLink` línea 265): ya hace `setScreen("welcome")` → mostrará las tarjetas. Sin cambios.

## Lo que NO toco
- Backend, RLS, server functions, web `/settings/desktop`.
- Tutorial web `/upload`.
- `desktop/package.json > version` (sigue `1.0.22` hasta que digas «publica»).

## Decisión pendiente

¿Quieres un escape «Continuar sin vincular» en el primer arranque (útil sin internet o para usar la app sin subir)? Mi recomendación: **no** — si la app está pensada para subir el ZIP automáticamente, forzar la vinculación elimina confusión. Dilo si prefieres el escape.
