import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAnalysis, deleteAnalysis, riskColor, riskLabel, platformLabel, Analysis } from "@/lib/mock-store";
import { ShieldAlert, ShieldCheck, Layers, AlertOctagon, Database, Download, Trash2, Activity, User, Code2 } from "lucide-react";
import { generatePdfReport } from "@/lib/pdf-report";
import { detectionKey, classifyDetection, humanizeDetection, humanizeModule, severityLabel, CATEGORY_LABEL, CATEGORY_DESC, type Category } from "@/lib/mvt-translate";
import type { MvtDetection, RiskLevel } from "@/lib/mvt-parser";

export const Route = createFileRoute("/analysis/$id")({
  head: () => ({ meta: [{ title: "Resultado de análisis — Spyware Forensic Analyzer" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SmallStat icon={Layers} label="Módulos" value={r.modules.length} />
          <SmallStat icon={Database} label="Entradas" value={r.totalEntries} />
          <SmallStat icon={AlertOctagon} label="Detecciones" value={r.totalDetections} />
          <SmallStat icon={ShieldCheck} label="Plataforma" value={r.platform.toUpperCase()} />
        </div>

        <h2 className="text-lg font-semibold mt-10 mb-4">Módulos MVT analizados</h2>
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

        <h2 className="text-lg font-semibold mt-10 mb-4">Indicadores detectados</h2>
        {r.detections.length === 0 ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-sm text-success-foreground">
            <ShieldCheck className="h-5 w-5 inline-block text-success mr-2" />
            MVT no encontró coincidencias con indicadores conocidos en los archivos subidos.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {r.detections.slice(0, 100).map((d, i) => (
              <div key={i} className="p-4 border-b border-border last:border-0 flex items-start gap-4">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0">
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{d.module}</span>
                    {d.timestamp && <span className="text-xs text-muted-foreground">{d.timestamp}</span>}
                  </div>
                  <div className="font-mono text-sm mt-1 break-all">{d.summary}</div>
                </div>
              </div>
            ))}
            {r.detections.length > 100 && (
              <div className="p-3 text-xs text-muted-foreground text-center border-t border-border">
                Mostrando 100 de {r.detections.length}. Descarga el PDF para más detalle.
              </div>
            )}
          </div>
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
