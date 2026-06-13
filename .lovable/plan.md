## Objetivo

Forzar que cada cliente acepte los términos legales (uso del servicio + términos de pago) la primera vez que entra al panel, almacenar un comprobante jurídicamente vinculante, y permitir al admin consultarlo desde el listado de usuarios mediante un icono de justicia (⚖️).

## 1. Base de datos (migración)

Nueva tabla `public.legal_acceptances` que actúa como **comprobante jurídico inmutable**:

- `id uuid PK`
- `user_id uuid` → `auth.users(id)` ON DELETE CASCADE
- `user_code text` (snapshot del código del usuario al momento)
- `document_version text` (ej. `"2026-06-13"`) — versión del texto aceptado
- `document_hash text` — SHA-256 del texto completo aceptado, garantiza integridad
- `document_text text` — copia íntegra del texto aceptado (no se referencia, se guarda)
- `accepted_at timestamptz default now()`
- `ip_address text` — IP del cliente (capturada server-side)
- `user_agent text`
- `locale text` (es/en)
- `acceptance_method text` default `'explicit_checkbox_click'`
- `signature text` — firma generada por el servidor: HMAC-SHA256 sobre `user_id|version|hash|accepted_at|ip` usando un secret server-side. Esto impide manipulación posterior.

Reglas:
- Tabla **append-only**: solo INSERT, sin UPDATE/DELETE para usuarios. Trigger `BEFORE UPDATE/DELETE` que aborta.
- RLS: usuario puede SELECT/INSERT solo sus propias filas; admin puede SELECT todas; service_role acceso total.
- GRANT correspondientes.
- Índice por `user_id` y `accepted_at desc`.

Se añade también columna `accounts.legal_accepted_version text` (nullable) para gating rápido sin join: si es NULL o distinta de la versión actual, se exige aceptar de nuevo. Se actualiza dentro de la misma transacción del INSERT vía función `record_legal_acceptance` SECURITY DEFINER.

## 2. Server functions (`src/lib/legal.functions.ts`)

- `getCurrentLegalDocument()` → devuelve `{ version, locale, text, hash }` del texto vigente (texto se construye server-side desde una constante en `src/lib/legal-text.server.ts` para que el hash sea fiable).
- `getMyLegalStatus()` (auth) → `{ accepted: boolean, currentVersion, acceptedVersion }`.
- `acceptLegalTerms({ version, hash, locale })` (auth) → valida que `version`+`hash` coinciden con el documento vigente, captura IP (`getRequest().headers.get('cf-connecting-ip')` con fallbacks `x-forwarded-for`, `x-real-ip`), UA, calcula firma HMAC con `LEGAL_SIGNING_SECRET`, llama RPC `record_legal_acceptance`.
- `adminListUserAcceptances({ userId })` (auth + check admin) → lista comprobantes del usuario.
- `adminGetAcceptance({ id })` (auth + admin) → comprobante completo + verificación de firma (`verified: true/false`).

Nuevo secret: `LEGAL_SIGNING_SECRET` (se añadirá vía secrets tool).

## 3. UI: modal bloqueante en primer login

Nuevo componente `src/components/legal-acceptance-modal.tsx`:

- Dialog **no cerrable** (sin botón X, sin click-outside, sin Escape).
- Muestra el texto legal completo en un área scrolleable con `data-testid="legal-text"`.
- Dos checkboxes obligatorios:
  1. "He leído y acepto los Términos de Uso y la Política de Privacidad."
  2. "He leído y acepto los Términos de Pago, política de no reembolso y consumo de créditos."
- Botón "Aceptar y continuar" deshabilitado hasta marcar ambos + haber hecho scroll hasta el final.
- Muestra metadatos que quedarán registrados: fecha/hora, versión del documento, código de usuario, IP detectada (informativo).
- Al confirmar llama `acceptLegalTerms`; en éxito cierra modal y refresca status.
- Texto disponible en es/en (i18n).

Integración en `src/routes/dashboard.tsx`: al montar, tras conocer al usuario, llamar `getMyLegalStatus`; si `accepted=false` montar el modal por encima de todo el panel. También se monta en `/upload`, `/history`, `/reports`, `/analysis/$id`, `/settings/desktop` mediante un hook `useLegalGate()` colocado en `_authenticated/route.tsx` (o equivalente) — un solo punto. Si la ruta `_authenticated` no existe en este proyecto, se añade el hook directamente al `AppShell`.

## 4. Texto legal (`src/lib/legal-text.server.ts`)

Texto extenso y defensivo, redactado para proteger al operador. Estructura (es + en):

1. **Identidad del prestador** y naturaleza del servicio (análisis forense informativo, no constituye prueba judicial por sí mismo salvo peritaje adicional).
2. **Uso lícito obligatorio**: usuario declara ser propietario o tener autorización expresa para analizar el dispositivo. Prohibido uso para espiar terceros sin consentimiento. El cliente es único responsable legal.
3. **Limitación de responsabilidad**: servicio "AS IS", sin garantía de detección al 100%, sin responsabilidad por daños directos/indirectos, lucro cesante, pérdida de datos.
4. **Privacidad**: qué datos se almacenan, base legal (consentimiento + ejecución de contrato), derechos GDPR/LOPD, retención, no venta a terceros.
5. **Términos de pago**:
   - Precios en EUR/USD, impuestos incluidos según jurisdicción.
   - Compra de créditos = servicio digital de ejecución inmediata → **renuncia expresa al derecho de desistimiento** (art. 103.m RDL 1/2007 España / equivalente UE).
   - **No reembolsable** una vez consumidos; créditos no consumidos reembolsables solo en 14 días si no se ha usado ningún crédito y no se ha iniciado el servicio.
   - Caducidad de créditos: nunca caducan salvo cierre de cuenta por inactividad > 24 meses.
   - Contracargos abusivos → suspensión + posible reclamación.
   - Pagos cripto (Plisio) son irreversibles por naturaleza; cliente lo acepta.
6. **Propiedad intelectual** del software e informes.
7. **Indemnidad**: cliente mantiene indemne al prestador frente a reclamaciones de terceros derivadas de uso indebido.
8. **Ley aplicable y jurisdicción**: legislación española, juzgados de [ciudad a confirmar — placeholder editable].
9. **Modificaciones**: cambios requieren nueva aceptación; el comprobante de aceptación previa queda archivado.
10. **Constancia electrónica**: el cliente reconoce que su clic + checkbox + registro de IP/UA/timestamp + firma HMAC constituyen **manifestación de consentimiento conforme al Reglamento eIDAS (UE) 910/2014** como firma electrónica simple con valor probatorio.

Cada texto trae un `version` (fecha ISO) y se hashea SHA-256 al servir.

## 5. Panel admin

`src/routes/admin.tsx` (ClientsTab): nueva columna "Legal" con icono `Scale` (lucide). Estado:
- ✅ verde si versión actual aceptada.
- ⚠️ amarillo si aceptó versión anterior.
- ❌ rojo si nunca aceptó.

Click en el icono abre nuevo dialog `LegalAcceptanceViewer` que llama `adminListUserAcceptances` y muestra cada comprobante con: versión, fecha, IP, UA, locale, hash, firma, badge "Firma verificada ✓" o "INVÁLIDA ✗", y botón "Descargar PDF". El PDF (jsPDF, reusando estilo de `pdf-report.ts`) incluye texto íntegro + metadatos + firma → es el documento jurídico descargable.

Nueva server fn `adminExportAcceptancePdf` opcional, o generación cliente-side desde los datos recibidos.

## 6. i18n

Añadir claves en `src/i18n/locales/{es,en}.json` para el modal, botones, dialog admin y labels de estado.

## 7. Verificación

- Login con cuenta nueva → modal bloquea dashboard, no permite navegar.
- Aceptar → fila en `legal_acceptances`, `accounts.legal_accepted_version` actualizado, modal no vuelve a aparecer.
- Admin ve icono ⚖️ verde, abre viewer, ve comprobante, descarga PDF.
- Intentar UPDATE/DELETE manual sobre `legal_acceptances` → trigger aborta.
- Manipular fila → re-verificar firma HMAC devuelve `verified:false`.

## Notas técnicas

- Modal NO cerrable: `<Dialog>` con `onOpenChange` ignorado, sin `<DialogClose>`, `onEscapeKeyDown`/`onPointerDownOutside` con `e.preventDefault()`.
- IP capturada solo server-side, nunca confiar en cliente.
- Texto legal es **boilerplate defensivo**, no asesoramiento jurídico; se recomendará al usuario que un abogado lo revise antes de producción (lo indicaré al entregar).
- Ciudad de jurisdicción + razón social del prestador quedan como placeholders `[RAZÓN SOCIAL]` / `[CIUDAD]` que el usuario debe rellenar antes de publicar.

## Preguntas abiertas (responder antes o durante implementación)

1. ¿Razón social, NIF/CIF y dirección del prestador para incluir en el texto?
2. ¿Ciudad/jurisdicción para cláusula de fuero?
3. ¿Email de contacto legal/DPO?

Si prefieres, dejo placeholders `[RAZÓN SOCIAL]`, `[NIF]`, `[CIUDAD]`, `[EMAIL_LEGAL]` y los rellenas tú después editando un único archivo (`src/lib/legal-text.server.ts`).
