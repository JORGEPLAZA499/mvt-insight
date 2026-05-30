// Almacén simple en localStorage. Guarda análisis MVT reales parseados en cliente.
import type { MvtParsedResult, RiskLevel } from "./mvt-parser";

export type AnalysisStatus = "pending" | "processing" | "completed" | "error";
export type { RiskLevel };

export interface Analysis {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: AnalysisStatus;
  progress: number;
  result?: MvtParsedResult;
  error?: string;
}

const KEY = "sfa.analyses.v2";
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
export function platformLabel(p?: string) {
  return p === "ios" ? "iOS (mvt-ios)" : p === "android" ? "Android (mvt-android)" : "Desconocida";
}
