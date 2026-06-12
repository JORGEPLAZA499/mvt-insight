# Aviso de créditos insuficientes ANTES del análisis

Hoy la app de escritorio ejecuta el análisis completo (descarga AndroidQF / backup iOS, etc.) y solo al subir el ZIP al servidor recibe `INSUFFICIENT_CREDITS`, mostrando el aviso en pantalla "Análisis completado". Resultado: el usuario pierde tiempo y ya no puede subir el informe.

## Cambios

**`desktop/src/App.tsx`**

1. Añadir constante `ANALYSIS_COST = 98` (mismo valor que la web).
2. Crear helper `refreshCredits()` que, si hay token, llama a `GET /api/public/desktop/whoami` y actualiza `account.credits`. Devuelve los créditos actuales.
3. En la pantalla `welcome`, justo antes de lanzar Android (`start("android")`) o iOS (`handleIosStart` → `start("ios", …)`):
   - Si hay cuenta vinculada, llamar a `refreshCredits()` para tener el saldo fresco.
   - Si `credits < ANALYSIS_COST`, **no iniciar** el análisis y mostrar un modal/alert con el mensaje "No te quedan créditos suficientes (necesitas N, tienes X). Recarga créditos en tu panel antes de continuar." y un botón "Abrir panel" que abra `${WEB_BASE_URL}/dashboard` con `window.mvt.openExternal`.
   - Si no hay cuenta vinculada, mantener el comportamiento actual (no se sube, solo se guarda local).
4. Reutilizar el badge superior: tras `refreshCredits()`, el contador de créditos del `AccountBadge` queda actualizado automáticamente.

**i18n (`desktop/src/i18n/locales/{es,en}.json`)**

Añadir claves:
- `credits.insufficientTitle` — "Créditos insuficientes" / "Not enough credits"
- `credits.insufficientBody` — "Necesitas {{required}} créditos y solo tienes {{available}}. Recarga créditos en tu panel antes de iniciar el análisis."
- `credits.openDashboard` — "Abrir panel" / "Open dashboard"
- `credits.cancel` — "Cancelar" / "Cancel"

## Detalles técnicos

- Implementar el aviso como un pequeño modal inline (mismo patrón visual que las otras tarjetas), no `window.confirm`, para poder incluir el botón "Abrir panel".
- Estado nuevo: `const [creditsWarning, setCreditsWarning] = useState<{ required: number; available: number; pending: () => void } | null>(null)`. `pending` se ignora (no se reanuda); solo dejamos cerrar.
- No tocar el flujo de subida posterior (`autoUpload`) — sigue siendo defensa en profundidad si los créditos cambian entre check y subida.
- No tocar `desktop/package.json > version` (regla de proyecto: solo se bumpea cuando el usuario pide "publica").
