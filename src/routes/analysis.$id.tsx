import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAnalysis, deleteAnalysis, riskColor, riskLabel, platformLabel, Analysis } from "@/lib/mock-store";
import { ShieldAlert, ShieldCheck, Layers, AlertOctagon, Database, Download, Trash2, Activity, User, Code2, ChevronDown, ChevronRight } from "lucide-react";
import { generatePdfReport } from "@/lib/pdf-report";
import { detectionKey, classifyDetection, humanizeDetection, humanizeModule, severityLabel, explainSeverity, buildVerdict, nextSteps, buildModuleHighlights, CROSS_CHECK_STEPS, CATEGORY_LABEL, CATEGORY_DESC, type Category } from "@/lib/mvt-translate";
import type { MvtDetection, RiskLevel } from "@/lib/mvt-parser";

export const Route = createFileRoute("/analysis/$id")({
  head: () => ({ meta: [{ title: "Resultado de análisis — Spyware Forensic Analyzer" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/analysis/$id" });
  const [analysis, setAnalysis] = useState<Analysis | undefined>();
  const navigate = useNavigate();

  useEffect(() => { setAnalysis(getAnalysis(id)); }, [id]);

  if (!analysis) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Análisis no encontrado.</div>
      </AppShell>
    );
  }

  if (analysis.status === "processing") {
    return (
      <AppShell>
        <div className="p-10 max-w-2xl mx-auto text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-gradient-primary grid place-items-center shadow-glow animate-pulse">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold mt-4">Procesando archivos MVT…</h1>
          <p className="text-sm text-muted-foreground mt-2">Esto ocurre en tu navegador y suele tardar unos segundos.</p>
        </div>
      </AppShell>
    );
  }

  if (analysis.status === "error" || !analysis.result) {
    return (
      <AppShell>
        <div className="p-10 max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold">Error procesando archivos</h1>
          <p className="text-sm text-muted-foreground mt-2">{analysis.error || "Los archivos no parecen resultados válidos de MVT."}</p>
          <Link to="/upload" className="text-primary hover:underline text-sm mt-4 inline-block">← Subir otros archivos</Link>
        </div>
      </AppShell>
    );
  }

  const r = analysis.result;

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Resultado de análisis</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1 truncate max-w-2xl">{analysis.fileName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{platformLabel(r.platform)} · {new Date(analysis.uploadedAt).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { deleteAnalysis(analysis.id); navigate({ to: "/dashboard" }); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
            <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" onClick={() => generatePdfReport(analysis)}>
              <Download className="h-4 w-4 mr-2" /> Descargar PDF
            </Button>
          </div>
        </div>

        <div className={`rounded-xl border p-6 ${
          r.risk === "low" ? "border-success/40 bg-success/5" :
          r.risk === "medium" ? "border-warning/40 bg-warning/5" :
          "border-destructive/40 bg-destructive/5"
        }`}>
          <div className="flex items-center gap-4">
            {r.risk === "low" ? <ShieldCheck className="h-10 w-10 text-success" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Nivel de riesgo estimado</div>
              <div className={`text-2xl font-semibold ${riskColor(r.risk)}`}>{riskLabel(r.risk)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                MVT generó <strong className="text-foreground">{r.totalDetections}</strong> detección(es) sobre <strong className="text-foreground">{r.modules.length}</strong> módulo(s) analizado(s).
                {r.totalDetections === 0 && " No se encontraron coincidencias con indicadores conocidos."}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="user" className="w-full mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="user"><User className="h-4 w-4 mr-2" /> {t("analysis.tabs.user")}</TabsTrigger>
            <TabsTrigger value="dev"><Code2 className="h-4 w-4 mr-2" /> {t("analysis.tabs.dev")}</TabsTrigger>
          </TabsList>

          {/* ---------- Pestaña usuario no experto ---------- */}
          <TabsContent value="user" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SmallStat icon={Layers} label="Módulos" value={r.modules.length} />
              <SmallStat icon={Database} label="Entradas" value={r.totalEntries} />
              <SmallStat icon={AlertOctagon} label="Detecciones" value={r.totalDetections} />
              <SmallStat icon={ShieldCheck} label="Plataforma" value={r.platform.toUpperCase()} />
            </div>

            <h2 className="text-lg font-semibold mt-10 mb-4">Indicadores detectados</h2>
            {r.detections.length === 0 ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-sm text-success-foreground">
                <ShieldCheck className="h-5 w-5 inline-block text-success mr-2" />
                MVT no encontró coincidencias con indicadores conocidos en los archivos subidos.
              </div>
            ) : (
              <UserDetections detections={r.detections} />
            )}
          </TabsContent>

          {/* ---------- Pestaña modo desarrollador ---------- */}
          <TabsContent value="dev" className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Módulos MVT analizados</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <div className="col-span-6">Módulo</div>
                <div className="col-span-3 text-right">Entradas</div>
                <div className="col-span-3 text-right">Detecciones</div>
              </div>
              {r.modules.map((m) => (
                <div key={m.key} className="grid grid-cols-12 px-4 py-3 border-b border-border last:border-0 text-sm items-center">
                  <div className="col-span-6 min-w-0">
                    <div className="font-medium truncate">{m.label}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{m.key}</div>
                  </div>
                  <div className="col-span-3 text-right tabular-nums">{m.entries}</div>
                  <div className={`col-span-3 text-right tabular-nums font-semibold ${m.detected > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {m.detected}
                  </div>
                </div>
              ))}
              {r.modules.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">No se reconocieron módulos MVT en los archivos subidos.</div>
              )}
            </div>

            <h2 className="text-lg font-semibold mt-10 mb-4">Detecciones crudas</h2>
            {r.detections.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground text-center">
                Sin detecciones registradas.
              </div>
            ) : (
              <DevDetections detections={r.detections} />
            )}

            {r.timeline.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mt-10 mb-4">Línea de tiempo ({r.timeline.length} eventos)</h2>
                <div className="rounded-xl border border-border bg-card p-6">
                  <ol className="relative border-l border-border ml-3 space-y-4">
                    {r.timeline.slice(0, 30).map((e, i) => (
                      <li key={i} className="ml-6 relative">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-destructive" />
                        <div className="text-xs text-muted-foreground">{e.timestamp}</div>
                        <div className="text-sm font-medium mt-0.5">{e.module}</div>
                        <div className="text-xs text-muted-foreground font-mono break-all">{e.summary}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>


        <div className="mt-8 text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">← Volver al dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}

function SmallStat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
        {label} <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
    </div>
  );
}

// ---------- Agrupado por entidad (deduplicación) ----------

const LEVEL_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const CATEGORY_ORDER: Category[] = ["mercenary", "stalkerware", "suspicious"];

type Group = {
  key: string;
  label: string;
  category: Category;
  level: RiskLevel;
  count: number;
  modules: Map<string, number>;
  sample: MvtDetection;
  firstSeen?: string;
  lastSeen?: string;
};

function buildGroups(detections: MvtDetection[]): Record<Category, Group[]> {
  const buckets: Record<Category, Map<string, Group>> = {
    mercenary: new Map(), stalkerware: new Map(), suspicious: new Map(),
  };
  for (const d of detections) {
    const cat = classifyDetection(d);
    const { key, label } = detectionKey(d);
    const bucket = buckets[cat];
    let g = bucket.get(key);
    if (!g) {
      g = { key, label, category: cat, level: d.level ?? "low", count: 0, modules: new Map(), sample: d };
      bucket.set(key, g);
    }
    g.count += 1;
    g.modules.set(d.module, (g.modules.get(d.module) ?? 0) + 1);
    const dLevel: RiskLevel = d.level ?? "low";
    if ((LEVEL_RANK[dLevel] ?? 0) > (LEVEL_RANK[g.level] ?? 0)) {
      g.level = dLevel;
      g.sample = d;
    }
    if (d.timestamp) {
      if (!g.firstSeen || d.timestamp < g.firstSeen) g.firstSeen = d.timestamp;
      if (!g.lastSeen || d.timestamp > g.lastSeen) g.lastSeen = d.timestamp;
    }
  }
  return {
    mercenary: [...buckets.mercenary.values()].sort((a, b) => b.count - a.count),
    stalkerware: [...buckets.stalkerware.values()].sort((a, b) => b.count - a.count),
    suspicious: [...buckets.suspicious.values()].sort((a, b) => b.count - a.count),
  };
}

function severityClasses(level: RiskLevel | undefined): string {
  switch (level) {
    case "critical": return "bg-destructive/15 text-destructive border-destructive/30";
    case "high": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/15 text-warning border-warning/30";
    case "low": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function UserDetections({ detections }: { detections: MvtDetection[] }) {
  const groups = useMemo(() => buildGroups(detections), [detections]);
  const uniqueTotal = groups.mercenary.length + groups.stalkerware.length + groups.suspicious.length;

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-3">
        {uniqueTotal} entidad(es) única(s) agrupadas a partir de {detections.length} indicio(s) técnico(s).
      </div>
      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const list = groups[cat];
          if (list.length === 0) return null;
          const totalOccur = list.reduce((s, g) => s + g.count, 0);
          return (
            <div key={cat}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-semibold">{CATEGORY_LABEL[cat]}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {list.length} entidad(es) · {totalOccur} ocurrencias
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{CATEGORY_DESC[cat]}</p>
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {list.map((g, i) => (
                  <div key={g.key} className="p-4 flex items-start gap-4">
                    <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0 tabular-nums text-xs font-semibold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{g.label}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityClasses(g.level)}`}>
                          {severityLabel(g.level)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">· {g.count}×</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Detectado en:{" "}
                        {[...g.modules.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 4)
                          .map(([m, c]) => `${humanizeModule(m)} (${c})`)
                          .join(" · ")}
                        {g.modules.size > 4 && ` · +${g.modules.size - 4} más`}
                      </div>
                      <div className="text-sm mt-1.5">{humanizeDetection(g.sample.summary)}</div>
                      {(g.firstSeen || g.lastSeen) && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {g.firstSeen && <>1ª vez: <span className="font-mono">{g.firstSeen}</span></>}
                          {g.firstSeen && g.lastSeen && g.firstSeen !== g.lastSeen && " · "}
                          {g.lastSeen && g.firstSeen !== g.lastSeen && <>última: <span className="font-mono">{g.lastSeen}</span></>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DevDetections({ detections }: { detections: MvtDetection[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-3">
        Salida cruda de MVT — un registro por cada indicio detectado ({detections.length} en total).
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {detections.slice(0, 200).map((d, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0 flex items-start gap-4">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{d.module}</span>
                {d.level && (
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityClasses(d.level)}`}>
                    {severityLabel(d.level)}
                  </span>
                )}
                {d.timestamp && <span className="text-xs text-muted-foreground font-mono">{d.timestamp}</span>}
              </div>
              <div className="font-mono text-xs mt-1 break-all whitespace-pre-wrap">{d.summary}</div>
            </div>
          </div>
        ))}
        {detections.length > 200 && (
          <div className="p-3 text-xs text-muted-foreground text-center border-t border-border">
            Mostrando 200 de {detections.length}. Descarga el PDF para el listado completo.
          </div>
        )}
      </div>
    </div>
  );
}

