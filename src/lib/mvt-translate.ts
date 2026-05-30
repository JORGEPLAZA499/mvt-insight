import type { RiskLevel, MvtParsedResult, MvtDetection } from "./mvt-parser";

// ---------- Módulos: nombre técnico -> nombre claro en español ----------

const MODULE_LABELS: Record<string, string> = {
  dumpsys_receivers: "Receptores de eventos del sistema",
  dumpsys_appops: "Permisos sensibles concedidos a apps",
  dumpsys_packages: "Aplicaciones instaladas",
  aqf_packages: "Aplicaciones instaladas",
  dumpsys_battery_daily: "Consumo de batería por app (diario)",
  dumpsys_battery_history: "Histórico de consumo de batería",
  dumpsys_activities: "Actividad de apps en primer plano",
  dumpsys_accessibility: "Servicios de accesibilidad",
  dumpsys_platform_compat: "Compatibilidad de plataforma",
  dumpsys_get_prop: "Propiedades del sistema",
  dumpsys_adb_state: "Estado de depuración USB (ADB)",
  aqf_get_prop: "Propiedades del sistema (AQF)",
  aqf_settings: "Ajustes del sistema (AQF)",
  tombstones: "Fallos críticos del sistema",
  sms: "Mensajes SMS",
  mounts: "Particiones montadas",
  alerts: "Alertas del sistema",
  info: "Información del dispositivo",
  bugreport_timestamps: "Marcas de tiempo del bugreport",
};

export function humanizeModule(key: string, fallback?: string): string {
  return MODULE_LABELS[key] ?? fallback ?? key;
}

// ---------- Permisos sensibles ----------

const PERMISSION_LABELS: Record<string, string> = {
  REQUEST_INSTALL_PACKAGES: "instalar otras aplicaciones",
  SYSTEM_ALERT_WINDOW: "mostrarse encima de otras apps",
  BIND_ACCESSIBILITY_SERVICE: "usar accesibilidad (puede leer la pantalla y simular toques)",
  READ_SMS: "leer tus SMS",
  RECEIVE_SMS: "recibir tus SMS",
  SEND_SMS: "enviar SMS",
  RECORD_AUDIO: "grabar audio del micrófono",
  CAMERA: "usar la cámara",
  ACCESS_FINE_LOCATION: "acceder a tu ubicación precisa",
  ACCESS_BACKGROUND_LOCATION: "acceder a tu ubicación en segundo plano",
  READ_CONTACTS: "leer tus contactos",
  READ_CALL_LOG: "leer tu historial de llamadas",
  PROCESS_OUTGOING_CALLS: "interceptar llamadas salientes",
  WRITE_SETTINGS: "modificar ajustes del sistema",
};

function humanPermission(p: string): string {
  return PERMISSION_LABELS[p] ?? `usar el permiso sensible '${p}'`;
}

// ---------- Familias conocidas ----------

const FAMILY_DESC: Record<string, string> = {
  Life360: "app comercial de seguimiento familiar (localización continua)",
  Pegasus: "spyware mercenario de NSO Group",
  Predator: "spyware mercenario de Intellexa/Cytrox",
  FinFisher: "spyware comercial (FinSpy)",
  Hermit: "spyware comercial atribuido a RCS Lab",
  Reign: "spyware mercenario de QuaDream",
};

function familyDesc(name: string): string {
  return FAMILY_DESC[name] ?? `familia de spyware/stalkerware conocida (${name})`;
}

// ---------- Traducción de mensajes MVT ----------

export function humanizeDetection(summary: string): string {
  if (!summary) return "(sin descripción)";
  const s = summary.trim();

  // App sospechosa por ID
  let m = s.match(/^Found a known suspicious app with ID "([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) return `App señalada como sospechosa: "${m[1]}". Coincide con indicadores de ${familyDesc(m[2])}.`;

  // Certificado sospechoso
  m = s.match(/^Found a known suspicious app certf?ificate with hash "([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) return `Certificado de firma de app coincide con ${familyDesc(m[2])} (hash ${m[1].slice(0, 12)}…).`;

  // Receiver sospechoso
  m = s.match(/^Found a known suspicious receiver with name\s+"([^"\/]+)\/([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) {
    const pkg = m[1];
    const comp = m[2].split(".").pop() || m[2];
    return `Componente en segundo plano "${comp}" de la app "${pkg}", asociado a ${familyDesc(m[3])}.`;
  }

  // Servicio sospechoso
  m = s.match(/^Found a known suspicious service with name\s+"([^"\/]+)\/([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) {
    const pkg = m[1];
    const comp = m[2].split(".").pop() || m[2];
    return `Servicio en segundo plano "${comp}" de la app "${pkg}", asociado a ${familyDesc(m[3])}.`;
  }

  // Proceso sospechoso
  m = s.match(/^Found a known suspicious process(?: with name)?\s+"([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) return `Proceso en ejecución "${m[1]}", asociado a ${familyDesc(m[2])}.`;

  // Dominio sospechoso
  m = s.match(/^Found (?:a )?known suspicious (?:domain|host|url)\s+"([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) return `Conexión a un dominio asociado a ${familyDesc(m[2])}: "${m[1]}".`;

  // Instalación vía ADB / no-sistema
  m = s.match(/^Found a non-system package installed via adb[^:]*:\s*"([^"]+)"/i);
  if (m) return `App instalada manualmente por cable USB/ADB (fuera de la tienda oficial): "${m[1]}".`;

  // Instalación vía navegador
  m = s.match(/^Found a package installed via a browser[^:]*:\s*"([^"]+)"/i);
  if (m) return `App instalada desde el navegador (fuera de la tienda oficial): "${m[1]}".`;

  // Instalación vía instalador desconocido
  m = s.match(/^Found a package installed via (?:an? )?(.+?):\s*"([^"]+)"/i);
  if (m) return `App "${m[2]}" instalada por una vía poco habitual (${m[1]}).`;

  // Permiso peligroso
  m = s.match(/^Package '([^']+)' had risky permission '([^']+)' set to '([^']+)'(?: at (.+))?/i);
  if (m) {
    const pkg = m[1], perm = m[2], state = m[3].toLowerCase(), when = m[4];
    const verb = state === "access" || state === "allow" ? "recibió permiso para" : `tuvo el permiso revocado para`;
    return `La app "${pkg}" ${verb} ${humanPermission(perm)}${when ? ` (${when})` : ""}.`;
  }

  // Crash / tombstone
  m = s.match(/^Crash of process "?([^"\s]+)"?/i);
  if (m) return `Se registró un fallo crítico del proceso "${m[1]}".`;

  // Si parece JSON crudo, devolver algo neutral
  if (s.startsWith("{") || s.startsWith("[")) return "Evidencia técnica (ver detalle).";

  return s;
}

// ---------- Severidades ----------

export function severityLabel(level?: RiskLevel): string {
  switch (level) {
    case "critical": return "CRÍTICO";
    case "high": return "ALTO";
    case "medium": return "MEDIO";
    case "low": return "BAJO";
    default: return "INFO";
  }
}

export function explainSeverity(level: RiskLevel): string {
  switch (level) {
    case "critical": return "Crítico — coincide con spyware o stalkerware conocido. Requiere atención inmediata.";
    case "high": return "Alto — comportamiento muy sospechoso. Revisar pronto.";
    case "medium": return "Medio — comportamiento inusual; puede ser legítimo, pero conviene verificar.";
    case "low": return "Bajo — informativo. No suele indicar problema por sí solo.";
  }
}

// ---------- Clasificación por categoría ----------

export type Category = "mercenary" | "stalkerware" | "suspicious";

export const CATEGORY_LABEL: Record<Category, string> = {
  mercenary: "Spyware mercenario",
  stalkerware: "Stalkerware comercial",
  suspicious: "Comportamiento sospechoso",
};

export const CATEGORY_DESC: Record<Category, string> = {
  mercenary: "Malware avanzado de uso dirigido (Pegasus, Predator, FinFisher…). Si aparece aquí, trátalo como una emergencia.",
  stalkerware: "Apps comerciales legales que permiten vigilancia continua (Life360, control parental…). No son malware en sentido estricto, pero pueden usarse para espiar.",
  suspicious: "Comportamiento inusual o permisos sensibles concedidos a apps. Puede ser legítimo; conviene verificar.",
};

const MERCENARY_FAMILIES = ["Pegasus", "Predator", "FinFisher", "FinSpy", "Hermit", "Reign", "Chrysaor", "NSO", "Intellexa", "Cytrox", "QuaDream", "RCS Lab"];
const STALKERWARE_FAMILIES = ["Life360", "mSpy", "FlexiSpy", "Cocospy", "Hoverwatch", "Spyzie", "Spyic", "XNSPY", "Cerberus"];
const ALL_FAMILIES = [...MERCENARY_FAMILIES, ...STALKERWARE_FAMILIES];

export function classifyDetection(d: MvtDetection): Category {
  const s = d.summary || "";
  for (const f of MERCENARY_FAMILIES) if (s.includes(`"${f}"`)) return "mercenary";
  for (const f of STALKERWARE_FAMILIES) if (s.includes(`"${f}"`)) return "stalkerware";
  return "suspicious";
}

function detectFamilies(detections: MvtDetection[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of detections) {
    for (const fam of ALL_FAMILIES) {
      if (d.summary && d.summary.includes(`"${fam}"`)) {
        counts.set(fam, (counts.get(fam) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export interface Verdict {
  level: "clean" | "suspicious" | "stalkerware" | "mercenary";
  headline: string;
  detail: string;
}

export function buildVerdict(result: MvtParsedResult): Verdict {
  const total = result.totalDetections;
  if (total === 0) {
    return {
      level: "clean",
      headline: "Sin indicios de spyware conocido",
      detail: "MVT no ha encontrado coincidencias con sus indicadores públicos en este informe. Esto no garantiza que el dispositivo esté limpio: MVT solo detecta amenazas con firma conocida.",
    };
  }
  const fams = detectFamilies(result.detections);
  const mercenary = [...fams.entries()].find(([f]) => MERCENARY_FAMILIES.includes(f));
  if (mercenary) {
    return {
      level: "mercenary",
      headline: `Posible spyware mercenario detectado: ${mercenary[0]}`,
      detail: `Se han encontrado ${mercenary[1]} coincidencia(s) con indicadores de ${familyDesc(mercenary[0])}. Trátalo como una emergencia: no reinicies el dispositivo, aíslalo de la red y contacta con Access Now, Amnesty Tech o Citizen Lab.`,
    };
  }
  const stalker = [...fams.entries()].find(([f]) => STALKERWARE_FAMILIES.includes(f));
  if (stalker) {
    return {
      level: "stalkerware",
      headline: `Stalkerware detectado: ${stalker[0]}`,
      detail: `Se han encontrado coincidencias con ${familyDesc(stalker[0])}. No es malware mercenario, pero permite vigilar el dispositivo de forma continua. Verifica si la instalaste tú o alguien con acceso físico.`,
    };
  }
  return {
    level: "suspicious",
    headline: "Comportamiento sospechoso sin firma conocida",
    detail: `Se han encontrado ${total} indicios técnicos sin coincidencia directa con familias conocidas. Revisa el detalle y considera repetir el análisis con la herramienta oficial MVT.`,
  };
}

export function riskNarrative(result: MvtParsedResult): string {
  return buildVerdict(result).detail;
}

// ---------- Verificación cruzada ----------

export const CROSS_CHECK_STEPS: { title: string; detail: string }[] = [
  {
    title: "Vuelve a ejecutar MVT oficial en línea de comandos",
    detail: "Instala mvt-android o mvt-ios desde docs.mvt.re y analiza el mismo backup con los IOCs más recientes de Amnesty Tech (mvt-android check-backup / mvt-ios check-backup). Compara el resultado con este informe.",
  },
  {
    title: "Access Now Digital Security Helpline",
    detail: "Ayuda gratuita 24/7 para activistas, periodistas y sociedad civil. Correo: help@accessnow.org · accessnow.org/help",
  },
  {
    title: "Amnesty International Security Lab",
    detail: "Equipo que mantiene MVT y los indicadores de Pegasus/Predator. Contacto a través de securitylab.amnesty.org cuando hay sospecha de spyware mercenario.",
  },
  {
    title: "Citizen Lab (Universidad de Toronto)",
    detail: "Centro de investigación sobre spyware mercenario. Acepta casos a través de citizenlab.ca cuando se sospecha de un ataque dirigido.",
  },
];

// ---------- Próximos pasos ----------

export function nextSteps(result: MvtParsedResult): string[] {
  const fams = detectFamilies(result.detections);
  const hasMercenary = [...fams.keys()].some((f) => f !== "Life360");
  const hasLife360 = fams.has("Life360");

  if (hasMercenary) {
    return [
      "Apaga las redes Wi-Fi y datos móviles del dispositivo afectado.",
      "No reinicies ni restaures el dispositivo: podrías perder evidencia.",
      "Contacta con una organización especializada (Access Now Helpline, Amnesty Tech, Citizen Lab).",
      "Revoca las contraseñas y sesiones de tus cuentas desde otro dispositivo limpio.",
      "Conserva el respaldo y los resultados MVT como evidencia.",
    ];
  }

  if (hasLife360) {
    return [
      "Abre Ajustes → Aplicaciones y comprueba si Life360 está instalada.",
      "Si no la instalaste tú, desinstálala y cambia la contraseña de tu cuenta Google.",
      "Revisa qué cuenta de Life360 te tiene añadido en su 'círculo' y sal de él.",
      "Comprueba que no haya otras apps de control parental o seguimiento que no reconozcas.",
    ];
  }

  if (result.risk === "critical" || result.risk === "high") {
    return [
      "Aísla el dispositivo de redes sensibles hasta verificar los hallazgos.",
      "Actualiza el sistema operativo y revoca credenciales potencialmente expuestas.",
      "Consulta con un especialista en respuesta a incidentes para análisis profundo.",
      "Conserva los artefactos originales (backup y resultados MVT) como evidencia.",
    ];
  }

  return [
    "Mantén el sistema operativo y las apps actualizadas.",
    "Revisa periódicamente qué apps tienen permisos sensibles (ubicación, SMS, accesibilidad).",
    "Repite el análisis cada cierto tiempo para detectar cambios.",
  ];
}
