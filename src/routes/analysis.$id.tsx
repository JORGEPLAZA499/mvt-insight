import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getAnalysis, upsertAnalysis, generateMockResult, riskColor, riskLabel, Analysis, Indicator } from "@/lib/mock-store";
import { ShieldAlert, ShieldCheck, Globe, Cpu, FileText, Calendar, Activity, Download, Trash2 } from "lucide-react";
import { deleteAnalysis } from "@/lib/mock-store";
import { useNavigate } from "@tanstack/react-router";
import { generatePdfReport } from "@/lib/pdf-report";

export const Route = createFileRoute("/analysis/$id")({
  head: () => ({ meta: [{ title: "Resultado de análisis — Spyware Forensic Analyzer" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = useParams({ from: "/analysis/$id" });
  const [analysis, setAnalysis] = useState<Analysis | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    const a = getAnalysis(id);
    if (!a) return;
    setAnalysis(a);
    if (a.status === "completed") return;

    // Simulate processing
    let progress = a.progress || 0;
    const updated = { ...a, status: "processing" as const, progress };
    upsertAnalysis(updated);
    setAnalysis(updated);

    const t = setInterval(() => {
      progress += Math.random() * 14 + 6;
      if (progress >= 100) {
        const result = generateMockResult();
        const done: Analysis = { ...updated, ...result, status: "completed", progress: 100 };
        upsertAnalysis(done);
        setAnalysis(done);
        clearInterval(t);
      } else {
        const next = { ...updated, progress };
        upsertAnalysis(next);
        setAnalysis(next);
      }
    }, 600);
    return () => clearInterval(t);
  }, [id]);

  if (!analysis) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Análisis no encontrado.</div>
      </AppShell>
    );
  }

  if (analysis.status !== "completed") {
    return (
      <AppShell>
        <div className="p-6 md:p-10 max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold tracking-tight">Procesando análisis</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">{analysis.fileName}</p>

          <div className="mt-10 rounded-xl border border-border bg-card p-8">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-30 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-gradient-primary grid place-items-center shadow-glow">
                  <Activity className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Ejecutando MVT y correlacionando IOC…</div>
                <div className="text-xs text-muted-foreground mt-1">Esto puede tardar unos minutos en producción.</div>
              </div>
            </div>
            <Progress value={analysis.progress} className="mt-6" />
            <div className="mt-2 text-xs text-muted-foreground text-right">{Math.round(analysis.progress)}%</div>

            <ul className="mt-8 space-y-2 text-sm">
              {[
                { p: 10, label: "Validando integridad del archivo" },
                { p: 30, label: "Extrayendo artefactos" },
                { p: 55, label: "Ejecutando reglas MVT" },
                { p: 80, label: "Correlacionando con feeds STIX2/IOC" },
                { p: 100, label: "Generando informe" },
              ].map((s, i) => (
                <li key={i} className={`flex items-center gap-2 ${analysis.progress >= s.p ? "text-foreground" : "text-muted-foreground/50"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${analysis.progress >= s.p ? "bg-primary" : "bg-muted-foreground/40"}`} />
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Resultado de análisis</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1 truncate max-w-2xl">{analysis.fileName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{analysis.device} · {new Date(analysis.uploadedAt).toLocaleString()}</p>
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

        {/* Risk banner */}
        <div className={`rounded-xl border p-6 ${
          analysis.risk === "low" ? "border-success/40 bg-success/5" :
          analysis.risk === "medium" ? "border-warning/40 bg-warning/5" :
          "border-destructive/40 bg-destructive/5"
        }`}>
          <div className="flex items-center gap-4">
            {analysis.risk === "low" ? <ShieldCheck className="h-10 w-10 text-success" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Nivel de riesgo estimado</div>
              <div className={`text-2xl font-semibold ${riskColor(analysis.risk)}`}>{riskLabel(analysis.risk)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Se detectaron <strong className="text-foreground">{analysis.matches}</strong> coincidencia(s) con indicadores conocidos. Revisa la evidencia y considera consultar con un especialista.
              </p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SmallStat icon={Globe} label="Dominios" value={analysis.indicators?.filter(i => i.type === "domain").length || 0} />
          <SmallStat icon={Cpu} label="Procesos" value={analysis.indicators?.filter(i => i.type === "process").length || 0} />
          <SmallStat icon={FileText} label="Archivos" value={analysis.indicators?.filter(i => i.type === "file").length || 0} />
          <SmallStat icon={Calendar} label="Eventos" value={analysis.indicators?.filter(i => i.type === "event" || i.type === "ioc").length || 0} />
        </div>

        {/* Indicators */}
        <h2 className="text-lg font-semibold mt-10 mb-4">Indicadores detectados</h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {analysis.indicators?.map((ind, i) => (
            <IndicatorRow key={ind.id} ind={ind} first={i === 0} />
          ))}
        </div>

        {/* Timeline */}
        <h2 className="text-lg font-semibold mt-10 mb-4">Línea de tiempo</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <ol className="relative border-l border-border ml-3 space-y-6">
            {analysis.indicators?.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((ind) => (
              <li key={ind.id} className="ml-6">
                <span className={`absolute -left-[7px] h-3 w-3 rounded-full ${
                  ind.severity === "critical" || ind.severity === "high" ? "bg-destructive" : ind.severity === "medium" ? "bg-warning" : "bg-success"
                }`} />
                <div className="text-xs text-muted-foreground">{new Date(ind.timestamp).toLocaleString()}</div>
                <div className="text-sm font-medium mt-0.5">{ind.value}</div>
                <div className="text-xs text-muted-foreground">{ind.description}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">← Volver al dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}

function SmallStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
        {label} <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

function IndicatorRow({ ind, first }: { ind: Indicator; first: boolean }) {
  const sevColor = ind.severity === "critical" || ind.severity === "high" ? "text-destructive" : ind.severity === "medium" ? "text-warning" : "text-success";
  const iconMap = { domain: Globe, process: Cpu, file: FileText, event: Calendar, ioc: ShieldAlert };
  const Icon = iconMap[ind.type];
  return (
    <div className={`p-4 flex items-start gap-4 ${first ? "" : "border-t border-border"}`}>
      <div className="h-9 w-9 rounded-lg bg-secondary grid place-items-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{ind.type}</span>
          <span className={`text-xs font-semibold ${sevColor}`}>{riskLabel(ind.severity)}</span>
        </div>
        <div className="font-mono text-sm mt-1 break-all">{ind.value}</div>
        <div className="text-xs text-muted-foreground mt-1">{ind.description}</div>
        <div className="text-[11px] text-muted-foreground mt-1">Origen: {ind.source} · {new Date(ind.timestamp).toLocaleString()}</div>
      </div>
    </div>
  );
}
