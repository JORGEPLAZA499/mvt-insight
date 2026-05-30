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
}

// Strip path & .json, return { key, isDetected }
function parseFileName(name: string): { key: string; isDetected: boolean } | null {
  const base = name.split("/").pop() || name;
  if (!base.toLowerCase().endsWith(".json")) return null;
  let key = base.slice(0, -5);
  let isDetected = false;
  if (key.endsWith("_detected")) {
    isDetected = true;
    key = key.slice(0, -"_detected".length);
  }
  return { key, isDetected };
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

async function readFileEntries(files: File[]): Promise<{ name: string; text: string }[]> {
  const out: { name: string; text: string }[] = [];
  for (const f of files) {
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".zip")) {
      const buf = await f.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const tasks: Promise<void>[] = [];
      zip.forEach((path, entry) => {
        if (entry.dir) return;
        if (!path.toLowerCase().endsWith(".json")) return;
        tasks.push(entry.async("string").then((text) => { out.push({ name: path, text }); }));
      });
      await Promise.all(tasks);
    } else if (lower.endsWith(".json")) {
      const text = await f.text();
      out.push({ name: f.name, text });
    }
  }
  return out;
}

export async function parseMvtFiles(files: File[], sourceName: string): Promise<MvtParsedResult> {
  const entries = await readFileEntries(files);
  const moduleMap = new Map<string, MvtModuleResult>();
  const detections: MvtDetection[] = [];
  const timeline: MvtParsedResult["timeline"] = [];

  for (const { name, text } of entries) {
    const meta = parseFileName(name);
    if (!meta) continue;
    let data: any;
    try { data = JSON.parse(text); } catch { continue; }

    const info = lookupModule(meta.key);
    const existing = moduleMap.get(meta.key) || {
      key: meta.key,
      label: info?.label || meta.key,
      fileName: name,
      entries: 0,
      detected: 0,
      description: info?.description || "Módulo MVT.",
    };

    const count = countEntries(data);
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
  };
}
