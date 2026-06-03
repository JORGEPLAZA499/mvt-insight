# Subida automática desktop → web (implementado)

## Estado
- Migración aplicada: `desktop_pairing_codes`, `desktop_tokens` (RLS por dueño).
- Server fns web: `createPairingCode`, `listDesktopTokens`, `revokeDesktopToken` en `src/lib/desktop-pairing.functions.ts`.
- Rutas públicas: `/api/public/desktop/{pair,whoami,submit-analysis}`.
- Página web: `/settings/desktop` (genera código + lista/revoca dispositivos). Enlace en sidebar.
- Desktop: `desktop/src/lib/{mvt-parser,mvt-modules}.ts` (copia de la web), `jszip` añadido a `package.json`.
- IPC nuevos en `desktop/electron/main.cjs`: `auth:get/save/clear` (safeStorage) y `mvt:readZip`.
- `preload.cjs` y `main.tsx` tipados.
- `desktop/src/App.tsx`: pantalla `link`, topbar de cuenta, subida automática tras análisis con estados uploading/done/error, link "Ver informe →" abre `/analysis/<id>`.

## Flujo
1. Usuario web (autenticado) → `/settings/desktop` → "Generar código" → 8 chars, TTL 10 min.
2. Desktop sin cuenta → muestra botón "Vincular cuenta" → pantalla link → POST `/api/public/desktop/pair` → recibe `dt_…` → guarda con `safeStorage`.
3. `whoami` resuelve email + créditos al arrancar.
4. Tras análisis: `readZip` → parseo local → POST `/api/public/desktop/submit-analysis` → RPC `consume_credit_and_insert_analysis` → muestra "Ver informe →".
5. Errores: 401 → limpia token y vuelve a vincular. INSUFFICIENT_CREDITS → botón "Recargar créditos".

## Versión
- Sigue en `1.0.21`. No bumpeo hasta orden explícita "publica".

## Pendientes (no incluidos por petición del usuario)
- Storage del ZIP en servidor.
- Labels personalizables al vincular.
- Notificaciones de sistema.
