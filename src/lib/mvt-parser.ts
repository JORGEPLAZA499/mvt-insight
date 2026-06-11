import JSZip from "jszip";
import { detectPlatform, lookupModule, Platform } from "./mvt-modules";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface MvtDetection {
  module: string;
  timestamp?: string;
  summary: string;
  level?: RiskLevel;
  raw: any;
}

export interface MvtModuleResult {
  key: string;
  label: string;
  fileName: string;
  entries: number;
  detected: number;
  description: string;
}

export interface MvtDeviceInfo {
  brand?: string;
  manufacturer?: string;
  model?: string;
  marketingName?: string;
  deviceName?: string;
  osVersion?: string;
  buildId?: string;
  securityPatch?: string;
  locale?: string;
  timezone?: string;
  carrier?: string;
  bootloaderState?: string;
  debuggable?: boolean;
  serialLast4?: string;
  regionInfo?: string;
}

export type SelinuxStatus = "enforcing" | "permissive" | "disabled";

export interface AccessibilityServiceEntry {
  package: string;
  service: string;
}

export interface IosConfigProfile {
  name: string;
  org?: string;
  uuid?: string;
  type?: string;
  installDate?: string;
}

export interface NetworkProcUsage {
  name: string;
  bundle?: string;
  totalBytes: number;
}

export interface MvtParsedResult {
  platform: Platform;
  totalEntries: number;
  totalDetections: number;
  modules: MvtModuleResult[];
  detections: MvtDetection[];
  timeline: { timestamp: string; module: string; summary: string; severity: RiskLevel }[];
  risk: RiskLevel;
  parsedAt: string;
  sourceName: string;
  deviceInfo?: MvtDeviceInfo;
  rootBinaries?: string[];
  selinuxStatus?: SelinuxStatus;
  accessibilityServices?: AccessibilityServiceEntry[];
  iosConfigProfiles?: IosConfigProfile[];
  topNetworkProcs?: NetworkProcUsage[];
}

// Strip path & extension, return { key, isDetected, ext }
function parseFileName(name: string): { key: string; isDetected: boolean; ext: "json" | "txt" } | null {
  const base = name.split("/").pop() || name;
  const lower = base.toLowerCase();
  let ext: "json" | "txt";
  let stem: string;
  if (lower.endsWith(".json")) { ext = "json"; stem = base.slice(0, -5); }
  else if (lower.endsWith(".txt")) { ext = "txt"; stem = base.slice(0, -4); }
  else return null;
  let key = stem;
  let isDetected = false;
  if (key.endsWith("_detected")) {
    isDetected = true;
    key = key.slice(0, -"_detected".length);
  }
  return { key, isDetected, ext };
}

// Parse `[ro.product.brand]: [Samsung]` lines from `getprop` text output.
function parseGetpropText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /^\[([^\]]+)\]:\s*\[([^\]]*)\]\s*$/;
  for (const line of text.split(/\r?\n/)) {
    const m = re.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function countEntries(data: any): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") return Object.keys(data).length;
  return 0;
}

function pickTimestamp(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = ["isodate", "timestamp", "date", "created", "modified", "time", "datetime"];
  for (const k of keys) {
    if (typeof obj[k] === "string") return obj[k];
  }
  return undefined;
}

function summarize(obj: any): string {
  if (obj == null) return "(sin datos)";
  if (typeof obj !== "object") return String(obj);
  // 1) Prefer human-readable message (MVT detections include rich context here).
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  if (typeof obj.description === "string" && obj.description.trim()) return obj.description.trim();
  // 2) Construct a short phrase from identifying fields.
  const cand = ["matched_indicator", "indicator", "package_name", "name", "process", "service", "domain", "url", "path", "value"];
  const parts: string[] = [];
  for (const k of cand) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) { parts.push(v.trim()); break; }
    if (v && typeof v === "object" && typeof v.value === "string") { parts.push(v.value); break; }
  }
  if (parts.length) return parts.join(" ");
  // 3) Last resort: stringify, truncated at word boundary.
  try {
    const s = JSON.stringify(obj);
    if (s.length <= 200) return s;
    const cut = s.lastIndexOf(" ", 200);
    return (cut > 80 ? s.slice(0, cut) : s.slice(0, 200)) + "…";
  } catch { return "(evidencia)"; }
}

function pickLevel(obj: any, fallback: RiskLevel): RiskLevel {
  const v = obj && typeof obj === "object" ? obj.level ?? obj.severity : undefined;
  if (typeof v === "string") {
    const l = v.toLowerCase();
    if (l === "low" || l === "medium" || l === "high" || l === "critical") return l;
    if (l === "info" || l === "informational") return "low";
    if (l === "warn" || l === "warning") return "medium";
    if (l === "error") return "high";
  }
  return fallback;
}

function extractRootBinaries(data: any, fromText?: string): string[] {
  const out = new Set<string>();
  const push = (s: any) => {
    if (typeof s === "string" && s.trim()) {
      const base = s.trim().split(/[\\/]/).pop() || s.trim();
      if (base) out.add(base);
    }
  };
  if (Array.isArray(data)) {
    for (const it of data) {
      if (typeof it === "string") push(it);
      else if (it && typeof it === "object") push((it as any).name || (it as any).path || (it as any).binary || (it as any).matched_indicator);
    }
  } else if (data && typeof data === "object") {
    for (const v of Object.values(data)) {
      if (typeof v === "string") push(v);
      else if (Array.isArray(v)) v.forEach(push);
    }
  } else if (typeof fromText === "string") {
    for (const l of fromText.split(/\r?\n/)) push(l);
  }
  return [...out].slice(0, 20);
}

function extractSelinuxStatus(data: any, fromText?: string): SelinuxStatus | undefined {
  const candidate = (s: any): string | undefined => {
    if (typeof s !== "string") return undefined;
    const v = s.toLowerCase().trim();
    if (v.includes("enforcing")) return "enforcing";
    if (v.includes("permissive")) return "permissive";
    if (v.includes("disabled")) return "disabled";
    return undefined;
  };
  if (data && typeof data === "object") {
    const obj: any = Array.isArray(data) ? data[0] : data;
    if (obj) {
      const v = candidate(obj.status) || candidate(obj.selinux) || candidate(obj.value) || candidate(obj.mode);
      if (v) return v as SelinuxStatus;
    }
  }
  if (typeof fromText === "string") {
    const v = candidate(fromText);
    if (v) return v as SelinuxStatus;
  }
  return undefined;
}

function extractAccessibilityServices(data: any): AccessibilityServiceEntry[] {
  const out: AccessibilityServiceEntry[] = [];
  const seen = new Set<string>();
  const pushPair = (pkg: string, svc: string) => {
    const key = `${pkg}/${svc}`;
    if (!seen.has(key)) { seen.add(key); out.push({ package: pkg, service: svc }); }
  };
  const tryString = (s: any) => {
    if (typeof s !== "string") return;
    // Format: "com.foo/com.foo.bar.Service"
    const m = s.match(/^([a-z][\w.]+)\/([\w.$]+)$/i);
    if (m) pushPair(m[1], m[2]);
  };
  const visit = (it: any) => {
    if (!it) return;
    if (typeof it === "string") { tryString(it); return; }
    if (typeof it !== "object") return;
    const o: any = it;
    const pkg = o.package_name || o.package || o.pkg;
    const svc = o.service || o.service_name || o.component;
    if (typeof pkg === "string" && typeof svc === "string") {
      pushPair(pkg, svc);
    } else if (typeof o.id === "string") {
      tryString(o.id);
    } else if (typeof o.name === "string") {
      tryString(o.name);
    }
    // Listas anidadas
    const enabled = o.enabled_services || o.bound_services || o.services;
    if (Array.isArray(enabled)) enabled.forEach(visit);
  };
  if (Array.isArray(data)) data.forEach(visit);
  else if (data && typeof data === "object") {
    visit(data);
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) v.forEach(visit);
    }
  }
  return out.slice(0, 30);
}

function extractIosConfigProfiles(data: any): IosConfigProfile[] {
  const out: IosConfigProfile[] = [];
  const items: any[] = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o: any = it;
    const name = o.PayloadDisplayName || o.payload_display_name || o.name;
    if (typeof name !== "string" || !name.trim()) continue;
    out.push({
      name: name.trim(),
      org: typeof o.PayloadOrganization === "string" ? o.PayloadOrganization : typeof o.payload_organization === "string" ? o.payload_organization : undefined,
      uuid: typeof o.PayloadUUID === "string" ? o.PayloadUUID : typeof o.payload_uuid === "string" ? o.payload_uuid : undefined,
      type: typeof o.PayloadType === "string" ? o.PayloadType : typeof o.payload_type === "string" ? o.payload_type : undefined,
      installDate: typeof o.InstallDate === "string" ? o.InstallDate : typeof o.install_date === "string" ? o.install_date : undefined,
    });
  }
  return out.slice(0, 30);
}

function extractNetworkTop(data: any): NetworkProcUsage[] {
  const map = new Map<string, NetworkProcUsage>();
  const items: any[] = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    const o: any = it;
    const name = o.proc_name || o.bundle_id || o.process || o.name;
    if (typeof name !== "string") continue;
    const num = (x: any) => (typeof x === "number" ? x : typeof x === "string" ? Number(x) || 0 : 0);
    const bytes = num(o.wifi_in) + num(o.wifi_out) + num(o.wwan_in) + num(o.wwan_out)
      + num(o.WWANIn) + num(o.WWANOut) + num(o.WifiIn) + num(o.WifiOut);
    if (bytes <= 0) continue;
    const prev = map.get(name);
    if (prev) prev.totalBytes += bytes;
    else map.set(name, { name, bundle: typeof o.bundle_id === "string" ? o.bundle_id : undefined, totalBytes: bytes });
  }
  return [...map.values()].sort((a, b) => b.totalBytes - a.totalBytes).slice(0, 5);
}

async function readFileEntries(files: File[]): Promise<{ name: string; text: string }[]> {
  const out: { name: string; text: string }[] = [];
  const accept = (p: string) => {
    const l = p.toLowerCase();
    return l.endsWith(".json") || l.endsWith(".txt");
  };
  for (const f of files) {
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".zip")) {
      const buf = await f.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const tasks: Promise<void>[] = [];
      zip.forEach((path, entry) => {
        if (entry.dir) return;
        if (!accept(path)) return;
        tasks.push(entry.async("string").then((text) => { out.push({ name: path, text }); }));
      });
      await Promise.all(tasks);
    } else if (accept(lower)) {
      const text = await f.text();
      out.push({ name: f.name, text });
    }
  }
  return out;
}
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".zip")) {
      const buf = await f.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const tasks: Promise<void>[] = [];
      zip.forEach((path, entry) => {
        if (entry.dir) return;
        if (!accept(path)) return;
        tasks.push(entry.async("string").then((text) => { out.push({ name: path, text }); }));
      });
      await Promise.all(tasks);
    } else if (accept(lower)) {
      const text = await f.text();
      out.push({ name: f.name, text });
    }
  }
  return out;
}

function extractAndroidGetprop(data: any): MvtDeviceInfo {
  const map = new Map<string, string>();
  const add = (k: any, v: any) => {
    if (typeof k === "string" && typeof v === "string") map.set(k.trim(), v.trim());
  };
  if (Array.isArray(data)) {
    for (const it of data) {
      if (it && typeof it === "object") add(it.name ?? it.key ?? it.property, it.value ?? it.val);
    }
  } else if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) add(k, v as any);
  }
  const get = (k: string) => map.get(k);
  const serial = get("ro.serialno") || get("ril.serialnumber");
  const debuggable = get("ro.debuggable");
  return {
    brand: get("ro.product.brand"),
    manufacturer: get("ro.product.manufacturer"),
    model: get("ro.product.model"),
    deviceName: get("ro.product.device"),
    osVersion: get("ro.build.version.release"),
    buildId: get("ro.build.display.id") || get("ro.build.id"),
    securityPatch: get("ro.build.version.security_patch"),
    locale: get("persist.sys.locale") || get("ro.product.locale"),
    timezone: get("persist.sys.timezone"),
    carrier: get("gsm.sim.operator.alpha") || get("gsm.operator.alpha"),
    bootloaderState: get("ro.boot.verifiedbootstate") || get("ro.boot.flash.locked"),
    debuggable: debuggable === "1" || debuggable === "true" ? true : debuggable === "0" ? false : undefined,
    serialLast4: serial && serial.length >= 4 ? serial.slice(-4) : undefined,
  };
}

function extractIosInfo(data: any): MvtDeviceInfo {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const d: any = data;
  const serial = typeof d.SerialNumber === "string" ? d.SerialNumber : undefined;
  return {
    brand: "Apple",
    manufacturer: "Apple",
    model: d.ProductType || d.HardwareModel,
    deviceName: d.DeviceName,
    osVersion: d.ProductVersion,
    buildId: d.BuildVersion,
    regionInfo: d.RegionInfo,
    locale: d.Locale,
    timezone: d.TimeZone,
    carrier: d.CarrierName || d.SIMOperatorName,
    serialLast4: serial && serial.length >= 4 ? serial.slice(-4) : undefined,
  };
}

function cleanDeviceInfo(info: MvtDeviceInfo): MvtDeviceInfo | undefined {
  const out: MvtDeviceInfo = {};
  for (const [k, v] of Object.entries(info)) {
    if (typeof v === "string" && v.trim()) (out as any)[k] = v.trim();
    else if (typeof v === "boolean") (out as any)[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function parseMvtFiles(files: File[], sourceName: string): Promise<MvtParsedResult> {
  const entries = await readFileEntries(files);
  const moduleMap = new Map<string, MvtModuleResult>();
  const detections: MvtDetection[] = [];
  const timeline: MvtParsedResult["timeline"] = [];

  let deviceInfo: MvtDeviceInfo | undefined;

  for (const { name, text } of entries) {
    const meta = parseFileName(name);
    if (!meta) continue;

    let data: any;
    let countOverride: number | null = null;
    if (meta.ext === "json") {
      try { data = JSON.parse(text); } catch { continue; }
    } else {
      // Plain text artefact (AndroidQF dumps getprop/services/processes as .txt).
      // We don't try to model rows — only use it for device info and an entry count.
      if (meta.key === "getprop") {
        data = parseGetpropText(text);
      } else {
        data = null;
      }
      countOverride = text.split(/\r?\n/).filter((l) => l.trim()).length;
    }

    const info = lookupModule(meta.key);
    const existing = moduleMap.get(meta.key) || {
      key: meta.key,
      label: info?.label || meta.key,
      fileName: name,
      entries: 0,
      detected: 0,
      description: info?.description || "Módulo MVT.",
    };

    const count = countOverride ?? countEntries(data);
    if (meta.isDetected) {
      existing.detected += count;
      const items: any[] = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
      for (const it of items.slice(0, 200)) {
        const ts = pickTimestamp(it);
        const summary = summarize(it);
        const level = pickLevel(it, "high");
        detections.push({ module: meta.key, timestamp: ts, summary, level, raw: it });
        if (ts) timeline.push({ timestamp: ts, module: existing.label, summary, severity: level });
      }
    } else {
      existing.entries += count;
      if (!deviceInfo) {
        if (meta.key === "getprop") deviceInfo = cleanDeviceInfo(extractAndroidGetprop(data));
        else if (meta.key === "info") deviceInfo = cleanDeviceInfo(extractIosInfo(data));
      }
    }
    moduleMap.set(meta.key, existing);
  }

  const modules = Array.from(moduleMap.values()).sort((a, b) => b.detected - a.detected || b.entries - a.entries);
  const totalEntries = modules.reduce((s, m) => s + m.entries, 0);
  const totalDetections = modules.reduce((s, m) => s + m.detected, 0);
  const platform = detectPlatform(modules.map((m) => m.key));

  let risk: RiskLevel = "low";
  if (totalDetections >= 10) risk = "critical";
  else if (totalDetections >= 3) risk = "high";
  else if (totalDetections >= 1) risk = "medium";
  else if (totalEntries === 0) risk = "low";

  timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    platform,
    totalEntries,
    totalDetections,
    modules,
    detections,
    timeline: timeline.slice(0, 200),
    risk,
    parsedAt: new Date().toISOString(),
    sourceName,
    deviceInfo,
  };
}
