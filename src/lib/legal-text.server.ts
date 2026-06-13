// Server-only legal documents source of truth.
// IMPORTANT: change `version` (ISO date string) whenever the text changes —
// every existing user will be required to re-accept.

export type LegalLocale = "es" | "en";

export interface LegalDocument {
  version: string;
  locale: LegalLocale;
  title: string;
  text: string;
}

const PROVIDER = {
  name: "[RAZÓN SOCIAL]",
  taxId: "[NIF]",
  address: "[DIRECCIÓN]",
  email: "[EMAIL_LEGAL]",
  city: "[CIUDAD]",
} as const;

const VERSION = "2026-06-13";

const ES_TEXT = `TÉRMINOS LEGALES Y CONDICIONES DE PAGO
Versión ${VERSION}

PRESTADOR DEL SERVICIO
Razón social: ${PROVIDER.name}
NIF / CIF: ${PROVIDER.taxId}
Domicilio: ${PROVIDER.address}
Contacto legal: ${PROVIDER.email}

1. OBJETO Y ACEPTACIÓN
1.1. El presente documento regula el acceso y uso del servicio "Spyware Forensic Analyzer" (en adelante, el "Servicio") prestado por ${PROVIDER.name}. El uso del Servicio, incluido el simple acceso al panel de control, implica la aceptación plena, expresa y sin reservas de todas y cada una de las cláusulas aquí recogidas.
1.2. El Usuario declara ser mayor de edad y disponer de plena capacidad jurídica para obligarse en los términos de este documento.

2. USO LÍCITO Y PROHIBICIONES
2.1. El Usuario se compromete a utilizar el Servicio exclusivamente para fines lícitos. El Servicio está diseñado como herramienta de análisis forense de dispositivos propios del Usuario o sobre los que disponga de autorización expresa, válida y verificable del titular legítimo.
2.2. El Usuario garantiza, bajo su exclusiva responsabilidad, que cualquier archivo, copia de seguridad o material que aporte al Servicio ha sido obtenido de forma lícita y que cuenta con la legitimación necesaria para someterlo a análisis conforme a la legislación aplicable (incluyendo, sin limitación, el Reglamento (UE) 2016/679 — RGPD, la Ley Orgánica 3/2018 — LOPDGDD y la legislación penal sobre intimidad y secreto de las comunicaciones).
2.3. Queda terminantemente prohibido el uso del Servicio con fines de espionaje, acoso, vigilancia ilegítima, control no consentido de personas, descubrimiento o revelación de secretos, o cualquier otra finalidad ilícita. El incumplimiento de esta cláusula constituye causa de resolución inmediata sin derecho a reembolso y faculta al Prestador para colaborar con las autoridades competentes.

3. LIMITACIÓN DE RESPONSABILIDAD
3.1. El Servicio se presta "TAL CUAL" y "SEGÚN DISPONIBILIDAD", sin garantía de ausencia de errores, de continuidad ininterrumpida ni de idoneidad para un fin concreto.
3.2. Los resultados del análisis son ORIENTATIVOS e informativos, basados en indicadores técnicos y reglas heurísticas (Mobile Verification Toolkit y derivados). NO constituyen prueba pericial, dictamen forense ni documento con valor probatorio autónomo salvo que el Prestador emita, a solicitud y mediante contrato separado, un informe pericial firmado por perito acreditado.
3.3. En la máxima medida permitida por la ley, el Prestador queda exonerado de toda responsabilidad por daños indirectos, lucro cesante, pérdida de datos, pérdida de oportunidad, daño reputacional o cualesquiera daños consecuenciales derivados del uso o imposibilidad de uso del Servicio, así como del uso indebido del Servicio por parte del Usuario o de terceros.
3.4. INDEMNIDAD. El Usuario mantendrá indemne al Prestador frente a cualquier reclamación, sanción, multa, costas judiciales u honorarios profesionales derivados de un uso del Servicio contrario a la ley, a estos Términos o a derechos de terceros.

4. PROTECCIÓN DE DATOS PERSONALES
4.1. Responsable del tratamiento: ${PROVIDER.name} (${PROVIDER.taxId}). Contacto: ${PROVIDER.email}.
4.2. Finalidad: prestación del Servicio, gestión de la cuenta, facturación, atención al usuario y cumplimiento de obligaciones legales.
4.3. Base legal: ejecución del contrato de prestación de servicios (art. 6.1.b RGPD), cumplimiento de obligaciones legales (art. 6.1.c) y consentimiento expreso del interesado para el tratamiento de los archivos aportados (art. 6.1.a).
4.4. Encargados de tratamiento: proveedores de infraestructura cloud (incluida la plataforma Lovable Cloud y sus proveedores subyacentes) con los que el Prestador mantiene los correspondientes contratos de encargo conforme al art. 28 RGPD.
4.5. Conservación: los datos se conservarán durante la vigencia de la relación contractual y, posteriormente, durante los plazos legales aplicables (especialmente los previstos en materia fiscal y mercantil).
4.6. Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad ante ${PROVIDER.email}. Reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).

5. CONDICIONES ECONÓMICAS Y DE PAGO
5.1. El Servicio se presta mediante un sistema de créditos prepago. Los precios aplicables son los publicados en la página de tarifas en el momento de la compra. Los precios incluyen los impuestos indirectos cuando proceda (IVA o equivalente).
5.2. Métodos de pago aceptados: tarjeta bancaria y otros métodos electrónicos procesados a través de pasarelas de pago seguras (incluido Stripe), así como criptomonedas a través de procesadores autorizados (incluido Plisio). El Prestador no almacena datos completos de tarjeta.
5.3. NO REEMBOLSO. Los créditos adquiridos NO SON REEMBOLSABLES salvo defecto técnico imputable de forma directa y exclusiva al Prestador y debidamente acreditado. En particular, no procederá reembolso por: (i) cambio de opinión del Usuario; (ii) resultados de análisis que no se ajusten a las expectativas del Usuario; (iii) uso parcial o nulo de los créditos; (iv) incumplimiento por parte del Usuario de los presentes Términos.
5.4. RENUNCIA EXPRESA AL DERECHO DE DESISTIMIENTO. De conformidad con el artículo 103.m) del Real Decreto Legislativo 1/2007 (TRLGDCU), tratándose del suministro de contenido digital no prestado en soporte material cuya ejecución comienza con el consentimiento previo y expreso del Usuario y con el conocimiento por su parte de que pierde el derecho de desistimiento, el Usuario MANIFIESTA EXPRESAMENTE que solicita el inicio inmediato de la prestación del Servicio y RECONOCE QUE, EN CONSECUENCIA, PIERDE EL DERECHO DE DESISTIMIENTO una vez consumidos o iniciados los créditos adquiridos.
5.5. Facturación electrónica: el Prestador podrá emitir factura electrónica que se entregará por medios telemáticos al correo asociado a la cuenta del Usuario.
5.6. Impagos: la falta de pago o el contracargo improcedente faculta al Prestador para suspender o cancelar el Servicio y reclamar los daños y perjuicios causados.

6. PROPIEDAD INTELECTUAL E INDUSTRIAL
6.1. Todos los derechos de propiedad intelectual e industrial sobre el Servicio, su código fuente, interfaces, marcas, logotipos, documentación y cualesquiera contenidos pertenecen al Prestador o a sus licenciantes. Se otorga al Usuario una licencia personal, limitada, no exclusiva, no transferible y revocable de uso del Servicio exclusivamente para los fines previstos en estos Términos.
6.2. Queda prohibida la ingeniería inversa, descompilación, reproducción no autorizada, redistribución o explotación comercial del Servicio.

7. MODIFICACIONES DEL SERVICIO Y DE LOS TÉRMINOS
7.1. El Prestador podrá modificar el Servicio, sus funcionalidades y los precios, así como los presentes Términos, comunicándolo al Usuario con una antelación mínima de quince (15) días por medios electrónicos. El uso continuado del Servicio tras dicha notificación implicará la aceptación de las modificaciones; en caso contrario, el Usuario podrá cancelar su cuenta.

8. LEY APLICABLE Y FUERO
8.1. Los presentes Términos se rigen por la legislación española.
8.2. Para la resolución de cualquier controversia, las partes se someten expresamente a los Juzgados y Tribunales de ${PROVIDER.city}, con renuncia a cualquier otro fuero que pudiera corresponderles, sin perjuicio del fuero imperativo aplicable cuando el Usuario tenga la condición legal de consumidor.

9. VALOR JURÍDICO DEL COMPROBANTE ELECTRÓNICO DE ACEPTACIÓN
9.1. El Usuario reconoce expresamente y otorga PLENO VALOR PROBATORIO al registro electrónico que el Prestador conserve sobre la aceptación de estos Términos, que incluirá como mínimo: identificador único del usuario, versión y huella criptográfica SHA-256 del texto aceptado, fecha y hora UTC, dirección IP, agente de usuario, método de aceptación y firma criptográfica HMAC-SHA256 generada en el servidor del Prestador con una clave secreta no accesible al Usuario.
9.2. Dicho registro tendrá la consideración de prueba electrónica conforme al Reglamento (UE) 910/2014 (eIDAS), a la Ley 6/2020 reguladora de determinados aspectos de los servicios electrónicos de confianza y al artículo 326.3 de la Ley de Enjuiciamiento Civil, sirviendo como acreditación suficiente de la prestación del consentimiento del Usuario a estos Términos.
9.3. El Usuario reconoce que el carácter inmutable del registro (almacenamiento append-only) refuerza su valor probatorio y su no repudio.

10. ACEPTACIÓN
Al marcar las casillas de aceptación y pulsar el botón "Aceptar y continuar", el Usuario manifiesta haber leído, comprendido y aceptado íntegramente los presentes Términos, incluyendo de manera específica las cláusulas 3 (limitación de responsabilidad), 5.3 (no reembolso), 5.4 (renuncia al derecho de desistimiento) y 9 (valor probatorio del comprobante electrónico).
`;

const EN_TEXT = `LEGAL TERMS AND PAYMENT CONDITIONS
Version ${VERSION}

SERVICE PROVIDER
Legal name: ${PROVIDER.name}
Tax ID: ${PROVIDER.taxId}
Address: ${PROVIDER.address}
Legal contact: ${PROVIDER.email}

1. PURPOSE AND ACCEPTANCE
1.1. This document governs access to and use of the "Spyware Forensic Analyzer" service (the "Service") provided by ${PROVIDER.name}. Use of the Service, including merely accessing the dashboard, constitutes full, express and unreserved acceptance of every clause set out herein.
1.2. The User declares to be of legal age and to have full legal capacity to enter into this agreement.

2. LAWFUL USE AND PROHIBITIONS
2.1. The User undertakes to use the Service exclusively for lawful purposes. The Service is designed as a forensic analysis tool for devices owned by the User or over which the User holds the express, valid and verifiable authorisation of the legitimate owner.
2.2. The User warrants, under their sole responsibility, that any file, backup or material submitted to the Service has been lawfully obtained and that they hold the legal standing required to subject it to analysis, in particular under Regulation (EU) 2016/679 (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD), as well as criminal legislation concerning privacy and secrecy of communications.
2.3. Any use of the Service for spying, harassment, illegitimate surveillance, non-consensual monitoring, disclosure of secrets or any other unlawful purpose is strictly forbidden. Breach of this clause shall entail immediate termination with no right to refund and entitles the Provider to cooperate with the competent authorities.

3. LIMITATION OF LIABILITY
3.1. The Service is provided "AS IS" and "AS AVAILABLE", without warranty of error-free or uninterrupted operation, nor fitness for a particular purpose.
3.2. Analysis results are INDICATIVE and informational, based on technical indicators and heuristic rules (Mobile Verification Toolkit and derivatives). They do NOT constitute expert evidence, forensic report or stand-alone evidentiary document unless the Provider issues, upon request and under a separate agreement, an expert report signed by an accredited specialist.
3.3. To the fullest extent permitted by law, the Provider disclaims liability for indirect damages, loss of profit, loss of data, loss of opportunity, reputational damage or any consequential damages arising from use of or inability to use the Service, as well as misuse of the Service by the User or third parties.
3.4. INDEMNITY. The User shall hold the Provider harmless from any claim, penalty, fine, court costs or professional fees arising from use of the Service contrary to the law, these Terms or third-party rights.

4. PERSONAL DATA PROTECTION
4.1. Controller: ${PROVIDER.name} (${PROVIDER.taxId}). Contact: ${PROVIDER.email}.
4.2. Purpose: provision of the Service, account management, billing, support and compliance with legal obligations.
4.3. Legal basis: performance of the service contract (art. 6.1.b GDPR), compliance with legal obligations (art. 6.1.c) and the User's express consent to processing of submitted files (art. 6.1.a).
4.4. Processors: cloud infrastructure providers (including the Lovable Cloud platform and its underlying providers) under data-processing agreements pursuant to art. 28 GDPR.
4.5. Retention: data shall be kept during the contractual relationship and, thereafter, for the legally applicable periods (notably tax and commercial law).
4.6. Rights: access, rectification, erasure, objection, restriction and portability at ${PROVIDER.email}. Complaint to the Spanish Data Protection Agency (www.aepd.es).

5. ECONOMIC AND PAYMENT TERMS
5.1. The Service is delivered through a prepaid credit system. Applicable prices are those published on the pricing page at the time of purchase. Prices include indirect taxes where applicable (VAT or equivalent).
5.2. Accepted payment methods: payment card and other electronic methods processed through secure payment gateways (including Stripe), as well as cryptocurrencies through authorised processors (including Plisio). The Provider does not store full card data.
5.3. NO REFUND. Purchased credits are NON-REFUNDABLE except in the event of a technical defect directly and exclusively attributable to the Provider and duly evidenced. In particular, no refund shall be granted for: (i) the User's change of mind; (ii) analysis results that do not meet the User's expectations; (iii) partial or null use of the credits; (iv) breach by the User of these Terms.
5.4. EXPRESS WAIVER OF THE RIGHT OF WITHDRAWAL. Pursuant to article 103(m) of Spanish Royal Legislative Decree 1/2007 (TRLGDCU), as the Service consists of the supply of digital content not delivered on a tangible medium whose performance begins with the User's prior and express consent and with their acknowledgement that the right of withdrawal is thereby lost, the User EXPRESSLY DECLARES that they request immediate commencement of the Service and ACKNOWLEDGE THAT, CONSEQUENTLY, THEY LOSE THE RIGHT OF WITHDRAWAL once the purchased credits are consumed or used.
5.5. Electronic invoicing: the Provider may issue electronic invoices delivered by electronic means to the email associated with the User's account.
5.6. Non-payment: failure to pay or improper chargeback entitles the Provider to suspend or cancel the Service and to claim damages.

6. INTELLECTUAL AND INDUSTRIAL PROPERTY
6.1. All intellectual and industrial property rights in the Service, its source code, interfaces, trademarks, logos, documentation and any content belong to the Provider or its licensors. The User is granted a personal, limited, non-exclusive, non-transferable and revocable licence to use the Service solely for the purposes set forth in these Terms.
6.2. Reverse engineering, decompilation, unauthorised reproduction, redistribution or commercial exploitation of the Service is forbidden.

7. SERVICE AND TERMS MODIFICATIONS
7.1. The Provider may modify the Service, its features and prices, as well as these Terms, with at least fifteen (15) days' prior electronic notice to the User. Continued use of the Service after such notice shall constitute acceptance of the modifications; otherwise the User may cancel their account.

8. GOVERNING LAW AND JURISDICTION
8.1. These Terms are governed by Spanish law.
8.2. The parties expressly submit to the Courts of ${PROVIDER.city} for the resolution of any dispute, waiving any other jurisdiction that may correspond, without prejudice to the mandatory forum applicable when the User qualifies as a consumer.

9. LEGAL VALUE OF THE ELECTRONIC ACCEPTANCE RECEIPT
9.1. The User expressly recognises and grants FULL EVIDENTIARY VALUE to the electronic record kept by the Provider of the acceptance of these Terms, which shall include at least: unique user identifier, version and SHA-256 cryptographic hash of the accepted text, UTC timestamp, IP address, user agent, acceptance method and HMAC-SHA256 cryptographic signature generated on the Provider's server using a secret key not accessible to the User.
9.2. Such record shall qualify as electronic evidence under Regulation (EU) 910/2014 (eIDAS), Spanish Law 6/2020 on certain aspects of electronic trust services, and article 326.3 of the Spanish Civil Procedure Act, serving as sufficient evidence of the User's consent to these Terms.
9.3. The User acknowledges that the immutable nature of the record (append-only storage) reinforces its evidentiary value and non-repudiation.

10. ACCEPTANCE
By ticking the acceptance boxes and clicking the "Accept and continue" button, the User declares to have read, understood and fully accepted these Terms, in particular clauses 3 (limitation of liability), 5.3 (no refund), 5.4 (waiver of the right of withdrawal) and 9 (evidentiary value of the electronic receipt).
`;

const DOCUMENTS: Record<LegalLocale, LegalDocument> = {
  es: { version: VERSION, locale: "es", title: "Términos legales y condiciones de pago", text: ES_TEXT },
  en: { version: VERSION, locale: "en", title: "Legal terms and payment conditions", text: EN_TEXT },
};

export function getLegalDocument(locale: LegalLocale): LegalDocument {
  return DOCUMENTS[locale] ?? DOCUMENTS.es;
}

export const CURRENT_LEGAL_VERSION = VERSION;
