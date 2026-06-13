# Sistema de aceptación legal con valor jurídico

## Resumen
Al entrar por primera vez al panel de control, el usuario verá un modal **bloqueante** con los términos legales (uso del servicio + condiciones de pago). Solo podrá continuar tras leerlos y aceptar dos casillas obligatorias. La aceptación se guarda como **comprobante firmado digitalmente** (HMAC-SHA256 con `LEGAL_SIGNING_SECRET`), inmutable, con IP, user-agent, fecha, versión del documento y hash SHA-256 del texto exacto aceptado — válido como prueba electrónica conforme al Reglamento eIDAS (UE) 910/2014 y la Ley 6/2020 española.

El admin verá en el listado de usuarios un icono ⚖️ (Scale) con estado de aceptación y podrá descargar el comprobante en PDF.

## Qué se va a construir

### 1. Texto legal (defensivo, en `src/lib/legal-text.server.ts`)
Documento estructurado en 10 secciones, redactado para máxima protección del prestador:

1. **Identidad del prestador** — placeholders `[RAZÓN SOCIAL]`, `[NIF]`, `[DIRECCIÓN]`, `[EMAIL_LEGAL]`, `[CIUDAD]` que rellenarás después.
2. **Objeto y aceptación** — el uso del servicio implica aceptación plena.
3. **Uso lícito y prohibiciones** — el usuario declara bajo su responsabilidad que tiene autorización legal para analizar los dispositivos/archivos que sube; uso exclusivo en equipos propios o con consentimiento expreso del titular; prohibido espionaje, acoso, vigilancia ilegal o cualquier infracción del RGPD/LOPDGDD.
4. **Limitación de responsabilidad** — el servicio se presta "tal cual"; resultados son orientativos, no constituyen prueba pericial salvo informe firmado aparte; prestador no responde de daños indirectos, lucro cesante, pérdida de datos ni uso indebido por parte del usuario; indemnidad del prestador frente a reclamaciones de terceros causadas por el usuario.
5. **Privacidad y protección de datos** — base legal (ejecución de contrato + consentimiento), datos tratados, conservación, derechos ARCO-POL, encargados de tratamiento (Lovable Cloud / Supabase como proveedores).
6. **Condiciones de pago** — precios IVA incluido, métodos (Stripe + criptomonedas vía Plisio), créditos no reembolsables salvo defecto técnico imputable al prestador, **renuncia expresa al derecho de desistimiento** (art. 103.m TRLGDCU: contenido digital iniciado con consentimiento previo y conocimiento de pérdida del derecho), facturación electrónica.
7. **Propiedad intelectual** — todo el software, marca, código y diseño pertenecen al prestador; el usuario recibe licencia limitada, no exclusiva, no transferible.
8. **Modificaciones del servicio y precios** — el prestador puede modificar con preaviso de 15 días.
9. **Ley aplicable y fuero** — legislación española; juzgados de `[CIUDAD]`, sin perjuicio del fuero del consumidor.
10. **Validez del comprobante electrónico** — el usuario reconoce expresamente el valor probatorio de la firma electrónica HMAC y los metadatos registrados (eIDAS / Ley 6/2020 / art. 326.3 LEC).

Cada documento tiene `version` (fecha ISO ej. `2026-06-13`) y se calcula `SHA-256` al servirlo. Versiones nuevas obligan a re-aceptar.

### 2. Server functions (`src/lib/legal.functions.ts`)
- `getCurrentLegalDocument({ locale })` — devuelve `{ version, hash, text, locale }`.
- `getMyLegalStatus()` — `requireSupabaseAuth`; compara `accounts.legal_accepted_version` con versión vigente → `{ needsAcceptance: boolean, currentVersion }`.
- `acceptLegalTerms({ version, hash, locale })` — `requireSupabaseAuth`; valida que `hash` coincide con el documento servido, captura IP (`getRequestIP`) y User-Agent (`getRequestHeader`), genera firma HMAC-SHA256 sobre `user_id|version|hash|accepted_at|ip|ua`, llama RPC `record_legal_acceptance`.
- `adminListLegalAcceptances({ userId })` — `requireSupabaseAuth` + check `has_role admin` (o `is_admin`); lista comprobantes del usuario.
- `adminGetLegalAcceptance({ id })` — devuelve comprobante completo + `verified: boolean` recalculando HMAC.

### 3. Modal de aceptación (`src/components/legal-acceptance-modal.tsx`)
- `Dialog` de shadcn **no cerrable** (sin botón X, sin cierre por ESC ni clic fuera).
- Header con título "Términos legales y condiciones de pago".
- Cuerpo con scroll: renderiza el texto del documento. Detecta scroll al final para habilitar el botón.
- Dos checkboxes obligatorios:
  - ☐ He leído y acepto los **Términos de uso del servicio**.
  - ☐ He leído y acepto las **Condiciones de pago y no reembolso**.
- Botón "Aceptar y continuar" deshabilitado hasta: scroll completo + ambas casillas marcadas.
- Al confirmar: llama `acceptLegalTerms`, invalida queries y cierra.
- Mientras `needsAcceptance: true`, el contenido del dashboard se oculta detrás del modal.

### 4. Integración en el Dashboard (`src/routes/_authenticated/dashboard.tsx` o equivalente)
- Al montar, ejecuta `useQuery(getMyLegalStatus)`.
- Si `needsAcceptance` → renderiza `<LegalAcceptanceModal />` por encima del contenido.

### 5. Panel admin (`src/routes/admin.tsx` — listado de usuarios)
- Nueva columna **"Legal"** con icono `Scale` de `lucide-react`:
  - ✅ verde si versión aceptada == vigente
  - ⚠️ ámbar si aceptó una versión anterior
  - ❌ rojo si nunca aceptó
- Clic en el icono → abre `<LegalAcceptanceViewer userId={...} />` (Dialog):
  - Tabla de comprobantes (fecha, versión, IP, método).
  - Detalle expandido con firma, verificación HMAC ("Firma verificada ✓" / "Firma inválida ✗"), texto completo aceptado.
  - Botón **"Descargar comprobante PDF"** → genera PDF con `jsPDF` reutilizando el estilo de `pdf-report.ts`, incluyendo encabezado del prestador, datos del usuario, texto íntegro aceptado, metadatos (versión, hash, IP, UA, fecha UTC), firma HMAC y nota de valor jurídico (eIDAS).

### 6. i18n
Añade claves a `src/locales/es.json` y `src/locales/en.json` para títulos, checkboxes, botones, estados de admin y mensajes de error.

## Detalles técnicos

- **Base de datos**: ya creada en las migraciones previas (`legal_acceptances` append-only + trigger + RPC `record_legal_acceptance` + `accounts.legal_accepted_version`). No se requieren nuevas migraciones.
- **Firma HMAC**: `crypto.createHmac('sha256', process.env.LEGAL_SIGNING_SECRET).update(payload).digest('hex')`, calculada **en el servidor** dentro de `acceptLegalTerms`. Para verificar, se reconstruye `payload` desde la fila guardada y se compara con `timingSafeEqual`.
- **IP/UA**: `getRequestIP({ xForwardedFor: true })` + `getRequestHeader('user-agent')` desde `@tanstack/react-start/server`.
- **Hash documento**: `crypto.createHash('sha256').update(text).digest('hex')` — devuelto por `getCurrentLegalDocument` y verificado en `acceptLegalTerms` antes de insertar (rechaza si no coincide → impide aceptar texto manipulado en el cliente).
- **PDF**: `jsPDF` + `jsPDF-autotable` (ya presentes en el proyecto). Plantilla A4, fuente monoespaciada para hash/firma.
- **Admin check**: usar `is_admin(auth.uid())` ya existente en la DB.

## Verificación tras implementar
1. Login con usuario nuevo → modal aparece, dashboard bloqueado.
2. Intentar cerrar modal (ESC, clic fuera) → no se cierra.
3. Sin scroll completo → botón deshabilitado.
4. Aceptar → fila en `legal_acceptances`, `accounts.legal_accepted_version` actualizado, modal desaparece.
5. Recargar → modal no vuelve a aparecer.
6. Admin → icono ⚖️ verde junto al usuario; viewer muestra "Firma verificada ✓"; PDF descarga correctamente.
7. `UPDATE`/`DELETE` manual sobre `legal_acceptances` → aborta con "append-only".
8. Cambiar `LEGAL_SIGNING_SECRET` y reintentar verificación de fila vieja → "Firma inválida ✗" (esperado).

## Pendiente de ti (rellenable después)
Los placeholders `[RAZÓN SOCIAL]`, `[NIF]`, `[DIRECCIÓN]`, `[EMAIL_LEGAL]`, `[CIUDAD]` quedan en `src/lib/legal-text.server.ts`. Cuando los rellenes, **incrementa la `version`** del documento para forzar re-aceptación de todos los usuarios.
