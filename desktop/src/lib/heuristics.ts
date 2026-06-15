// ============================================================
// General Spyware & Stalkerware Detection Layer
// ------------------------------------------------------------
// Capa heurística complementaria al motor MVT (IOCs). Analiza permisos
// peligrosos, apps sospechosas, configuraciones de riesgo y comportamiento
// anómalo a partir de los artefactos que ya extrae el parser MVT.
//
// Importante: NUNCA mezcla sus hallazgos con los del motor MVT. El parser
// adjunta su resultado en un campo separado `heuristics` del MvtParsedResult.
// ============================================================

import type {
  MvtParsedResult, MvtDetection, RiskLevel,
} from "./mvt-parser";

export type FindingKind = "confirmed_indicator" | "suspicious_pattern" | "informational";
export type FindingEngine = "stalkerware" | "device_risk";
export type FindingCategory =
  | "dangerous_permission"
  | "suspicious_app"
  | "risky_config"
  | "anomalous_behavior";

export interface HeuristicFinding {
  id: string;
  engine: FindingEngine;
  category: FindingCategory;
  kind: FindingKind;
  title: string;
  evidence: string;
  reason: string;
  severity: RiskLevel;
  recommendation: string;
  source?: { module: string };
}

export interface HeuristicReport {
  overallRisk: RiskLevel;
  findings: HeuristicFinding[];
  countsBySeverity: Record<RiskLevel, number>;
  countsByEngine: Record<FindingEngine, number>;
  countsByKind: Record<FindingKind, number>;
}

// ---------- Catálogos ----------

const DANGEROUS_PERMISSIONS: Record<string, { label: string; weight: number }> = {
  READ_SMS:                  { label: "leer SMS",                       weight: 3 },
  RECEIVE_SMS:               { label: "recibir SMS",                    weight: 3 },
  SEND_SMS:                  { label: "enviar SMS",                     weight: 3 },
  READ_CALL_LOG:             { label: "leer historial de llamadas",     weight: 3 },
  PROCESS_OUTGOING_CALLS:    { label: "interceptar llamadas salientes", weight: 3 },
  READ_CONTACTS:             { label: "leer contactos",                 weight: 2 },
  RECORD_AUDIO:              { label: "grabar micrófono",               weight: 3 },
  CAMERA:                    { label: "usar la cámara",                 weight: 3 },
  ACCESS_BACKGROUND_LOCATION:{ label: "ubicación en segundo plano",     weight: 3 },
  ACCESS_FINE_LOCATION:      { label: "ubicación precisa",              weight: 2 },
  MANAGE_EXTERNAL_STORAGE:   { label: "acceder a todo el almacenamiento", weight: 2 },
  BIND_ACCESSIBILITY_SERVICE:{ label: "usar accesibilidad (leer pantalla)", weight: 4 },
  SYSTEM_ALERT_WINDOW:       { label: "dibujar sobre otras apps",       weight: 2 },
  REQUEST_INSTALL_PACKAGES:  { label: "instalar otras apps",            weight: 2 },
  POST_NOTIFICATIONS:        { label: "leer notificaciones",            weight: 1 },
  GET_ACCOUNTS:              { label: "ver cuentas del dispositivo",    weight: 1 },
};

const KNOWN_STALKERWARE_PACKAGES = new Set<string>([
  // Stalkerware comercial
  "com.mspy.mspy", "com.mspy", "com.support.message",
  "com.flexispy.android", "com.fsp.android",
  "com.cocospy.android", "com.cocospy",
  "com.hoverwatch", "com.hoverwatch.client", "com.refog.hoverwatch",
  "com.spyzie.android", "com.spyic.android",
  "com.xnspy.android",
  "com.cerberusapp",
  "net.familytime.parentalcontrol",
  // Control parental que se usa de forma abusiva
  "com.life360.android.safetymapd",
  "com.qustodio.qustodioapp",
  "com.bark.bark",
  "com.familyguardian",
  "com.kidlogger",
  "com.mobicip.client.android",
  "com.tispy.client",
  "com.theonespy.android",
]);

const CAMOUFLAGE_NAME_PATTERNS = [
  /system\s*service/i,
  /device\s*manager/i,
  /update\s*service/i,
  /security\s*plugin/i,
  /wifi\s*service/i,
  /sync\s*service/i,
  /android\s*service/i,
  /google\s*service$/i,
  /system\s*update$/i,
];

const CAMOUFLAGE_PACKAGE_SUFFIXES = [
  ".systemservice", ".updateservice", ".syncservice",
  ".securityplugin", ".devicemanager",
];

// Apps que legítimamente usan accesibilidad (whitelist parcial)
const ACCESSIBILITY_WHITELIST_PREFIXES = [
  "com.google.android.",
  "com.android.",
  "com.samsung.android.accessibility",
  "com.swiftkey",
  "com.touchtype",
  "org.mozilla.",
  "com.microsoft.",
  "com.lastpass",
  "com.bitwarden",
  "1password.",
  "com.agilebits.",
  "com.google.android.marvin.talkback",
];

// ---------- Helpers ----------

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["low", "medium", "high", "critical"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function isWhitelistedAccessibility(pkg: string): boolean {
  return ACCESSIBILITY_WHITELIST_PREFIXES.some((p) => pkg.startsWith(p));
}

function isLikelySystemPackage(pkg: string): boolean {
  return (
    pkg.startsWith("com.android.") ||
    pkg.startsWith("com.google.android.") ||
    pkg.startsWith("com.samsung.android.") ||
    pkg.startsWith("com.xiaomi.") ||
    pkg.startsWith("com.miui.") ||
    pkg.startsWith("com.huawei.") ||
    pkg.startsWith("com.oneplus.") ||
    pkg.startsWith("android")
  );
}

// ---------- Reglas: Stalkerware & Commercial Spyware ----------

function rulePermissions(detections: MvtDetection[]): HeuristicFinding[] {
  // Agrupa permisos peligrosos por paquete usando los detections existentes
  // del módulo dumpsys_appops ("Package 'X' had risky permission 'Y' set to 'access'").
  const perPkg = new Map<string, Set<string>>();
  for (const d of detections) {
    if (d.module !== "dumpsys_appops" && d.module !== "appops") continue;
    const s = d.summary || "";
    const m =
      s.match(/^Package '([^']+)' had risky permission '([^']+)' set to '(?:access|allow)'/i) ||
      s.match(/^Risky package '([^']+)' had '([^']+)' permission set to '(?:access|allow)'/i);
    if (!m) continue;
    const pkg = m[1];
    const perm = m[2];
    if (!DANGEROUS_PERMISSIONS[perm]) continue;
    if (!perPkg.has(pkg)) perPkg.set(pkg, new Set());
    perPkg.get(pkg)!.add(perm);
  }

  const out: HeuristicFinding[] = [];
  for (const [pkg, perms] of perPkg) {
    const list = [...perms];
    const weight = list.reduce((s, p) => s + (DANGEROUS_PERMISSIONS[p]?.weight ?? 0), 0);
    const hasAccessibility = list.includes("BIND_ACCESSIBILITY_SERVICE");
    const hasComm = list.some((p) => p.includes("SMS") || p.includes("CALL"));

    let severity: RiskLevel = "low";
    if (hasAccessibility && hasComm) severity = "critical";
    else if (weight >= 8) severity = "high";
    else if (weight >= 4 || list.length >= 3) severity = "medium";
    else severity = "low";

    const stalker = KNOWN_STALKERWARE_PACKAGES.has(pkg);
    const kind: FindingKind = stalker ? "confirmed_indicator" : "suspicious_pattern";

    out.push({
      id: `perm:${pkg}`,
      engine: "stalkerware",
      category: "dangerous_permission",
      kind,
      title: `Permisos sensibles concedidos a ${pkg}`,
      evidence: list.map((p) => DANGEROUS_PERMISSIONS[p].label).join(" · "),
      reason:
        `La app tiene ${list.length} permiso${list.length === 1 ? "" : "s"} sensible${list.length === 1 ? "" : "s"} ` +
        `compatible${list.length === 1 ? "" : "s"} con vigilancia (peso ${weight}).` +
        (hasAccessibility ? " Incluye accesibilidad, lo que permite leer la pantalla." : ""),
      severity,
      recommendation:
        stalker
          ? "Desinstala la app si no la has instalado tú a sabiendas y cambia las contraseñas de tus cuentas."
          : "Revisa si reconoces esta app. Si no, revoca sus permisos en Ajustes → Apps → Permisos.",
      source: { module: "dumpsys_appops" },
    });
  }
  return out;
}

function ruleSuspiciousApps(detections: MvtDetection[]): HeuristicFinding[] {
  const out: HeuristicFinding[] = [];
  const seen = new Set<string>();

  for (const d of detections) {
    if (d.module !== "dumpsys_packages" && d.module !== "aqf_packages" && d.module !== "packages") continue;
    const s = d.summary || "";

    // Apps instaladas fuera de tienda oficial
    let m = s.match(/^Found a non-system package installed via adb[^:]*:\s*"([^"]+)"/i);
    if (m) {
      const pkg = m[1];
      if (!seen.has(`adb:${pkg}`)) {
        seen.add(`adb:${pkg}`);
        out.push({
          id: `app-adb:${pkg}`,
          engine: "stalkerware",
          category: "suspicious_app",
          kind: KNOWN_STALKERWARE_PACKAGES.has(pkg) ? "confirmed_indicator" : "suspicious_pattern",
          title: `App instalada por USB/ADB: ${pkg}`,
          evidence: pkg,
          reason: "Esta app no se instaló desde Google Play. Se instaló manualmente conectando el teléfono por cable.",
          severity: KNOWN_STALKERWARE_PACKAGES.has(pkg) ? "high" : "medium",
          recommendation: "Si no recuerdas haberla instalado tú, desinstálala. Comprueba quién tuvo acceso físico al dispositivo.",
          source: { module: "dumpsys_packages" },
        });
      }
      continue;
    }

    m = s.match(/^Found a package installed via a browser[^:]*:\s*"([^"]+)"/i);
    if (m) {
      const pkg = m[1];
      if (!seen.has(`brw:${pkg}`)) {
        seen.add(`brw:${pkg}`);
        out.push({
          id: `app-brw:${pkg}`,
          engine: "stalkerware",
          category: "suspicious_app",
          kind: "suspicious_pattern",
          title: `App descargada desde el navegador: ${pkg}`,
          evidence: pkg,
          reason: "Se instaló un APK descargado desde la web, fuera de Google Play. Es vector común de spyware comercial.",
          severity: "medium",
          recommendation: "Verifica el origen del APK. Si no la reconoces, desinstálala.",
          source: { module: "dumpsys_packages" },
        });
      }
      continue;
    }

    // Familias stalkerware conocidas (cubierto por MVT, lo marcamos también como confirmed_indicator heurístico)
    m = s.match(/^Found a known suspicious app with ID "([^"]+)" matching indicators from "([^"]+)"/i);
    if (m) {
      const pkg = m[1];
      const fam = m[2];
      if (!seen.has(`fam:${pkg}`)) {
        seen.add(`fam:${pkg}`);
        out.push({
          id: `app-fam:${pkg}`,
          engine: "stalkerware",
          category: "suspicious_app",
          kind: "confirmed_indicator",
          title: `App señalada por indicadores conocidos: ${pkg}`,
          evidence: `${pkg} (familia: ${fam})`,
          reason: `El identificador de la app coincide con indicadores públicos de ${fam}.`,
          severity: "high",
          recommendation: "Trátala como sospechosa: desinstálala, revisa cuentas asociadas y considera restaurar el dispositivo.",
          source: { module: "dumpsys_packages" },
        });
      }
    }
  }

  // Camuflaje por package name (sobre cualquier paquete instalado mencionado)
  const camouflaged = new Set<string>();
  for (const d of detections) {
    const pkgM = (d.summary || "").match(/"([a-z][a-z0-9_]+(?:\.[a-z0-9_]+){2,})"/i);
    if (!pkgM) continue;
    const pkg = pkgM[1];
    if (camouflaged.has(pkg)) continue;
    if (isLikelySystemPackage(pkg)) continue;
    const camSuffix = CAMOUFLAGE_PACKAGE_SUFFIXES.some((s) => pkg.toLowerCase().endsWith(s));
    const camName = CAMOUFLAGE_NAME_PATTERNS.some((re) => re.test(pkg));
    if (camSuffix || camName) {
      camouflaged.add(pkg);
      out.push({
        id: `camouflage:${pkg}`,
        engine: "stalkerware",
        category: "suspicious_app",
        kind: "suspicious_pattern",
        title: `Nombre camuflado: ${pkg}`,
        evidence: pkg,
        reason: "El nombre de paquete imita un servicio del sistema (patrón común en spyware).",
        severity: "medium",
        recommendation: "Comprueba qué app es y desinstálala si no la reconoces.",
        source: { module: "dumpsys_packages" },
      });
    }
  }

  return out;
}

// ---------- Reglas: Device Risk Configuration ----------

function ruleDeviceConfig(r: MvtParsedResult): HeuristicFinding[] {
  const out: HeuristicFinding[] = [];

  // Bootloader desbloqueado
  const bl = (r.deviceInfo?.bootloaderState || "").toLowerCase();
  if (bl && (bl === "orange" || bl === "0" || bl === "false" || bl.includes("unlock"))) {
    out.push({
      id: "cfg:bootloader",
      engine: "device_risk",
      category: "risky_config",
      kind: "suspicious_pattern",
      title: "Bootloader desbloqueado",
      evidence: `verifiedbootstate=${r.deviceInfo?.bootloaderState}`,
      reason: "Un bootloader desbloqueado permite ejecutar sistemas operativos modificados que pueden ocultar spyware.",
      severity: "high",
      recommendation: "Restaura el firmware original del fabricante y vuelve a bloquear el bootloader.",
      source: { module: "getprop" },
    });
  }

  // Debug ADB activo
  if (r.deviceInfo?.debuggable === true) {
    out.push({
      id: "cfg:debuggable",
      engine: "device_risk",
      category: "risky_config",
      kind: "informational",
      title: "Modo desarrollador / depuración USB activo",
      evidence: "ro.debuggable=1",
      reason: "Con depuración USB activa, una persona con acceso físico al cable puede instalar apps sin pasar por Google Play.",
      severity: "medium",
      recommendation: "Desactiva las Opciones de desarrollador y la Depuración USB en Ajustes.",
      source: { module: "getprop" },
    });
  }

  // SELinux
  if (r.selinuxStatus && r.selinuxStatus !== "enforcing") {
    out.push({
      id: "cfg:selinux",
      engine: "device_risk",
      category: "risky_config",
      kind: "suspicious_pattern",
      title: `SELinux en modo ${r.selinuxStatus}`,
      evidence: `status=${r.selinuxStatus}`,
      reason: "SELinux fuera de 'enforcing' debilita el aislamiento entre apps y facilita el espionaje entre procesos.",
      severity: "high",
      recommendation: "Restaura una ROM oficial; SELinux solo se debilita en sistemas modificados.",
      source: { module: "selinux_status" },
    });
  }

  // Binarios root
  if (r.rootBinaries && r.rootBinaries.length > 0) {
    out.push({
      id: "cfg:root",
      engine: "device_risk",
      category: "risky_config",
      kind: "suspicious_pattern",
      title: "Indicios de root en el dispositivo",
      evidence: r.rootBinaries.slice(0, 8).join(", "),
      reason: "Se detectaron binarios típicos de un dispositivo con acceso root, que permite saltarse protecciones.",
      severity: "high",
      recommendation: "Si no rooteaste tú el dispositivo, restaura el firmware oficial.",
      source: { module: "root_binaries" },
    });
  }

  // Servicios de accesibilidad concedidos a apps NO del sistema
  if (r.accessibilityServices) {
    for (const a of r.accessibilityServices) {
      if (isWhitelistedAccessibility(a.package)) continue;
      out.push({
        id: `cfg:a11y:${a.package}`,
        engine: "device_risk",
        category: "risky_config",
        kind: "suspicious_pattern",
        title: `Accesibilidad concedida a ${a.package}`,
        evidence: `${a.package}/${a.service}`,
        reason: "Accesibilidad permite a una app leer todo lo que aparece en pantalla y simular toques. Es el permiso más abusado por stalkerware.",
        severity: "high",
        recommendation: "Ve a Ajustes → Accesibilidad → Servicios y revoca el permiso si no la reconoces.",
        source: { module: "dumpsys_accessibility" },
      });
    }
  }

  // Perfiles MDM en iOS
  if (r.iosConfigProfiles) {
    for (const p of r.iosConfigProfiles) {
      const isMdm = (p.type || "").toLowerCase().includes("mdm");
      out.push({
        id: `cfg:profile:${p.uuid || p.name}`,
        engine: "device_risk",
        category: "risky_config",
        kind: isMdm ? "suspicious_pattern" : "informational",
        title: `Perfil de configuración instalado: ${p.name}`,
        evidence: `${p.name}${p.org ? ` · ${p.org}` : ""}${p.type ? ` · ${p.type}` : ""}`,
        reason: isMdm
          ? "Hay un perfil MDM que permite a la organización gestionar el dispositivo, instalar apps y leer tráfico de red."
          : "Hay un perfil de configuración instalado. Puede instalar certificados, VPN o ajustes de red.",
        severity: isMdm ? "high" : "medium",
        recommendation:
          "Ve a Ajustes → General → VPN y gestión del dispositivo y elimina el perfil si no lo reconoces o no lo instaló tu organización.",
        source: { module: "configuration_profiles" },
      });
    }
  }

  // Comportamiento anómalo: top procesos de red destacados (informational)
  if (r.topNetworkProcs && r.topNetworkProcs.length > 0) {
    const big = r.topNetworkProcs[0];
    // Solo si hay un proceso claramente fuera de la norma
    if (big.totalBytes > 50 * 1024 * 1024) {
      out.push({
        id: `beh:netTop:${big.bundle || big.name}`,
        engine: "device_risk",
        category: "anomalous_behavior",
        kind: "informational",
        title: `Alto consumo de red: ${big.name}`,
        evidence: `${(big.totalBytes / (1024 * 1024)).toFixed(1)} MB`,
        reason: "Este proceso ha consumido mucho tráfico de red. Es informativo; verifica si tiene sentido para esa app.",
        severity: "low",
        recommendation: "Si no reconoces la app, revísala en Ajustes y considera limitar su acceso a datos en segundo plano.",
        source: { module: "datausage" },
      });
    }
  }

  return out;
}

// ---------- Orquestador ----------

const SEV_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];

export function runHeuristics(result: MvtParsedResult): HeuristicReport {
  const findings: HeuristicFinding[] = [
    ...rulePermissions(result.detections),
    ...ruleSuspiciousApps(result.detections),
    ...ruleDeviceConfig(result),
  ];

  // Dedup por id
  const seen = new Set<string>();
  const unique = findings.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));

  const countsBySeverity: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const countsByEngine: Record<FindingEngine, number> = { stalkerware: 0, device_risk: 0 };
  const countsByKind: Record<FindingKind, number> = {
    confirmed_indicator: 0, suspicious_pattern: 0, informational: 0,
  };

  for (const f of unique) {
    countsBySeverity[f.severity]++;
    countsByEngine[f.engine]++;
    countsByKind[f.kind]++;
  }

  // Riesgo global heurístico
  let overall: RiskLevel = "low";
  const hasConfirmed = countsByKind.confirmed_indicator > 0;
  if (hasConfirmed && (countsBySeverity.high + countsBySeverity.critical) >= 1) overall = "critical";
  else if (countsBySeverity.critical > 0) overall = "critical";
  else if (countsBySeverity.high >= 1) overall = "high";
  else if (countsBySeverity.medium >= 2) overall = "high";
  else if (countsBySeverity.medium >= 1) overall = "medium";
  else if (countsBySeverity.low >= 3) overall = "medium";

  // Ordenar findings por severidad desc y kind
  const kindOrder: FindingKind[] = ["confirmed_indicator", "suspicious_pattern", "informational"];
  unique.sort((a, b) =>
    SEV_ORDER.indexOf(b.severity) - SEV_ORDER.indexOf(a.severity) ||
    kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) ||
    a.title.localeCompare(b.title)
  );

  return {
    overallRisk: overall,
    findings: unique,
    countsBySeverity,
    countsByEngine,
    countsByKind,
  };
}

export function combineRisk(mvt: RiskLevel, heur: RiskLevel): RiskLevel {
  return maxRisk(mvt, heur);
}

// Etiquetas en español (consistente con el resto de mvt-translate.ts)
export const KIND_LABEL: Record<FindingKind, string> = {
  confirmed_indicator: "Indicador confirmado",
  suspicious_pattern: "Patrón sospechoso",
  informational: "Informativo",
};

export const CATEGORY_LABEL_HEUR: Record<FindingCategory, string> = {
  dangerous_permission: "Permisos peligrosos",
  suspicious_app: "Apps sospechosas",
  risky_config: "Configuración de riesgo",
  anomalous_behavior: "Comportamiento anómalo",
};

export const ENGINE_LABEL: Record<FindingEngine, string> = {
  stalkerware: "Stalkerware & spyware comercial",
  device_risk: "Configuración del dispositivo",
};
