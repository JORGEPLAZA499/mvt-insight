import type { RiskLevel, MvtParsedResult, MvtDetection, MvtDeviceInfo } from "./mvt-parser";

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
  ACCESS_COARSE_LOCATION: "acceder a tu ubicación aproximada",
  ACCESS_BACKGROUND_LOCATION: "acceder a tu ubicación en segundo plano",
  READ_CONTACTS: "leer tus contactos",
  READ_CALL_LOG: "leer tu historial de llamadas",
  PROCESS_OUTGOING_CALLS: "interceptar llamadas salientes",
  WRITE_SETTINGS: "modificar ajustes del sistema",
  READ_MEDIA_VISUAL_USER_SELECTED: "ver fotos/vídeos que selecciones",
  READ_MEDIA_IMAGES: "leer todas tus fotos",
  READ_MEDIA_AUDIO: "leer tus archivos de audio",
  READ_MEDIA_VIDEO: "leer todos tus vídeos",
  POST_NOTIFICATIONS: "enviarte notificaciones",
  MANAGE_EXTERNAL_STORAGE: "gestionar todo el almacenamiento del dispositivo",
  READ_PHONE_STATE: "leer el estado del teléfono y tu número",
  READ_EXTERNAL_STORAGE: "leer archivos del almacenamiento",
  WRITE_EXTERNAL_STORAGE: "escribir en el almacenamiento",
  GET_ACCOUNTS: "ver las cuentas configuradas en el dispositivo",
  READ_CALENDAR: "leer tu calendario",
  WRITE_CALENDAR: "modificar tu calendario",
};

export function humanPermission(p: string): string {
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

// ---------- Clave canónica para deduplicar indicios ----------
// Devuelve una "entidad" (package, dominio, familia) y una etiqueta legible.
export function detectionKey(d: MvtDetection): { key: string; label: string } {
  const s = (d.summary || "").trim();

  // 1) Familia conocida entre comillas: "Pegasus", "Life360"…
  // Dedup SIEMPRE por familia (ignorar package del summary) para que todas las
  // evidencias de la misma familia (receivers, certificados, packages…) se sumen
  // a un único grupo.
  for (const fam of ALL_FAMILIES) {
    if (s.includes(`"${fam}"`)) {
      const pkgM = s.match(/\b([a-z][a-z0-9_]+(?:\.[a-z0-9_]+){2,})\b/i);
      const label = pkgM ? `${fam} (${pkgM[1]})` : fam;
      return { key: `fam:${fam.toLowerCase()}`, label };
    }
  }

  // 2) Package Android (com.foo.bar) o bundle iOS
  const pkgM = s.match(/\b([a-z][a-z0-9_]+(?:\.[a-z0-9_]+){2,})\b/i);
  if (pkgM) return { key: `pkg:${pkgM[1].toLowerCase()}`, label: pkgM[1] };

  // 3) Dominio
  const domM = s.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i);
  if (domM) return { key: `dom:${domM[1].toLowerCase()}`, label: domM[1] };

  // 4) Fallback: summary normalizado (sin rutas/IDs)
  const norm = s
    .toLowerCase()
    .replace(/\/[^\s"']+/g, "")
    .replace(/\b\d{3,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return { key: `raw:${norm}`, label: s.slice(0, 80) };
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

// ---------- Highlights por módulo ("qué" hay detrás de cada cifra) ----------

export interface ModuleHighlight {
  label: string;
  count: number;
  detail?: string;
}

export function buildModuleHighlights(
  detections: MvtDetection[],
  moduleKey: string,
  limit = 8,
): ModuleHighlight[] {
  const items = detections.filter((d) => d.module === moduleKey);
  if (items.length === 0) return [];

  const buckets = new Map<string, ModuleHighlight>();
  const push = (label: string, detail?: string) => {
    const key = `${label}|${detail ?? ""}`;
    const cur = buckets.get(key);
    if (cur) cur.count += 1;
    else buckets.set(key, { label, count: 1, detail });
  };

  for (const d of items) {
    const s = (d.summary || "").trim();

    if (moduleKey === "dumpsys_appops") {
      const m = s.match(/^Package '([^']+)' had risky permission '([^']+)' set to '([^']+)'/i);
      if (m) {
        const verb = /access|allow/i.test(m[3]) ? "puede" : "ya no puede";
        push(m[1], `${verb} ${humanPermission(m[2])}`);
        continue;
      }
      const m2 = s.match(/^Risky package '([^']+)' had '([^']+)' permission set to '([^']+)'/i);
      if (m2) {
        const verb = /access|allow/i.test(m2[3]) ? "puede" : "ya no puede";
        push(m2[1], `${verb} ${humanPermission(m2[2])}`);
        continue;
      }
    }

    if (moduleKey === "dumpsys_battery_daily") {
      const down = s.match(/^Detected downgrade of package ([^\s]+) from vers (\d+) to vers (\d+)/i);
      if (down) { push(down[1], `downgrade ${down[2]} → ${down[3]}`); continue; }
      const uni = s.match(/^Detected uninstall of package ([^\s]+)/i);
      if (uni) { push(uni[1], "desinstalación detectada"); continue; }
    }

    if (moduleKey === "aqf_packages" || moduleKey === "dumpsys_packages") {
      const adb = s.match(/^Found a non-system package installed via adb[^:]*:\s*"([^"]+)"/i);
      if (adb) { push(adb[1], "instalada por USB/ADB"); continue; }
      const br = s.match(/^Found a package installed via a browser[^:]*:\s*"([^"]+)"/i);
      if (br) { push(br[1], "instalada desde el navegador"); continue; }
      const via = s.match(/^Found a package installed via (?:an? )?(.+?):\s*"([^"]+)"/i);
      if (via) { push(via[2], `instalada vía ${via[1]}`); continue; }
      const cert = s.match(/^Found a known suspicious app certf?ificate.+from "([^"]+)"/i);
      if (cert) { push(cert[1], "certificado de firma sospechoso"); continue; }
      const sus = s.match(/^Found a known suspicious app with ID "([^"]+)" matching indicators from "([^"]+)"/i);
      if (sus) { push(sus[1], `coincide con ${sus[2]}`); continue; }
    }

    if (moduleKey === "dumpsys_receivers") {
      const m = s.match(/^Found a known suspicious receiver with name\s+"([^"\/]+)\/([^"]+)" matching indicators from "([^"]+)"/i);
      if (m) {
        const comp = m[2].split(".").pop() || m[2];
        push(m[1], `receptor "${comp}" (${m[3]})`);
        continue;
      }
    }

    if (moduleKey === "dumpsys_activities") {
      const m = s.match(/^Found .*?"([^"\/]+)\/([^"]+)".*from "([^"]+)"/i);
      if (m) {
        const comp = m[2].split(".").pop() || m[2];
        push(m[1], `actividad "${comp}" (${m[3]})`);
        continue;
      }
    }

    if (moduleKey === "tombstones") {
      const m = s.match(/crash in process '([^']+)'.*at (.+)$/i);
      if (m) { push(m[1], `fallo el ${m[2]}`); continue; }
    }

    const { label } = detectionKey(d);
    push(label, humanizeDetection(s).slice(0, 120));
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

// ============================================================
// Ficha del dispositivo en lenguaje claro
// ============================================================

// Modelos comerciales: códigos internos -> nombre que el usuario reconoce.
// Lista corta de los más frecuentes; si no hay match, se muestra el código tal cual.
const MODEL_NICKNAMES: Record<string, string> = {
  // Samsung Galaxy S series
  "SM-S901": "Galaxy S22", "SM-S901B": "Galaxy S22", "SM-S901U": "Galaxy S22",
  "SM-S906": "Galaxy S22+", "SM-S908": "Galaxy S22 Ultra",
  "SM-S911": "Galaxy S23", "SM-S911B": "Galaxy S23", "SM-S916": "Galaxy S23+", "SM-S918": "Galaxy S23 Ultra",
  "SM-S921": "Galaxy S24", "SM-S921B": "Galaxy S24", "SM-S926": "Galaxy S24+", "SM-S928": "Galaxy S24 Ultra",
  "SM-S931": "Galaxy S25", "SM-S936": "Galaxy S25+", "SM-S938": "Galaxy S25 Ultra",
  "SM-G991": "Galaxy S21", "SM-G996": "Galaxy S21+", "SM-G998": "Galaxy S21 Ultra",
  "SM-G981": "Galaxy S20", "SM-G986": "Galaxy S20+", "SM-G988": "Galaxy S20 Ultra",
  // Samsung A
  "SM-A546": "Galaxy A54", "SM-A556": "Galaxy A55", "SM-A346": "Galaxy A34", "SM-A356": "Galaxy A35",
  "SM-A536": "Galaxy A53", "SM-A526": "Galaxy A52",
  // Samsung Z
  "SM-F946": "Galaxy Z Fold5", "SM-F731": "Galaxy Z Flip5",
  "SM-F956": "Galaxy Z Fold6", "SM-F741": "Galaxy Z Flip6",
  // Google Pixel
  "Pixel 6": "Pixel 6", "Pixel 6a": "Pixel 6a", "Pixel 6 Pro": "Pixel 6 Pro",
  "Pixel 7": "Pixel 7", "Pixel 7a": "Pixel 7a", "Pixel 7 Pro": "Pixel 7 Pro",
  "Pixel 8": "Pixel 8", "Pixel 8a": "Pixel 8a", "Pixel 8 Pro": "Pixel 8 Pro",
  "Pixel 9": "Pixel 9", "Pixel 9 Pro": "Pixel 9 Pro", "Pixel 9 Pro XL": "Pixel 9 Pro XL",
  // Xiaomi
  "M2102J20SG": "POCO X3 Pro", "M2007J3SG": "Mi 10T Pro",
  "2201123G": "Xiaomi 12", "2201122G": "Xiaomi 12 Pro",
  "2210132G": "Xiaomi 13", "2211133G": "Xiaomi 13 Pro",
  "2401117G": "Xiaomi 14",
  // OnePlus
  "CPH2451": "OnePlus 11", "CPH2581": "OnePlus 12",
  // iPhone (ProductType)
  "iPhone14,2": "iPhone 13 Pro", "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 mini", "iPhone14,5": "iPhone 13",
  "iPhone14,7": "iPhone 14", "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro", "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15", "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro", "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,1": "iPhone 16 Pro", "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16", "iPhone17,4": "iPhone 16 Plus",
};

export function marketingNameForModel(model?: string): string | undefined {
  if (!model) return undefined;
  if (MODEL_NICKNAMES[model]) return MODEL_NICKNAMES[model];
  // Match por prefijo Samsung SM-XXXX (sin sufijo regional)
  const prefix = Object.keys(MODEL_NICKNAMES).find((k) => model.toUpperCase().startsWith(k.toUpperCase()));
  return prefix ? MODEL_NICKNAMES[prefix] : undefined;
}

function describeBootloader(state?: string): string | undefined {
  if (!state) return undefined;
  const s = state.toLowerCase();
  if (s === "green" || s === "1" || s === "true" || s === "locked") return "bloqueado (recomendado)";
  if (s === "orange" || s === "0" || s === "false" || s === "unlocked") return "desbloqueado — el sistema podría haber sido modificado";
  if (s === "yellow") return "modificado con clave propia";
  if (s === "red") return "no se puede verificar";
  return state;
}

function describeLocale(loc?: string): string | undefined {
  if (!loc) return undefined;
  try {
    const parts = loc.replace("_", "-").split("-");
    const lang = parts[0];
    const region = parts[1];
    const langName = new Intl.DisplayNames(["es"], { type: "language" }).of(lang);
    const regionName = region ? new Intl.DisplayNames(["es"], { type: "region" }).of(region) : undefined;
    return [langName, regionName].filter(Boolean).join(" · ");
  } catch { return loc; }
}

function describeSecurityPatch(patch?: string): string | undefined {
  if (!patch) return undefined;
  // formato 2024-09-01
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(patch);
  if (!m) return patch;
  const d = new Date(`${patch}T00:00:00Z`);
  const months = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.5)));
  if (months <= 3) return `${patch} (reciente)`;
  if (months <= 9) return `${patch} (con algunos meses de retraso)`;
  return `${patch} (más de ${months} meses — conviene actualizar)`;
}

export interface DeviceCardField {
  label: string;
  value: string;
  hint?: string;
}

export function buildDeviceCard(info?: MvtDeviceInfo): DeviceCardField[] {
  if (!info) return [];
  const fields: DeviceCardField[] = [];
  const maker = info.manufacturer || info.brand;
  const isApple = (maker || "").toLowerCase() === "apple";
  const osName = isApple ? "iOS" : "Android";

  if (maker) fields.push({ label: "Marca", value: maker });
  if (info.model) {
    const nick = marketingNameForModel(info.model);
    fields.push({
      label: "Modelo",
      value: nick ? `${nick}` : info.model,
      hint: nick && nick !== info.model ? `Código interno: ${info.model}` : undefined,
    });
  }
  if (info.osVersion) {
    fields.push({ label: "Sistema operativo", value: `${osName} ${info.osVersion}` });
  }
  const patch = describeSecurityPatch(info.securityPatch);
  if (patch) fields.push({ label: "Parche de seguridad", value: patch, hint: "Fecha del último parche de seguridad instalado." });
  if (info.buildId) fields.push({ label: "Versión del firmware", value: info.buildId });
  if (info.deviceName) fields.push({ label: "Nombre del dispositivo", value: info.deviceName, hint: "El que aparece en Bluetooth y Wi-Fi." });
  const loc = describeLocale(info.locale);
  if (loc) fields.push({ label: "Idioma / región", value: loc });
  if (info.timezone) fields.push({ label: "Zona horaria", value: info.timezone });
  if (info.carrier) fields.push({ label: "Operador (SIM)", value: info.carrier });
  if (info.regionInfo) fields.push({ label: "Región del dispositivo", value: info.regionInfo });
  const boot = describeBootloader(info.bootloaderState);
  if (boot) fields.push({ label: "Estado del bootloader", value: boot, hint: "Indica si el sistema operativo ha sido modificado." });
  if (typeof info.debuggable === "boolean") {
    fields.push({
      label: "Modo desarrollador",
      value: info.debuggable ? "activo (mayor superficie de riesgo)" : "no activo",
    });
  }
  if (info.serialLast4) {
    fields.push({ label: "Número de serie", value: `••••${info.serialLast4}`, hint: "Solo se muestran los últimos 4 dígitos por privacidad." });
  }
  return fields;
}

// ============================================================
// Apps con más actividad sospechosa
// ============================================================

const SYSTEM_PREFIXES = [
  "com.google.", "com.android.", "android.",
  "com.samsung.", "com.sec.", "com.miui.", "com.xiaomi.", "com.huawei.",
  "com.oneplus.", "com.oppo.", "com.vivo.", "com.realme.",
  "com.apple.",
];

const KNOWN_PACKAGES: Record<string, string> = {
  "com.whatsapp": "WhatsApp",
  "com.whatsapp.w4b": "WhatsApp Business",
  "org.telegram.messenger": "Telegram",
  "org.thoughtcrime.securesms": "Signal",
  "com.instagram.android": "Instagram",
  "com.facebook.katana": "Facebook",
  "com.facebook.orca": "Facebook Messenger",
  "com.zhiliaoapp.musically": "TikTok",
  "com.twitter.android": "X (Twitter)",
  "com.snapchat.android": "Snapchat",
  "com.spotify.music": "Spotify",
  "com.netflix.mediaclient": "Netflix",
  "com.google.android.gm": "Gmail",
  "com.google.android.youtube": "YouTube",
  "com.android.chrome": "Chrome",
  "com.microsoft.teams": "Microsoft Teams",
  "com.skype.raider": "Skype",
  "com.life360.android.safetymapd": "Life360",
};

export type AppOrigin = "system" | "known" | "unknown";

export interface SuspiciousApp {
  packageName: string;
  displayName: string;
  origin: AppOrigin;
  originLabel: string;
  count: number;
  severity: RiskLevel;
  categories: string[];
}

function packageFromDetection(d: MvtDetection): string | undefined {
  // 1) raw fields
  const raw = d.raw && typeof d.raw === "object" ? d.raw : null;
  if (raw) {
    for (const k of ["package_name", "package", "matched_indicator"]) {
      const v = (raw as any)[k];
      if (typeof v === "string" && /^[a-z][a-z0-9_]+(?:\.[a-z0-9_]+){2,}$/i.test(v)) return v;
    }
  }
  // 2) from summary
  const m = (d.summary || "").match(/['"]([a-z][a-z0-9_]+(?:\.[a-z0-9_]+){2,})['"]/i)
    || (d.summary || "").match(/\b([a-z][a-z0-9_]+(?:\.[a-z0-9_]+){2,})\b/i);
  return m ? m[1] : undefined;
}

function classifyOrigin(pkg: string): { origin: AppOrigin; label: string } {
  if (SYSTEM_PREFIXES.some((p) => pkg.startsWith(p))) return { origin: "system", label: "App del sistema o del fabricante" };
  if (KNOWN_PACKAGES[pkg]) return { origin: "known", label: "App popular conocida" };
  return { origin: "unknown", label: "Origen no reconocido — revísala" };
}

function moduleToCategory(moduleKey: string): string {
  switch (moduleKey) {
    case "dumpsys_appops": return "permisos sensibles";
    case "dumpsys_accessibility": return "accesibilidad";
    case "dumpsys_receivers": return "componentes en segundo plano";
    case "dumpsys_activities": return "actividad en pantalla";
    case "dumpsys_packages":
    case "aqf_packages": return "instalación de apps";
    case "tombstones": return "fallos del sistema";
    case "sms": return "mensajes SMS";
    case "dumpsys_battery_history":
    case "dumpsys_battery_daily": return "uso de batería";
    default: return humanizeModule(moduleKey).toLowerCase();
  }
}

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function buildTopApps(detections: MvtDetection[], limit = 10): SuspiciousApp[] {
  const map = new Map<string, SuspiciousApp & { catSet: Set<string> }>();
  for (const d of detections) {
    const pkg = packageFromDetection(d);
    if (!pkg) continue;
    let app = map.get(pkg);
    if (!app) {
      const oc = classifyOrigin(pkg);
      app = {
        packageName: pkg,
        displayName: KNOWN_PACKAGES[pkg] || pkg.split(".").slice(-1)[0],
        origin: oc.origin,
        originLabel: oc.label,
        count: 0,
        severity: "low",
        categories: [],
        catSet: new Set(),
      };
      map.set(pkg, app);
    }
    app.count += 1;
    const lvl = d.level ?? "low";
    if ((SEV_ORDER[lvl] ?? 0) > (SEV_ORDER[app.severity] ?? 0)) app.severity = lvl;
    app.catSet.add(moduleToCategory(d.module));
  }
  const arr = [...map.values()].map((a) => ({ ...a, categories: [...a.catSet] }));
  return arr
    .sort((a, b) => {
      const s = (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0);
      return s !== 0 ? s : b.count - a.count;
    })
    .slice(0, limit)
    .map(({ catSet: _omit, ...rest }) => rest);
}

// ============================================================
// Cronología en lenguaje humano
// ============================================================

export interface HumanEvent {
  when: string;
  whenIso: string;
  sentence: string;
  severity: RiskLevel;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${date} a las ${time}`;
}

function eventSentence(module: string, summary: string): string {
  const s = summary.trim();

  // Permiso peligroso
  let m = s.match(/^Package '([^']+)' had risky permission '([^']+)' set to '([^']+)'/i);
  if (m) {
    const verb = /access|allow/i.test(m[3]) ? "recibió permiso para" : "perdió el permiso de";
    return `La app "${m[1]}" ${verb} ${humanPermission(m[2])}.`;
  }

  // Receiver/Service/Activity sospechoso
  m = s.match(/^Found a known suspicious (?:receiver|service) with name\s+"([^"\/]+)\/([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) return `Se activó un componente en segundo plano de la app "${m[1]}", asociado a ${m[3]}.`;

  // App instalada vía ADB/navegador
  m = s.match(/^Found a non-system package installed via adb[^:]*:\s*"([^"]+)"/i);
  if (m) return `Se instaló la app "${m[1]}" por cable USB/ADB (fuera de la tienda oficial).`;
  m = s.match(/^Found a package installed via a browser[^:]*:\s*"([^"]+)"/i);
  if (m) return `Se instaló la app "${m[1]}" desde el navegador (fuera de la tienda oficial).`;

  // App sospechosa por ID
  m = s.match(/^Found a known suspicious app with ID "([^"]+)" matching indicators from "([^"]+)"/i);
  if (m) return `Se detectó la app "${m[1]}", asociada a ${m[2]}.`;

  // Crash
  m = s.match(/^Crash of process "?([^"\s]+)"?/i);
  if (m) return `Se registró un fallo crítico del proceso "${m[1]}".`;

  // Servicio accesibilidad
  if (module === "dumpsys_accessibility") return `Cambio en los servicios de accesibilidad: ${humanizeDetection(s)}`;

  return humanizeDetection(s);
}

export function buildHumanTimeline(
  timeline: MvtParsedResult["timeline"],
  detections: MvtDetection[],
  limit = 20,
): HumanEvent[] {
  // Cogemos eventos con timestamp. Si vienen del timeline (módulo humanizado),
  // intentamos recuperar la summary original buscando la detección coincidente.
  const enriched: HumanEvent[] = [];
  const detsByTs = new Map<string, MvtDetection[]>();
  for (const d of detections) {
    if (!d.timestamp) continue;
    const list = detsByTs.get(d.timestamp) ?? [];
    list.push(d);
    detsByTs.set(d.timestamp, list);
  }
  const seen = new Set<string>();
  for (const e of timeline) {
    if (!e.timestamp) continue;
    // preferir la detección original (tiene el module key crudo)
    const sameTs = detsByTs.get(e.timestamp) ?? [];
    const orig = sameTs.find((d) => e.summary.startsWith(d.summary.slice(0, 40)) || d.summary === e.summary) ?? sameTs[0];
    const moduleKey = orig?.module ?? "";
    const sentence = eventSentence(moduleKey, e.summary);
    const key = `${e.timestamp}|${sentence}`;
    if (seen.has(key)) continue;
    seen.add(key);
    enriched.push({
      when: formatWhen(e.timestamp),
      whenIso: e.timestamp,
      sentence,
      severity: e.severity,
    });
  }
  // Priorizar por severidad y luego por fecha asc
  return enriched
    .sort((a, b) => {
      const s = (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0);
      return s !== 0 ? s : a.whenIso.localeCompare(b.whenIso);
    })
    .slice(0, limit)
    .sort((a, b) => a.whenIso.localeCompare(b.whenIso));
}

// ============================================================
// Glosario
// ============================================================

export const GLOSSARY: { term: string; definition: string }[] = [
  { term: "MVT (Mobile Verification Toolkit)", definition: "Herramienta libre de Amnesty International para buscar rastros conocidos de spyware en copias de seguridad de móviles." },
  { term: "AndroidQF", definition: "Utilidad oficial que extrae del móvil Android los datos necesarios (paquetes, permisos, propiedades) que después analiza MVT." },
  { term: "IOC (Indicador de Compromiso)", definition: "Pista pública que identifica un malware concreto: un nombre de paquete, un dominio, un hash de certificado, etc." },
  { term: "Módulo", definition: "Cada una de las áreas del dispositivo que MVT analiza por separado (permisos, paquetes instalados, accesibilidad, etc.)." },
  { term: "Paquete (package)", definition: "Identificador único de una app en Android, por ejemplo 'com.whatsapp'. En iOS se llama 'bundle ID'." },
  { term: "Permiso sensible", definition: "Permiso que da a una app acceso a datos delicados (ubicación, micrófono, SMS, contactos, accesibilidad)." },
  { term: "Servicio de accesibilidad", definition: "Permiso muy potente pensado para personas con discapacidad: permite a una app leer la pantalla y simular toques. Es muy usado por stalkerware." },
  { term: "Bootloader", definition: "Programa que arranca el sistema operativo del móvil. Si está desbloqueado, el sistema podría haber sido modificado." },
  { term: "Root", definition: "Acceso de administrador total al sistema Android. Si está activo, las apps pueden saltarse muchas protecciones." },
  { term: "Parche de seguridad", definition: "Actualización del fabricante que corrige fallos de seguridad. Si lleva muchos meses sin instalarse, el dispositivo es más vulnerable." },
  { term: "Stalkerware", definition: "Apps comerciales legales de vigilancia (control parental, seguimiento de pareja). No son malware en sentido estricto, pero permiten espiar." },
  { term: "Spyware mercenario", definition: "Malware avanzado de uso dirigido vendido a gobiernos (Pegasus, Predator, FinFisher). Trátalo siempre como emergencia." },
];
