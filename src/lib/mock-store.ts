// Simple mock store using localStorage. Replace with real backend later.
export type AnalysisStatus = "pending" | "processing" | "completed" | "error";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Indicator {
  id: string;
  type: "domain" | "process" | "file" | "event" | "ioc";
  value: string;
  source: string;
  timestamp: string;
  severity: RiskLevel;
  description: string;
}

export interface Analysis {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: AnalysisStatus;
  progress: number;
  device?: string;
  risk?: RiskLevel;
  matches?: number;
  indicators?: Indicator[];
}

const KEY = "sfa.analyses.v1";
const SESSION_KEY = "sfa.session.v1";

export function getAnalyses(): Analysis[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveAnalyses(items: Analysis[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function getAnalysis(id: string): Analysis | undefined {
  return getAnalyses().find((a) => a.id === id);
}
export function upsertAnalysis(a: Analysis) {
  const items = getAnalyses();
  const idx = items.findIndex((x) => x.id === a.id);
  if (idx >= 0) items[idx] = a; else items.unshift(a);
  saveAnalyses(items);
}
export function deleteAnalysis(id: string) {
  saveAnalyses(getAnalyses().filter((a) => a.id !== id));
}

export function getSession(): { email: string } | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
export function setSession(s: { email: string } | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

// Mock analysis result generator
export function generateMockResult(): Pick<Analysis, "risk" | "matches" | "indicators" | "device"> {
  const seed = Math.random();
  const risk: RiskLevel = seed > 0.8 ? "critical" : seed > 0.55 ? "high" : seed > 0.25 ? "medium" : "low";
  const sampleIndicators: Indicator[] = [
    { id: "i1", type: "domain", value: "api.suspicious-c2[.]net", source: "stix2/pegasus.json", timestamp: "2025-04-12T08:34:00Z", severity: "high", description: "Conexión saliente a dominio incluido en lista de comando y control." },
    { id: "i2", type: "process", value: "com.apple.WebKit.GPU", source: "processes.json", timestamp: "2025-04-12T08:36:11Z", severity: "medium", description: "Proceso atípico con uso elevado de memoria fuera de horario habitual." },
    { id: "i3", type: "file", value: "/private/var/folders/.tmp/.cache-9f2a", source: "filesystem.json", timestamp: "2025-04-12T08:40:02Z", severity: "high", description: "Archivo oculto creado por proceso sin firma." },
    { id: "i4", type: "event", value: "iMessage attachment auto-rendered", source: "shutdown.log", timestamp: "2025-04-12T08:33:55Z", severity: "critical", description: "Patrón compatible con cadena de explotación zero-click." },
    { id: "i5", type: "ioc", value: "SHA256: 9a3f...c2", source: "iocs/amnesty.stix2", timestamp: "2025-04-12T08:41:00Z", severity: "medium", description: "Hash coincide con muestra documentada por investigadores." },
  ];
  const count = risk === "low" ? 1 : risk === "medium" ? 3 : risk === "high" ? 4 : 5;
  return {
    risk,
    matches: count,
    device: "iPhone 14 Pro · iOS 17.4.1",
    indicators: sampleIndicators.slice(0, count),
  };
}

export function riskColor(r?: RiskLevel) {
  switch (r) {
    case "critical": return "text-destructive";
    case "high": return "text-destructive";
    case "medium": return "text-warning";
    case "low": return "text-success";
    default: return "text-muted-foreground";
  }
}
export function riskLabel(r?: RiskLevel) {
  return r === "critical" ? "Crítico" : r === "high" ? "Alto" : r === "medium" ? "Medio" : r === "low" ? "Bajo" : "—";
}
