
# Identificación del prestador + adaptación a jurisdicción irlandesa

## Datos a inyectar
- **Razón social:** RPJ SOFTWARE INNOVATION LIMITED
- **Domicilio:** 54 Parnell Square West, Dublín, Irlanda — D01 H0X9
- **Email legal / contacto:** info@rpjsoftware.com
- **País:** Irlanda (jurisdicción aplicable)

## Cambios en `src/lib/legal-text.server.ts`

1. **Reemplazar placeholders** en ambos idiomas (ES + EN):
   - `[RAZÓN SOCIAL]` → `RPJ SOFTWARE INNOVATION LIMITED`
   - `[DIRECCIÓN]` → `54 Parnell Square West, Dublin, Ireland, D01 H0X9`
   - `[EMAIL_LEGAL]` → `info@rpjsoftware.com`
   - `[CIUDAD]` → `Dublín` / `Dublin`
   - **Eliminar `[NIF]`** (es un identificador español; no aplica). En su lugar dejo una línea opcional `Company Registration Number: [pendiente]` comentada — si tienes el CRO irlandés (número del Companies Registration Office) lo añades luego sin necesidad de re-aceptación si es un cambio meramente informativo; pero recomiendo dármelo para máxima limpieza.

2. **Adaptar marco jurídico a Irlanda/UE** (sustituye las referencias españolas que había en el borrador):
   - **Ley aplicable y fuero:** legislación de Irlanda; tribunales de Dublín, sin perjuicio de los derechos imperativos del consumidor en su país de residencia dentro de la UE (Reglamento Roma I art. 6).
   - **Protección de datos:** RGPD (UE) 2016/679 + Irish Data Protection Act 2018. RPJ Software Innovation Ltd. actúa como Responsable del Tratamiento. Derechos de acceso, rectificación, supresión, oposición, portabilidad y limitación se ejercen vía `info@rpjsoftware.com`. Autoridad de control: Data Protection Commission (Irlanda) — `dataprotection.ie`.
   - **Comercio electrónico:** Directiva 2000/31/CE + EU Regulations 2003 (S.I. No. 68/2003) en lugar de la LSSI-CE española.
   - **Consumo / no reembolso:** Directiva 2011/83/UE (Consumer Rights) art. 16(m) + European Union (Consumer Information, Cancellation and Other Rights) Regulations 2013 — renuncia expresa al derecho de desistimiento sobre contenido digital iniciado con consentimiento previo.
   - **Valor probatorio del comprobante:** Reglamento eIDAS (UE) 910/2014 (directamente aplicable en Irlanda) + Electronic Commerce Act 2000 (Irlanda) — reconocimiento de firma electrónica y registros electrónicos como prueba admisible.

3. **Subir `CURRENT_LEGAL_VERSION`** a `2026-06-13` (o la fecha del despliegue) para forzar re-aceptación a cualquier usuario que hubiese aceptado una versión previa con placeholders.

## Lo que NO cambia (ya está implementado y funcionando)
- El usuario sigue sin introducir absolutamente ningún dato. Solo lee, hace scroll y marca dos casillas.
- Captura automática (sin acción del usuario): `user_id`, `acepted_at` UTC, `IP`, `User-Agent`, `locale`, `version`, `SHA-256` del texto, firma `HMAC-SHA256` con `LEGAL_SIGNING_SECRET`.
- Tabla `legal_acceptances` append-only (trigger bloquea UPDATE/DELETE).
- Admin verá icono ⚖️ verde/ámbar/rojo y podrá descargar el PDF probatorio.

## Verificación post-cambio
1. Login con usuario existente que ya había aceptado → modal aparece de nuevo (versión nueva).
2. Aceptar → nueva fila en `legal_acceptances`, `accounts.legal_accepted_version = '2026-06-13'`.
3. Descargar PDF en admin → encabezado muestra "RPJ Software Innovation Limited · Dublin", firma `verified: true`.
4. El texto legal en ES y EN ya no contiene `[...]` ni referencias a ley española.

## Pendiente opcional (tú decides)
- **CRO Number** (Companies Registration Office de Irlanda). Útil pero no bloqueante. Si me lo das, lo incluyo y subo otra vez la versión.
- ¿Quieres que la **ley aplicable** sea Irlanda (recomendado al ser tu sede) o España (porque operas en mercado hispanohablante)? Por defecto plan = **Irlanda**, que es lo coherente con tu domicilio social y te da el escudo jurídico más fuerte como prestador.
