## Contexto

El tutorial web (`/upload`, paso 3 → substeps) sigue diciéndole al usuario que pulse «Subir al informe» y arrastre el ZIP manualmente. Desde la v1.0.21 la app de escritorio ya sube el análisis sola en cuanto está vinculada con la cuenta (`/settings/desktop`) y abre el informe en el navegador. El paso 8 («Sube el ZIP generado por la app») y el botón final «Ya tengo el ZIP» ya no encajan.

Además el paso 7 (`run`) acaba con «la app te indicará dónde se ha guardado el ZIP», que también está obsoleto.

## Cambios propuestos

### 1. Paso 8 — reescribir
Cambiar `upload.step3.substeps.upload` en `src/i18n/locales/{es,en}.json`:

- **Título nuevo (es):** «La app subirá el informe sola»
- **Cuerpo nuevo (es):** Al terminar el análisis, la app de escritorio sube automáticamente los resultados a tu cuenta y abre el informe en el navegador. Si aún no has vinculado el escritorio con tu cuenta, hazlo en `Ajustes → Escritorio` (botón «Generar código»).
- Añadir nota fallback: «¿La app no lo subió? Pulsa el botón de abajo para subir el `.zip` a mano.»

### 2. Paso 7 — afinar
En `upload.step3.substeps.run.body` quitar «la app te indicará dónde se ha guardado el ZIP» y reemplazar por «cuando termine, la app subirá los resultados sola y abrirá el informe».

### 3. Botón final del tutorial
En `src/routes/upload.tsx` el botón `isLast` muestra `t("upload.step3.done")` («Ya tengo el ZIP»). Cambiar la cadena a «Subir ZIP a mano» (es) / «Upload ZIP manually» (en) para reflejar que ese paso pasa a ser un fallback opcional, no la vía principal. La lógica (`onDone → step 4`) se mantiene.

### 4. i18n EN
Aplicar los mismos textos traducidos a `src/i18n/locales/en.json` (mismas claves).

## Lo que NO toco
- `desktop/` (la subida automática ya está).
- Versión `desktop/package.json` (sigue en `1.0.22`, no bumpeo).
- Paso 4 (`StepUpload`, drop-zone manual) — queda accesible como fallback.
- Backend, migraciones, RLS.

## Alternativa a decidir
¿Prefieres que el botón final lleve a `/history` (donde aparecerá el informe en cuanto la app lo suba) en vez de a la drop-zone manual? Es un cambio de 1 línea (`onDone={() => navigate({ to: "/history" })}`) y elimina por completo la fricción de la subida manual del flujo principal. Dilo y lo incluyo.
