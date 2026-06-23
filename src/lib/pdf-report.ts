import jsPDF from "jspdf";
import i18n from "@/i18n";
import { Analysis } from "./mock-store";
import type { MvtDeviceInfo, MvtParsedResult, RiskLevel } from "./mvt-parser";
import { type HeuristicFinding, type FindingCategory } from "./heuristics";

/**
 * Generador de PDF 100 % vectorial con jsPDF. No depende del DOM ni de
 * html2canvas: el informe se dibuja sección por sección con primitivas de
 * jsPDF, lo que permite texto seleccionable, búsqueda, tamaño pequeño y
 * cero defectos heredados de la maqueta web (truncados, responsive, etc).
 *
 * El informe se imprime en el idioma activo del usuario (i18n.language) o en
 * el que se pase explícitamente como segundo argumento a generatePdfReport.
 */

// ============================================================
// i18n del PDF (autocontenido; no depende del árbol React)
// ============================================================
type Lang = "es" | "en";

const STR: Record<string, Record<Lang, string>> = {
  // Cabeceras / pie
  brand: { es: "SPYWARE FORENSIC ANALYZER", en: "SPYWARE FORENSIC ANALYZER" },
  reportLabel: { es: "Informe", en: "Report" },
  footerConfidential: { es: "Documento confidencial · uso forense", en: "Confidential document · forensic use" },
  footerPageOf: { es: "Página {p} de {t}", en: "Page {p} of {t}" },

  // Portada
  coverTitle1: { es: "Informe forense", en: "Forensic report" },
  coverTitle2: { es: "de dispositivo móvil", en: "of mobile device" },
  coverSubtitle: { es: "Análisis basado en Mobile Verification Toolkit (MVT)", en: "Analysis based on Mobile Verification Toolkit (MVT)" },
  metaFile: { es: "Archivo analizado", en: "Analyzed file" },
  metaReportId: { es: "Identificador del informe", en: "Report identifier" },
  metaDate: { es: "Fecha del análisis", en: "Analysis date" },
  metaPlatform: { es: "Plataforma detectada", en: "Detected platform" },
  metaDevice: { es: "Dispositivo", en: "Device" },
  metaSize: { es: "Tamaño del origen", en: "Source size" },
  bandRisk: { es: "NIVEL DE RIESGO ESTIMADO", en: "ESTIMATED RISK LEVEL" },
  bandDetections: { es: "INDICIOS DETECTADOS", en: "DETECTIONS FOUND" },
  coverDisclaimer: {
    es: "Documento confidencial · generado localmente · no constituye certificación de infección",
    en: "Confidential document · generated locally · not a certification of infection",
  },

  // 01 Veredicto
  secVerdict: { es: "Veredicto", en: "Verdict" },
  verdictClean: {
    es: "Sin indicios de spyware conocido. MVT no ha encontrado coincidencias con sus indicadores públicos en este informe. Esto no garantiza que el dispositivo esté limpio: MVT solo detecta amenazas con firma conocida.",
    en: "No traces of known spyware. MVT did not find matches against its public indicators in this report. This does not guarantee the device is clean: MVT only detects threats with a known signature.",
  },
  verdictDetections: {
    es: '{n} indicio{s} detectado{s} con nivel de riesgo {risk}. Revisa la sección "Indicios detectados" y compara con apps que reconozcas haber instalado.',
    en: '{n} detection{s} found with risk level {risk}. Review the "Detections" section and compare against apps you recognize having installed.',
  },

  // 02 Análisis por motor
  secEngines: { es: "Análisis por motor", en: "Analysis by engine" },
  enginesIntro: {
    es: "El informe combina dos motores. El motor MVT busca indicadores conocidos (IOCs) de spyware mercenario. El motor heurístico detecta stalkerware comercial, apps espía simples, permisos peligrosos y configuraciones de riesgo basándose en patrones, no en firmas.",
    en: "The report combines two engines. The MVT engine looks for known indicators (IOCs) of mercenary spyware. The heuristic engine detects commercial stalkerware, simple spying apps, dangerous permissions and risky configurations based on patterns, not signatures.",
  },
  kpiMvt: { es: "MVT (IOCs)", en: "MVT (IOCs)" },
  kpiMvtRisk: { es: "Riesgo MVT", en: "MVT risk" },
  kpiHeur: { es: "Heurístico", en: "Heuristic" },
  kpiHeurRisk: { es: "Riesgo heurístico", en: "Heuristic risk" },
  heurBreakdown: {
    es: "Desglose heurístico: {c} indicador(es) confirmado(s), {s} patrón(es) sospechoso(s), {i} informativo(s).",
    en: "Heuristic breakdown: {c} confirmed indicator(s), {s} suspicious pattern(s), {i} informational.",
  },

  // 03 Resumen ejecutivo
  secSummary: { es: "Resumen ejecutivo", en: "Executive summary" },
  summaryLine: {
    es: 'Origen analizado: "{file}". Plataforma {plat} ({tag}). Se han revisado {mods} módulos sobre {entries} entradas extraídas del dispositivo. Resultado: {n} indicio{s} en {mwd} módulo{ms} · riesgo {risk}.',
    en: 'Analyzed source: "{file}". Platform {plat} ({tag}). {mods} modules reviewed over {entries} entries extracted from the device. Result: {n} detection{s} in {mwd} module{ms} · risk {risk}.',
  },
  kpiDetections: { es: "Indicios", en: "Detections" },
  kpiModulesWithDet: { es: "Módulos con indicios", en: "Modules with detections" },
  kpiEntries: { es: "Entradas analizadas", en: "Entries analyzed" },
  kpiRisk: { es: "Riesgo", en: "Risk" },

  // 04 Ficha del dispositivo
  secDevice: { es: "Ficha del dispositivo", en: "Device profile" },
  deviceIntro: {
    es: "Información del terminal extraída automáticamente del análisis. Por privacidad, números de serie e identificadores se muestran parcialmente.",
    en: "Device information extracted automatically from the analysis. For privacy, serial numbers and identifiers are partially shown.",
  },
  dBrand: { es: "Marca", en: "Brand" },
  dModel: { es: "Modelo", en: "Model" },
  dOs: { es: "Sistema operativo", en: "Operating system" },
  dPatch: { es: "Parche de seguridad", en: "Security patch" },
  dPatchHint: { es: "Fecha del último parche instalado.", en: "Date of the last installed patch." },
  dFirmware: { es: "Versión del firmware", en: "Firmware version" },
  dName: { es: "Nombre del dispositivo", en: "Device name" },
  dNameHint: { es: "El que aparece en Bluetooth y Wi-Fi.", en: "The one shown in Bluetooth and Wi-Fi." },
  dLocale: { es: "Idioma / región", en: "Language / region" },
  dTz: { es: "Zona horaria", en: "Time zone" },
  dCarrier: { es: "Operador (SIM)", en: "Carrier (SIM)" },
  dBootloader: { es: "Estado del bootloader", en: "Bootloader state" },
  dBootloaderHint: { es: "Indica si el sistema operativo ha sido modificado.", en: "Indicates whether the operating system has been modified." },
  dDeveloper: { es: "Modo desarrollador", en: "Developer mode" },
  devOn: { es: "activo", en: "active" },
  devOff: { es: "no activo", en: "not active" },
  dSerial: { es: "Número de serie", en: "Serial number" },
  dSerialHint: { es: "Solo se muestran los últimos 4 dígitos.", en: "Only the last 4 digits are shown." },
  bootLocked: { es: "bloqueado (recomendado)", en: "locked (recommended)" },
  bootUnlocked: { es: "desbloqueado (riesgo)", en: "unlocked (risk)" },

  // 05 Cómo leer el informe
  secHowToRead: { es: "Cómo leer este informe", en: "How to read this report" },
  howToReadIntro: {
    es: "MVT (Mobile Verification Toolkit) busca rastros conocidos de spyware y apps de vigilancia en una copia del dispositivo. Un indicio no equivale a una infección confirmada: puede tratarse de una app legítima instalada por el propio usuario. Revisa cada hallazgo y comprueba si reconoces la app o el comportamiento descrito.",
    en: "MVT (Mobile Verification Toolkit) looks for known traces of spyware and surveillance apps in a device copy. A detection is not a confirmed infection: it may be a legitimate app installed by the user. Review each finding and check whether you recognize the app or behavior described.",
  },
  sevCriticalText: {
    es: "coincide con spyware o stalkerware conocido. Requiere atención inmediata.",
    en: "matches known spyware or stalkerware. Requires immediate attention.",
  },
  sevHighText: { es: "comportamiento muy sospechoso. Revisar pronto.", en: "highly suspicious behavior. Review soon." },
  sevMediumText: {
    es: "comportamiento inusual; puede ser legítimo, pero conviene verificar.",
    en: "unusual behavior; may be legitimate, but worth verifying.",
  },
  sevLowText: { es: "informativo. No suele indicar problema por sí solo.", en: "informational. Usually not a problem on its own." },

  // 06 Áreas analizadas
  secAreas: { es: "Áreas del dispositivo analizadas", en: "Analyzed device areas" },
  thArea: { es: "ÁREA", en: "AREA" },
  thEntries: { es: "ENTRADAS", en: "ENTRIES" },
  thDetections: { es: "INDICIOS", en: "DETECTIONS" },
  thStatus: { es: "ESTADO", en: "STATUS" },
  statusDirty: { es: "con indicios", en: "with detections" },
  statusClean: { es: "limpio", en: "clean" },

  // 07 Indicios
  secDetections: { es: "Indicios detectados", en: "Detections" },
  noDetections: {
    es: "MVT no encontró coincidencias con indicadores conocidos en los archivos subidos.",
    en: "MVT did not find matches against known indicators in the uploaded files.",
  },
  moreDetections: { es: "… y {n} indicios más en el informe completo.", en: "… and {n} more detections in the full report." },

  // 08 Heurístico
  secHeuristics: { es: "Análisis general de spyware y stalkerware", en: "General spyware and stalkerware analysis" },
  heuristicsIntro: {
    es: "Hallazgos heurísticos agrupados por categoría. No son IOCs forenses: indican patrones compatibles con vigilancia que conviene verificar.",
    en: "Heuristic findings grouped by category. These are not forensic IOCs: they indicate patterns compatible with surveillance that should be verified.",
  },
  catDangerousPerm: { es: "Permisos peligrosos", en: "Dangerous permissions" },
  catSuspiciousApp: { es: "Apps sospechosas", en: "Suspicious apps" },
  catRiskyConfig: { es: "Configuración de riesgo", en: "Risky configuration" },
  catAnomalous: { es: "Comportamiento anómalo", en: "Anomalous behavior" },
  kindConfirmed: { es: "Indicador confirmado", en: "Confirmed indicator" },
  kindSuspicious: { es: "Patrón sospechoso", en: "Suspicious pattern" },
  kindInfo: { es: "Informativo", en: "Informational" },
  evidenceLabel: { es: "Evidencia", en: "Evidence" },
  recommendationLabel: { es: "Recomendación", en: "Recommendation" },

  // 09 Próximos pasos
  secNext: { es: "Próximos pasos recomendados", en: "Recommended next steps" },
  recBaseUpdate: { es: "Mantén el sistema operativo y las apps actualizadas.", en: "Keep the operating system and apps up to date." },
  recBaseReview: {
    es: "Revisa periódicamente qué apps tienen permisos sensibles (ubicación, SMS, accesibilidad).",
    en: "Periodically review which apps have sensitive permissions (location, SMS, accessibility).",
  },
  recBaseRepeat: {
    es: "Repite el análisis cada cierto tiempo para detectar cambios.",
    en: "Repeat the analysis from time to time to detect changes.",
  },
  recHitUninstall: {
    es: "Desinstala o desactiva inmediatamente las apps marcadas como indicio si no reconoces haberlas instalado.",
    en: "Immediately uninstall or disable apps flagged as detections if you do not recognize having installed them.",
  },
  recHitPasswords: {
    es: "Cambia las contraseñas de cuentas críticas (correo, banca, redes sociales) desde otro dispositivo de confianza.",
    en: "Change passwords of critical accounts (email, banking, social networks) from another trusted device.",
  },
  recHitReset: {
    es: "Considera restaurar el dispositivo a valores de fábrica si las detecciones son de severidad alta o crítica.",
    en: "Consider restoring the device to factory settings if detections are of high or critical severity.",
  },

  // 10 Verificar
  secVerify: { es: "Cómo verificar este resultado", en: "How to verify this result" },
  verifyAccessNow: {
    es: "Ayuda gratuita 24/7 para activistas, periodistas y sociedad civil. Correo: help@accessnow.org · accessnow.org/help",
    en: "Free 24/7 help for activists, journalists and civil society. Email: help@accessnow.org · accessnow.org/help",
  },
  verifyAmnesty: {
    es: "Equipo que mantiene MVT y los indicadores de Pegasus/Predator. Contacto a través de securitylab.amnesty.org cuando hay sospecha de spyware mercenario.",
    en: "Team that maintains MVT and the Pegasus/Predator indicators. Contact via securitylab.amnesty.org when mercenary spyware is suspected.",
  },
  verifyCitizenLab: {
    es: "Centro de investigación sobre spyware mercenario. Acepta casos a través de citizenlab.ca cuando se sospecha de un ataque dirigido.",
    en: "Research center on mercenary spyware. Accepts cases via citizenlab.ca when a targeted attack is suspected.",
  },
  verifyCitizenLabTerm: { es: "Citizen Lab (Universidad de Toronto)", en: "Citizen Lab (University of Toronto)" },

  // 11 Glosario
  secGlossary: { es: "Glosario de términos", en: "Glossary" },
  glossaryIntro: {
    es: "Pequeño diccionario para entender los términos técnicos que aparecen en este informe.",
    en: "Small dictionary to understand the technical terms that appear in this report.",
  },

  // 12 Aviso legal
  secLegal: { es: "Aviso legal y metodología", en: "Disclaimer and methodology" },
  legal1: {
    es: "Este informe ha sido generado automáticamente a partir de los resultados de Mobile Verification Toolkit (MVT), un proyecto de Amnesty International Security Lab. MVT compara los artefactos extraídos del dispositivo con un conjunto público de indicadores de compromiso (IOCs) conocidos.",
    en: "This report has been generated automatically from the results of the Mobile Verification Toolkit (MVT), a project of Amnesty International Security Lab. MVT compares artifacts extracted from the device against a public set of known indicators of compromise (IOCs).",
  },
  legal2: {
    es: "Un indicio detectado en este informe no constituye una certificación absoluta de infección: puede tratarse de software legítimo (control parental, gestión empresarial, apps de seguimiento autorizadas). La clasificación por categorías y la traducción a lenguaje claro son heurísticas que ofrece esta herramienta; la interpretación final corresponde a un analista cualificado.",
    en: "A detection in this report is not an absolute certification of infection: it may be legitimate software (parental control, enterprise management, authorized tracking apps). The categorization and plain-language translation are heuristics provided by this tool; final interpretation is the responsibility of a qualified analyst.",
  },
  familiesTitle: { es: "Familias de spyware cubiertas por los IOCs públicos de MVT", en: "Spyware families covered by MVT's public IOCs" },
  familyStalkerware: { es: "Stalkerware comercial", en: "Commercial stalkerware" },
  legalEvolves: {
    es: "La lista exacta evoluciona con cada actualización de los repositorios públicos de Amnesty International, Citizen Lab y Google TAG, por lo que la cobertura real depende de la versión de MVT y de los indicadores vigentes en el momento del análisis.",
    en: "The exact list evolves with each update of the public repositories of Amnesty International, Citizen Lab and Google TAG, so the actual coverage depends on the MVT version and indicators in force at the time of the analysis.",
  },
  legalAbsence: {
    es: "La ausencia de indicios no garantiza que el dispositivo esté limpio: MVT solo cubre amenazas con firma pública conocida. Spyware nuevo o muestras privadas pueden no detectarse.",
    en: "The absence of detections does not guarantee the device is clean: MVT only covers threats with a known public signature. New spyware or private samples may not be detected.",
  },
  legalPrivacy: {
    es: "Los archivos se procesan localmente en el navegador. No se transmite información del dispositivo analizado a terceros. El análisis se realiza con el consentimiento del propietario del dispositivo.",
    en: "Files are processed locally in the browser. No information about the analyzed device is transmitted to third parties. The analysis is performed with the consent of the device's owner.",
  },

  // Risk labels
  riskCritical: { es: "Crítico", en: "Critical" },
  riskHigh: { es: "Alto", en: "High" },
  riskMedium: { es: "Medio", en: "Medium" },
  riskLow: { es: "Bajo", en: "Low" },
  sevCritical: { es: "CRÍTICO", en: "CRITICAL" },
  sevHigh: { es: "ALTO", en: "HIGH" },
  sevMedium: { es: "MEDIO", en: "MEDIUM" },
  sevLow: { es: "BAJO", en: "LOW" },

  // File name
  fileBase: { es: "informe-forense", en: "forensic-report" },
};

const GLOSSARY_I18N: { term: Record<Lang, string>; def: Record<Lang, string> }[] = [
  {
    term: { es: "MVT (Mobile Verification Toolkit)", en: "MVT (Mobile Verification Toolkit)" },
    def: {
      es: "Herramienta libre de Amnesty International para buscar rastros conocidos de spyware en copias de seguridad de móviles.",
      en: "Free Amnesty International tool to look for known traces of spyware in mobile device backups.",
    },
  },
  {
    term: { es: "AndroidQF", en: "AndroidQF" },
    def: {
      es: "Utilidad oficial que extrae del móvil Android los datos necesarios (paquetes, permisos, propiedades) que después analiza MVT.",
      en: "Official utility that extracts from the Android device the data (packages, permissions, properties) later analyzed by MVT.",
    },
  },
  {
    term: { es: "IOC (Indicador de Compromiso)", en: "IOC (Indicator of Compromise)" },
    def: {
      es: "Pista pública que identifica un malware concreto: un nombre de paquete, un dominio, un hash de certificado, etc.",
      en: "Public clue that identifies a specific malware: a package name, a domain, a certificate hash, etc.",
    },
  },
  {
    term: { es: "Módulo", en: "Module" },
    def: {
      es: "Cada una de las áreas del dispositivo que MVT analiza por separado (permisos, paquetes instalados, accesibilidad, etc.).",
      en: "Each of the device areas that MVT analyzes separately (permissions, installed packages, accessibility, etc.).",
    },
  },
  {
    term: { es: "Paquete (package)", en: "Package" },
    def: {
      es: "Identificador único de una app en Android, por ejemplo 'com.whatsapp'. En iOS se llama 'bundle ID'.",
      en: "Unique identifier of an app on Android, e.g. 'com.whatsapp'. On iOS it is called 'bundle ID'.",
    },
  },
  {
    term: { es: "Permiso sensible", en: "Sensitive permission" },
    def: {
      es: "Permiso que da a una app acceso a datos delicados (ubicación, micrófono, SMS, contactos, accesibilidad).",
      en: "Permission that grants an app access to sensitive data (location, microphone, SMS, contacts, accessibility).",
    },
  },
  {
    term: { es: "Servicio de accesibilidad", en: "Accessibility service" },
    def: {
      es: "Permiso muy potente pensado para personas con discapacidad: permite a una app leer la pantalla y simular toques. Es muy usado por stalkerware.",
      en: "A very powerful permission designed for people with disabilities: it lets an app read the screen and simulate taps. Widely abused by stalkerware.",
    },
  },
  {
    term: { es: "Bootloader", en: "Bootloader" },
    def: {
      es: "Programa que arranca el sistema operativo del móvil. Si está desbloqueado, el sistema podría haber sido modificado.",
      en: "Program that boots the device's operating system. If unlocked, the system could have been modified.",
    },
  },
  {
    term: { es: "Root", en: "Root" },
    def: {
      es: "Acceso de administrador total al sistema Android. Si está activo, las apps pueden saltarse muchas protecciones.",
      en: "Full administrator access to the Android system. If active, apps can bypass many protections.",
    },
  },
  {
    term: { es: "SELinux", en: "SELinux" },
    def: {
      es: "Mecanismo de seguridad de Android que aísla las apps entre sí. Debe estar en modo 'enforcing' (estricto) para proteger correctamente el dispositivo.",
      en: "Android security mechanism that isolates apps from each other. It must be in 'enforcing' mode to properly protect the device.",
    },
  },
  {
    term: { es: "Perfil de configuración (MDM)", en: "Configuration profile (MDM)" },
    def: {
      es: "En iOS, archivo que aplica ajustes al dispositivo (VPN, certificados, restricciones). Si lo instala alguien que no eres tú, puede interceptar tu tráfico.",
      en: "On iOS, a file that applies settings to the device (VPN, certificates, restrictions). If installed by someone other than you, it can intercept your traffic.",
    },
  },
  {
    term: { es: "Exfiltración de datos", en: "Data exfiltration" },
    def: {
      es: "Envío silencioso de información del dispositivo (mensajes, contactos, ubicación) hacia un servidor externo controlado por un atacante.",
      en: "Silent sending of device information (messages, contacts, location) to an external server controlled by an attacker.",
    },
  },
  {
    term: { es: "Parche de seguridad", en: "Security patch" },
    def: {
      es: "Actualización del fabricante que corrige fallos de seguridad. Si lleva muchos meses sin instalarse, el dispositivo es más vulnerable.",
      en: "Manufacturer update that fixes security flaws. If not installed for many months, the device is more vulnerable.",
    },
  },
  {
    term: { es: "Stalkerware", en: "Stalkerware" },
    def: {
      es: "Apps comerciales legales de vigilancia (control parental, seguimiento de pareja). No son malware en sentido estricto, pero permiten espiar.",
      en: "Legal commercial surveillance apps (parental control, partner tracking). Not strictly malware, but they enable spying.",
    },
  },
  {
    term: { es: "Spyware mercenario", en: "Mercenary spyware" },
    def: {
      es: "Malware avanzado de uso dirigido vendido a gobiernos (Pegasus, Predator, FinFisher). Trátalo siempre como emergencia.",
      en: "Advanced targeted malware sold to governments (Pegasus, Predator, FinFisher). Always treat it as an emergency.",
    },
  },
];

function resolveLang(lang?: string): Lang {
  const candidate = (lang || i18n.language || "es").toLowerCase().split("-")[0];
  return candidate === "en" ? "en" : "es";
}

function makeT(lang: Lang) {
  return (key: keyof typeof STR | string, vars?: Record<string, string | number>): string => {
    const dict = STR[key as keyof typeof STR];
    let s = dict ? dict[lang] : String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };
}

function localeCode(lang: Lang): string {
  return lang === "en" ? "en-US" : "es-ES";
}

function riskLabelI18n(lang: Lang, r?: RiskLevel): string {
  const t = makeT(lang);
  return r === "critical" ? t("riskCritical")
    : r === "high" ? t("riskHigh")
    : r === "medium" ? t("riskMedium")
    : r === "low" ? t("riskLow")
    : "—";
}

function severityLabelI18n(lang: Lang, lvl?: RiskLevel): string {
  const t = makeT(lang);
  return lvl === "critical" ? t("sevCritical")
    : lvl === "high" ? t("sevHigh")
    : lvl === "medium" ? t("sevMedium")
    : lvl === "low" ? t("sevLow")
    : "—";
}

function bootloaderLabelI18n(lang: Lang, s?: string): string {
  if (!s) return "—";
  const t = makeT(lang);
  const v = s.toLowerCase();
  if (v.includes("green") || v === "1" || v === "true" || v.includes("locked")) return t("bootLocked");
  if (v.includes("orange") || v.includes("yellow") || v === "0" || v.includes("unlock")) return t("bootUnlocked");
  return s;
}

function kindLabelI18n(lang: Lang, kind: string): string {
  const t = makeT(lang);
  if (kind === "confirmed_indicator") return t("kindConfirmed");
  if (kind === "suspicious_pattern") return t("kindSuspicious");
  return t("kindInfo");
}

function categoryLabelI18n(lang: Lang, cat: FindingCategory): string {
  const t = makeT(lang);
  if (cat === "dangerous_permission") return t("catDangerousPerm");
  if (cat === "suspicious_app") return t("catSuspiciousApp");
  if (cat === "risky_config") return t("catRiskyConfig");
  return t("catAnomalous");
}

// ---------- Paleta (tema oscuro corporativo) ----------
const NAVY: RGB = [15, 23, 42];          // fondo de página
const SURFACE: RGB = [22, 32, 52];       // tarjetas
const SURFACE_2: RGB = [30, 41, 64];     // KPIs / cabeceras de tabla
const BORDER: RGB = [51, 65, 85];        // separadores
const TEXT: RGB = [241, 245, 249];       // texto principal
const MUTED: RGB = [148, 163, 184];      // texto secundario
const SOFT: RGB = [203, 213, 225];       // texto suave
const ACCENT: RGB = [59, 130, 246];      // azul marca
const SUCCESS: RGB = [34, 197, 94];

const SEV_COLOR: Record<RiskLevel | "none", RGB> = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [202, 138, 4],
  low: [34, 197, 94],
  none: [100, 116, 139],
};

type RGB = [number, number, number];

// ---------- Geometría ----------
const PAGE = { W: 595.28, H: 841.89 }; // A4 pt
const MARGIN = { left: 40, right: 40, top: 64, bottom: 56 };
const CW = PAGE.W - MARGIN.left - MARGIN.right;

// ---------- Helpers de formato ----------
function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${u[i]}`;
}

function cleanCarrier(s?: string): string {
  if (!s) return "—";
  const v = s.replace(/[,\s]+/g, " ").trim();
  return v || "—";
}

function platformShort(p?: string): string {
  return p === "ios" ? "iOS" : p === "android" ? "Android" : "—";
}
function platformTag(p?: string): string {
  return p === "ios" ? "mvt-ios" : p === "android" ? "mvt-android" : "";
}

function formatDevice(d?: MvtDeviceInfo): string {
  if (!d) return "—";
  const maker = d.manufacturer || d.brand;
  const left = [maker, d.model].filter(Boolean).join(" ").trim();
  const os = d.osVersion
    ? `${maker?.toLowerCase() === "apple" ? "iOS" : "Android"} ${d.osVersion}`
    : "";
  return [left, os].filter(Boolean).join(" · ") || "—";
}

// ============================================================
// Engine
// ============================================================
class PdfEngine {
  doc: jsPDF;
  y: number;
  reportId: string;
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;

  constructor(reportId: string, lang: Lang) {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.reportId = reportId;
    this.y = MARGIN.top;
    this.lang = lang;
    this.t = makeT(lang);
  }

  // ---- raw setters ----
  fill(c: RGB) { this.doc.setFillColor(c[0], c[1], c[2]); }
  stroke(c: RGB) { this.doc.setDrawColor(c[0], c[1], c[2]); }
  text(c: RGB) { this.doc.setTextColor(c[0], c[1], c[2]); }
  font(style: "normal" | "bold" | "italic", size: number) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
  }

  // ---- página oscura con cabecera/pie ----
  paintBackground() {
    this.fill(NAVY);
    this.doc.rect(0, 0, PAGE.W, PAGE.H, "F");
  }

  drawHeader() {
    this.fill(SURFACE);
    this.doc.rect(0, 0, PAGE.W, 36, "F");
    this.text(TEXT);
    this.font("bold", 9);
    this.doc.text(this.t("brand"), MARGIN.left, 22);
    this.text(SOFT);
    this.font("normal", 9);
    this.doc.text(`${this.t("reportLabel")} ${this.reportId}`, PAGE.W - MARGIN.right, 22, { align: "right" });
  }

  drawFooter(pageNum: number, total: number) {
    this.stroke(BORDER);
    this.doc.setLineWidth(0.4);
    this.doc.line(MARGIN.left, PAGE.H - 36, PAGE.W - MARGIN.right, PAGE.H - 36);
    this.text(MUTED);
    this.font("normal", 8);
    this.doc.text(this.t("footerConfidential"), MARGIN.left, PAGE.H - 22);
    this.doc.text(this.t("footerPageOf", { p: pageNum, t: total }), PAGE.W - MARGIN.right, PAGE.H - 22, { align: "right" });
  }

  newPage() {
    this.doc.addPage();
    this.paintBackground();
    this.drawHeader();
    this.y = MARGIN.top + 16;
  }

  ensureSpace(h: number) {
    if (this.y + h > PAGE.H - MARGIN.bottom - 8) this.newPage();
  }

  // ---- títulos / texto ----
  sectionTitle(num: number, label: string) {
    this.ensureSpace(46);
    this.y += 8;
    this.stroke(BORDER);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGIN.left, this.y + 22, PAGE.W - MARGIN.right, this.y + 22);
    this.text(MUTED);
    this.font("bold", 10);
    const numStr = String(num).padStart(2, "0");
    this.doc.text(numStr, MARGIN.left, this.y + 14);
    this.text(TEXT);
    this.font("bold", 14);
    this.doc.text(label, MARGIN.left + 24, this.y + 14);
    this.y += 36;
  }

  paragraph(s: string, color: RGB = SOFT, size = 10, lineH = 13) {
    this.font("normal", size);
    this.text(color);
    const lines = this.doc.splitTextToSize(s, CW) as string[];
    this.ensureSpace(lines.length * lineH + 4);
    for (const ln of lines) {
      this.doc.text(ln, MARGIN.left, this.y);
      this.y += lineH;
    }
    this.y += 4;
  }

  card(x: number, y: number, w: number, h: number, fill: RGB = SURFACE, radius = 8) {
    this.fill(fill);
    this.doc.roundedRect(x, y, w, h, radius, radius, "F");
  }

  drawKpis(kpis: { label: string; value: string; color?: RGB }[]) {
    const cols = kpis.length;
    const gap = 10;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = 60;
    this.ensureSpace(h + 8);
    kpis.forEach((k, i) => {
      const x = MARGIN.left + i * (w + gap);
      this.card(x, this.y, w, h, SURFACE_2);
      this.text(MUTED);
      this.font("bold", 7);
      this.doc.text(k.label.toUpperCase(), x + 12, this.y + 16);
      this.text(k.color || TEXT);
      this.font("bold", 20);
      this.doc.text(k.value, x + 12, this.y + 44);
    });
    this.y += h + 14;
  }

  drawKvGrid(rows: { label: string; value: string; hint?: string }[]) {
    const cols = 2;
    const colW = (CW - 12) / cols;
    const rowH = 38;
    const rowsPerCol = Math.ceil(rows.length / cols);
    const cardH = rowsPerCol * rowH + 16;
    this.ensureSpace(cardH + 8);
    this.card(MARGIN.left, this.y, CW, cardH, SURFACE);
    const startY = this.y + 12;
    rows.forEach((r, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = MARGIN.left + 14 + col * (colW + 0);
      const y = startY + row * rowH;
      this.text(MUTED);
      this.font("bold", 7);
      this.doc.text(r.label.toUpperCase(), x, y + 4);
      this.text(TEXT);
      this.font("bold", 10);
      const v = (this.doc.splitTextToSize(r.value || "—", colW - 18) as string[])[0];
      this.doc.text(v, x, y + 18);
      if (r.hint) {
        this.text(MUTED);
        this.font("normal", 8);
        const h = (this.doc.splitTextToSize(r.hint, colW - 18) as string[])[0];
        this.doc.text(h, x, y + 30);
      }
    });
    this.y += cardH + 12;
  }

  drawAreasTable(rows: { name: string; code: string; entries: number; detected: number }[]) {
    if (rows.length === 0) return;
    const colW = [CW * 0.55, CW * 0.18, CW * 0.12, CW * 0.15];
    const headerH = 24;
    const rowH = 26;

    this.ensureSpace(headerH + rowH);
    this.card(MARGIN.left, this.y, CW, headerH, SURFACE_2, 6);
    this.text(MUTED);
    this.font("bold", 8);
    const headers = [this.t("thArea"), this.t("thEntries"), this.t("thDetections"), this.t("thStatus")];
    let cx = MARGIN.left + 14;
    headers.forEach((h, i) => {
      const align = i === 0 ? "left" : "right";
      const px = align === "left" ? cx : cx + colW[i] - 14;
      this.doc.text(h, px, this.y + 15, { align });
      cx += colW[i];
    });
    this.y += headerH + 4;

    const loc = localeCode(this.lang);
    for (const r of rows) {
      this.ensureSpace(rowH);
      this.fill(SURFACE);
      this.doc.roundedRect(MARGIN.left, this.y, CW, rowH - 2, 4, 4, "F");
      let x = MARGIN.left + 14;
      this.text(TEXT);
      this.font("bold", 10);
      const name = (this.doc.splitTextToSize(r.name, colW[0] - 28) as string[])[0];
      this.doc.text(name, x, this.y + 17);
      const nameW = this.doc.getTextWidth(name);
      if (r.code && r.code !== r.name) {
        this.text(MUTED);
        this.font("normal", 8);
        this.doc.text(`(${r.code})`, x + nameW + 6, this.y + 17);
      }
      x += colW[0];
      this.text(TEXT);
      this.font("normal", 10);
      this.doc.text(r.entries.toLocaleString(loc), x + colW[1] - 14, this.y + 17, { align: "right" });
      x += colW[1];
      const detCol: RGB = r.detected > 0 ? SEV_COLOR.high : MUTED;
      this.text(detCol);
      this.font("bold", 10);
      this.doc.text(String(r.detected), x + colW[2] - 14, this.y + 17, { align: "right" });
      x += colW[2];
      const status = r.detected > 0 ? this.t("statusDirty") : this.t("statusClean");
      this.text(r.detected > 0 ? SEV_COLOR.high : SUCCESS);
      this.font("bold", 9);
      this.doc.text(status, x + colW[3] - 14, this.y + 17, { align: "right" });

      this.y += rowH;
    }
    this.y += 6;
  }

  drawDetectionsList(detections: { module: string; summary: string; level?: RiskLevel }[]) {
    const max = 50;
    const shown = detections.slice(0, max);
    for (const d of shown) {
      const color = SEV_COLOR[d.level || "high"] || SEV_COLOR.high;
      const padX = 14;
      const innerW = CW - padX * 2;
      const sumLines = this.doc.splitTextToSize(d.summary, innerW) as string[];
      const cardH = 22 + sumLines.length * 12 + 12;
      this.ensureSpace(cardH + 6);
      this.card(MARGIN.left, this.y, CW, cardH, SURFACE);
      this.fill(color);
      this.doc.rect(MARGIN.left, this.y, 3, cardH, "F");
      this.fill(color);
      this.doc.roundedRect(MARGIN.left + padX, this.y + 10, 44, 14, 3, 3, "F");
      this.text(TEXT);
      this.font("bold", 8);
      this.doc.text(severityLabelI18n(this.lang, d.level), MARGIN.left + padX + 22, this.y + 19, { align: "center" });
      this.text(MUTED);
      this.font("normal", 9);
      this.doc.text(d.module, MARGIN.left + padX + 56, this.y + 19);
      this.text(TEXT);
      this.font("normal", 10);
      sumLines.forEach((ln, i) => {
        this.doc.text(ln, MARGIN.left + padX, this.y + 36 + i * 12);
      });
      this.y += cardH + 6;
    }
    if (detections.length > max) {
      this.paragraph(this.t("moreDetections", { n: detections.length - max }), MUTED, 9);
    }
  }

  noticeBox(text: string, color: RGB = SUCCESS) {
    const padX = 14;
    const padY = 14;
    const lines = this.doc.splitTextToSize(text, CW - padX * 2 - 4) as string[];
    const h = padY * 2 + lines.length * 13;
    this.ensureSpace(h + 6);
    this.card(MARGIN.left, this.y, CW, h, SURFACE);
    this.fill(color);
    this.doc.rect(MARGIN.left, this.y, 3, h, "F");
    this.text(TEXT);
    this.font("normal", 10);
    lines.forEach((ln, i) => this.doc.text(ln, MARGIN.left + padX, this.y + padY + 10 + i * 13));
    this.y += h + 10;
  }

  numberedList(items: string[]) {
    items.forEach((it, i) => {
      const lines = this.doc.splitTextToSize(it, CW - 32) as string[];
      const h = Math.max(20, lines.length * 13 + 6);
      this.ensureSpace(h);
      this.fill(ACCENT);
      this.doc.circle(MARGIN.left + 8, this.y + 7, 8, "F");
      this.text(TEXT);
      this.font("bold", 9);
      this.doc.text(String(i + 1), MARGIN.left + 8, this.y + 10, { align: "center" });
      this.text(SOFT);
      this.font("normal", 10);
      lines.forEach((ln, j) => this.doc.text(ln, MARGIN.left + 26, this.y + 9 + j * 13));
      this.y += h;
    });
    this.y += 4;
  }

  drawDefinitions(items: { term: string; def: string }[]) {
    for (const it of items) {
      const defLines = this.doc.splitTextToSize(it.def, CW - 18) as string[];
      const h = 16 + defLines.length * 12 + 10;
      this.ensureSpace(h);
      this.card(MARGIN.left, this.y, CW, h, SURFACE);
      this.text(TEXT);
      this.font("bold", 10);
      this.doc.text(it.term, MARGIN.left + 12, this.y + 16);
      this.text(MUTED);
      this.font("normal", 9);
      defLines.forEach((ln, i) => this.doc.text(ln, MARGIN.left + 12, this.y + 30 + i * 12));
      this.y += h + 4;
    }
  }

  drawChips(items: string[]) {
    let x = MARGIN.left;
    const padY = 5;
    const gap = 6;
    const lineH = 22;
    this.font("normal", 9);
    this.ensureSpace(lineH);
    for (const it of items) {
      const w = this.doc.getTextWidth(it) + 16;
      if (x + w > MARGIN.left + CW) {
        x = MARGIN.left;
        this.y += lineH;
        this.ensureSpace(lineH);
      }
      this.card(x, this.y, w, 18, SURFACE_2, 4);
      this.text(SOFT);
      this.font("normal", 9);
      this.doc.text(it, x + w / 2, this.y + 12, { align: "center" });
      x += w + gap;
      void padY;
    }
    this.y += lineH + 4;
  }
}

// ============================================================
// API pública
// ============================================================
export async function generatePdfReport(a: Analysis, lang?: string): Promise<void> {
  const resolved = resolveLang(lang);
  const t = makeT(resolved);
  const loc = localeCode(resolved);
  const reportId = a.id.slice(0, 8).toUpperCase();
  const eng = new PdfEngine(reportId, resolved);
  const r = a.result;
  const d = r?.deviceInfo;

  // ----- PORTADA -----
  eng.paintBackground();
  eng.fill(ACCENT);
  eng.doc.rect(MARGIN.left, 88, 36, 4, "F");
  eng.text(TEXT);
  eng.font("bold", 11);
  eng.doc.text(t("brand"), MARGIN.left, 116);

  eng.font("bold", 30);
  eng.doc.text(t("coverTitle1"), MARGIN.left, 184);
  eng.doc.text(t("coverTitle2"), MARGIN.left, 220);
  eng.text(MUTED);
  eng.font("normal", 11);
  eng.doc.text(t("coverSubtitle"), MARGIN.left, 244);

  const cardY = 280;
  const platStr = platformShort(r?.platform);
  const platTag = platformTag(r?.platform);
  const meta: [string, string][] = [
    [t("metaFile"), a.fileName],
    [t("metaReportId"), reportId],
    [t("metaDate"), new Date(a.uploadedAt).toLocaleString(loc)],
    [t("metaPlatform"), platTag ? `${platStr}  ·  ${platTag}` : platStr],
    ...(d ? [[t("metaDevice"), formatDevice(d)] as [string, string]] : []),
    [t("metaSize"), formatBytes(a.fileSize)],
  ];
  const cardH = meta.length * 30 + 20;
  eng.card(MARGIN.left, cardY, CW, cardH, SURFACE);
  let cy = cardY + 24;
  meta.forEach(([k, v]) => {
    eng.text(MUTED);
    eng.font("bold", 7);
    eng.doc.text(k.toUpperCase(), MARGIN.left + 20, cy);
    eng.text(TEXT);
    eng.font("bold", 10);
    const val = (eng.doc.splitTextToSize(v || "—", CW - 40) as string[])[0];
    eng.doc.text(val, MARGIN.left + 20, cy + 14);
    cy += 30;
  });

  if (r) {
    const sev = SEV_COLOR[r.risk] ?? SEV_COLOR.none;
    const bandY = cardY + cardH + 24;
    eng.card(MARGIN.left, bandY, CW, 78, sev, 8);
    eng.text(TEXT);
    eng.font("bold", 9);
    eng.doc.text(t("bandRisk"), MARGIN.left + 20, bandY + 24);
    eng.font("bold", 22);
    eng.doc.text(riskLabelI18n(resolved, r.risk).toUpperCase(), MARGIN.left + 20, bandY + 56);
    eng.font("bold", 28);
    eng.doc.text(String(r.totalDetections), PAGE.W - MARGIN.right - 20, bandY + 40, { align: "right" });
    eng.font("bold", 9);
    eng.doc.text(t("bandDetections"), PAGE.W - MARGIN.right - 20, bandY + 60, { align: "right" });
  }

  eng.text(MUTED);
  eng.font("italic", 8);
  eng.doc.text(t("coverDisclaimer"), MARGIN.left, PAGE.H - 44);

  // ----- CUERPO -----
  let n = 0;
  const sec = () => ++n;
  eng.newPage();

  // 01 Veredicto
  eng.sectionTitle(sec(), t("secVerdict"));
  if (!r || r.totalDetections === 0) {
    eng.noticeBox(t("verdictClean"), SUCCESS);
  } else {
    const sev = SEV_COLOR[r.risk] ?? SEV_COLOR.high;
    eng.noticeBox(
      t("verdictDetections", {
        n: r.totalDetections,
        s: r.totalDetections === 1 ? "" : (resolved === "es" ? "s" : "s"),
        risk: riskLabelI18n(resolved, r.risk).toLowerCase(),
      }),
      sev,
    );
  }

  // 02 Análisis por motor
  if (r) {
    eng.sectionTitle(sec(), t("secEngines"));
    eng.paragraph(t("enginesIntro"), SOFT, 9);
    const h = r.heuristics;
    eng.drawKpis([
      { label: t("kpiMvt"), value: String(r.totalDetections), color: r.totalDetections > 0 ? SEV_COLOR.high : TEXT },
      { label: t("kpiMvtRisk"), value: riskLabelI18n(resolved, r.risk), color: SEV_COLOR[r.risk] ?? TEXT },
      { label: t("kpiHeur"), value: String(h?.findings.length ?? 0), color: (h?.findings.length ?? 0) > 0 ? SEV_COLOR.medium : TEXT },
      { label: t("kpiHeurRisk"), value: riskLabelI18n(resolved, h?.overallRisk ?? "low"), color: SEV_COLOR[h?.overallRisk ?? "low"] ?? TEXT },
    ]);
    if (h && h.findings.length > 0) {
      eng.paragraph(
        t("heurBreakdown", {
          c: h.countsByKind.confirmed_indicator,
          s: h.countsByKind.suspicious_pattern,
          i: h.countsByKind.informational,
        }),
        MUTED, 9,
      );
    }
  }

  // 03 Resumen ejecutivo
  if (r) {
    eng.sectionTitle(sec(), t("secSummary"));
    const modulesWithDet = r.modules.filter((m) => m.detected > 0).length;
    eng.paragraph(
      t("summaryLine", {
        file: a.fileName,
        plat: platformShort(r.platform),
        tag: platformTag(r.platform),
        mods: r.modules.length,
        entries: r.totalEntries.toLocaleString(loc),
        n: r.totalDetections,
        s: r.totalDetections === 1 ? "" : "s",
        mwd: modulesWithDet,
        ms: modulesWithDet === 1 ? "" : "s",
        risk: riskLabelI18n(resolved, r.risk).toLowerCase(),
      }),
      SOFT,
    );
    eng.drawKpis([
      { label: t("kpiDetections"), value: String(r.totalDetections), color: r.totalDetections > 0 ? SEV_COLOR.high : TEXT },
      { label: t("kpiModulesWithDet"), value: String(modulesWithDet), color: modulesWithDet > 0 ? SEV_COLOR.medium : TEXT },
      { label: t("kpiEntries"), value: r.totalEntries.toLocaleString(loc) },
      { label: t("kpiRisk"), value: riskLabelI18n(resolved, r.risk), color: SEV_COLOR[r.risk] ?? TEXT },
    ]);
  }

  // 04 Ficha del dispositivo
  if (d) {
    eng.sectionTitle(sec(), t("secDevice"));
    eng.paragraph(t("deviceIntro"), MUTED, 9);
    const isIos = (d.manufacturer || d.brand || "").toLowerCase() === "apple";
    const rows: { label: string; value: string; hint?: string }[] = [
      { label: t("dBrand"), value: d.manufacturer || d.brand || "—" },
      { label: t("dModel"), value: d.model || "—" },
      { label: t("dOs"), value: d.osVersion ? `${isIos ? "iOS" : "Android"} ${d.osVersion}` : "—" },
      { label: t("dPatch"), value: d.securityPatch || "—", hint: d.securityPatch ? t("dPatchHint") : undefined },
      { label: t("dFirmware"), value: d.buildId || "—" },
      { label: t("dName"), value: d.deviceName || "—", hint: t("dNameHint") },
      { label: t("dLocale"), value: d.locale || d.regionInfo || "—" },
      { label: t("dTz"), value: d.timezone || "—" },
      { label: t("dCarrier"), value: cleanCarrier(d.carrier) },
      { label: t("dBootloader"), value: bootloaderLabelI18n(resolved, d.bootloaderState), hint: t("dBootloaderHint") },
      { label: t("dDeveloper"), value: d.debuggable === true ? t("devOn") : d.debuggable === false ? t("devOff") : "—" },
      { label: t("dSerial"), value: d.serialLast4 ? `····${d.serialLast4}` : "—", hint: d.serialLast4 ? t("dSerialHint") : undefined },
    ];
    eng.drawKvGrid(rows);
  }

  // 05 Cómo leer el informe
  eng.sectionTitle(sec(), t("secHowToRead"));
  eng.paragraph(t("howToReadIntro"), SOFT, 10);
  const sevExplain: { lvl: RiskLevel; text: string }[] = [
    { lvl: "critical", text: t("sevCriticalText") },
    { lvl: "high", text: t("sevHighText") },
    { lvl: "medium", text: t("sevMediumText") },
    { lvl: "low", text: t("sevLowText") },
  ];
  for (const s of sevExplain) {
    eng.ensureSpace(22);
    const color = SEV_COLOR[s.lvl];
    eng.card(MARGIN.left, eng.y, 56, 16, color, 3);
    eng.text(TEXT);
    eng.font("bold", 8);
    eng.doc.text(severityLabelI18n(resolved, s.lvl), MARGIN.left + 28, eng.y + 11, { align: "center" });
    eng.text(SOFT);
    eng.font("normal", 10);
    const ln = (eng.doc.splitTextToSize(s.text, CW - 70) as string[])[0];
    eng.doc.text(ln, MARGIN.left + 66, eng.y + 12);
    eng.y += 22;
  }
  eng.y += 6;

  // 06 Áreas del dispositivo analizadas
  if (r && r.modules.length > 0) {
    eng.sectionTitle(sec(), t("secAreas"));
    const areaRows = r.modules
      .filter((m) => m.entries > 0 || m.detected > 0)
      .sort((a, b) => b.entries - a.entries)
      .map((m) => ({
        name: m.label || m.key,
        code: m.key,
        entries: m.entries,
        detected: m.detected,
      }));
    eng.drawAreasTable(areaRows);
  }

  // 07 Indicios detectados
  eng.sectionTitle(sec(), t("secDetections"));
  if (!r || r.detections.length === 0) {
    eng.noticeBox(t("noDetections"), SUCCESS);
  } else {
    eng.drawDetectionsList(
      r.detections.map((x) => ({ module: x.module, summary: x.summary, level: x.level })),
    );
  }

  // 08 Hallazgos heurísticos
  if (r?.heuristics && r.heuristics.findings.length > 0) {
    eng.sectionTitle(sec(), t("secHeuristics"));
    eng.paragraph(t("heuristicsIntro"), SOFT, 9);
    drawHeuristicFindings(eng, r.heuristics.findings, resolved);
  }

  // 09 Próximos pasos recomendados
  eng.sectionTitle(sec(), t("secNext"));
  const recs = buildRecommendations(resolved, r);
  eng.numberedList(recs);

  // 10 Cómo verificar este resultado
  eng.sectionTitle(sec(), t("secVerify"));
  const verify: { term: string; def: string }[] = [
    { term: "Access Now Digital Security Helpline", def: t("verifyAccessNow") },
    { term: "Amnesty International Security Lab", def: t("verifyAmnesty") },
    { term: t("verifyCitizenLabTerm"), def: t("verifyCitizenLab") },
  ];
  eng.drawDefinitions(verify);

  // 11 Glosario
  eng.sectionTitle(sec(), t("secGlossary"));
  eng.paragraph(t("glossaryIntro"), MUTED, 9);
  eng.drawDefinitions(GLOSSARY_I18N.map((g) => ({ term: g.term[resolved], def: g.def[resolved] })));

  // 12 Aviso legal y metodología
  eng.sectionTitle(sec(), t("secLegal"));
  eng.paragraph(t("legal1"), SOFT, 9);
  eng.paragraph(t("legal2"), SOFT, 9);
  eng.text(TEXT);
  eng.font("bold", 10);
  eng.ensureSpace(20);
  eng.doc.text(t("familiesTitle"), MARGIN.left, eng.y);
  eng.y += 12;
  eng.drawChips([
    "Pegasus (NSO Group)",
    "Predator (Intellexa/Cytrox)",
    "Reign (QuaDream)",
    "Hermit (RCS Lab)",
    "Triangulation (iOS)",
    t("familyStalkerware"),
  ]);
  eng.paragraph(t("legalEvolves"), SOFT, 9);
  eng.paragraph(t("legalAbsence"), SOFT, 9);
  eng.paragraph(t("legalPrivacy"), MUTED, 9);

  // ----- Footer en todas las páginas (salta la portada) -----
  const total = eng.doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    eng.doc.setPage(p);
    eng.drawFooter(p, total);
  }

  eng.doc.save(`${t("fileBase")}-${reportId}.pdf`);
}

// ---------- Hallazgos heurísticos ----------
const KIND_COLOR: Record<string, RGB> = {
  confirmed_indicator: SEV_COLOR.high,
  suspicious_pattern: SEV_COLOR.medium,
  informational: MUTED,
};

function drawHeuristicFindings(eng: PdfEngine, findings: HeuristicFinding[], lang: Lang) {
  const t = makeT(lang);
  const cats: FindingCategory[] = ["dangerous_permission", "suspicious_app", "risky_config", "anomalous_behavior"];
  for (const cat of cats) {
    const items = findings.filter((f) => f.category === cat);
    if (items.length === 0) continue;
    eng.ensureSpace(22);
    eng.text(SOFT);
    eng.font("bold", 11);
    eng.doc.text(`${categoryLabelI18n(lang, cat)} (${items.length})`, MARGIN.left, eng.y + 4);
    eng.y += 16;

    for (const f of items) {
      const padX = 14;
      const innerW = CW - padX * 2;
      const reasonLines = eng.doc.splitTextToSize(f.reason, innerW) as string[];
      const recLines = eng.doc.splitTextToSize(`${t("recommendationLabel")}: ${f.recommendation}`, innerW) as string[];
      const evLines = eng.doc.splitTextToSize(`${t("evidenceLabel")}: ${f.evidence}`, innerW) as string[];
      const cardH = 28 + 14 + evLines.length * 11 + reasonLines.length * 12 + 6 + recLines.length * 11 + 14;
      eng.ensureSpace(cardH + 6);
      eng.card(MARGIN.left, eng.y, CW, cardH, SURFACE);
      eng.fill(SEV_COLOR[f.severity] ?? SEV_COLOR.high);
      eng.doc.rect(MARGIN.left, eng.y, 3, cardH, "F");
      const sevColor = SEV_COLOR[f.severity] ?? SEV_COLOR.high;
      eng.fill(sevColor);
      eng.doc.roundedRect(MARGIN.left + padX, eng.y + 10, 44, 14, 3, 3, "F");
      eng.text(TEXT);
      eng.font("bold", 8);
      eng.doc.text(severityLabelI18n(lang, f.severity), MARGIN.left + padX + 22, eng.y + 19, { align: "center" });
      const kColor = KIND_COLOR[f.kind] ?? MUTED;
      const kLabel = kindLabelI18n(lang, f.kind);
      const kW = eng.doc.getTextWidth(kLabel) + 14;
      eng.fill(kColor);
      eng.doc.roundedRect(MARGIN.left + padX + 50, eng.y + 10, kW, 14, 3, 3, "F");
      eng.text(TEXT);
      eng.font("bold", 8);
      eng.doc.text(kLabel, MARGIN.left + padX + 50 + kW / 2, eng.y + 19, { align: "center" });
      eng.text(TEXT);
      eng.font("bold", 11);
      eng.doc.text(f.title, MARGIN.left + padX, eng.y + 38);
      eng.text(MUTED);
      eng.font("normal", 8);
      let yy = eng.y + 52;
      evLines.forEach((ln) => { eng.doc.text(ln, MARGIN.left + padX, yy); yy += 11; });
      eng.text(SOFT);
      eng.font("normal", 10);
      reasonLines.forEach((ln) => { eng.doc.text(ln, MARGIN.left + padX, yy + 2); yy += 12; });
      eng.text(MUTED);
      eng.font("normal", 9);
      yy += 4;
      recLines.forEach((ln) => { eng.doc.text(ln, MARGIN.left + padX, yy); yy += 11; });

      eng.y += cardH + 6;
    }
  }
}

// ---------- Datos auxiliares ----------
function buildRecommendations(lang: Lang, r?: MvtParsedResult): string[] {
  const t = makeT(lang);
  const base = [t("recBaseUpdate"), t("recBaseReview"), t("recBaseRepeat")];
  if (!r) return base;
  if (r.totalDetections > 0) {
    return [t("recHitUninstall"), t("recHitPasswords"), t("recHitReset"), ...base];
  }
  return base;
}
