import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getAnalyses, Analysis, riskColor, riskLabel } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Activity,
  FileSearch,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { GaugeClock } from "@/components/gauge-clock";
import { MiniGauge } from "@/components/mini-gauge";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Spyware Forensic Analyzer" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [items, setItems] = useState<Analysis[]>([]);
  useEffect(() => {
    setItems(getAnalyses());
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const pending = items.filter((i) => i.status === "pending").length;
    const processing = items.filter((i) => i.status === "processing").length;
    const errored = items.filter((i) => i.status === "error").length;
    const highRisk = items.filter(
      (i) => i.result?.risk === "high" || i.result?.risk === "critical",
    ).length;
    const matches = items.reduce((acc, i) => acc + (i.result?.totalDetections || 0), 0);

    // Aggregate threat score 0..100
    const weights: Record<string, number> = { low: 10, medium: 40, high: 75, critical: 95 };
    const completedItems = items.filter((i) => i.result?.risk);
    const threatScore =
      completedItems.length > 0
        ? completedItems.reduce((s, i) => s + (weights[i.result!.risk] ?? 10), 0) /
          completedItems.length
        : 0;

    const tone: "low" | "medium" | "high" | "critical" =
      threatScore >= 85 ? "critical" : threatScore >= 60 ? "high" : threatScore >= 30 ? "medium" : "low";

    return { total, completed, pending, processing, errored, highRisk, matches, threatScore, tone };
  }, [items]);

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-primary/80 mb-2">
              Forensic Command Center
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Resumen general de tus análisis forenses.
            </p>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/upload">
              <UploadCloud className="h-4 w-4 mr-2" /> Nuevo análisis
            </Link>
          </Button>
        </div>

        {/* Hero: gauge + mini gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2">
            <GaugeClock
              value={stats.threatScore}
              label="Nivel de amenaza global"
              sublabel={`${stats.completed} análisis evaluados`}
              tone={stats.tone}
            />
          </div>
          <div className="flex flex-col gap-4 h-full">
            <MiniGauge
              value={stats.total}
              max={Math.max(stats.total, 10)}
              label="Análisis totales"
              icon={Activity}
              tone="primary"
            />
            <MiniGauge
              value={stats.completed}
              max={Math.max(stats.total, 1)}
              label="Completados"
              icon={ShieldCheck}
              tone="success"
            />
            <MiniGauge
              value={stats.matches}
              max={Math.max(stats.matches, 20)}
              label="Coincidencias IOC"
              icon={FileSearch}
              tone="warning"
            />
          </div>
        </div>

        {/* HUD strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 animate-fade-in">
          <HudPill icon={Clock} label="Pendientes" value={stats.pending} color="var(--muted-foreground)" />
          <HudPill icon={Loader2} label="Procesando" value={stats.processing} color="var(--primary)" spin />
          <HudPill icon={CheckCircle2} label="Completados" value={stats.completed} color="var(--success)" />
          <HudPill icon={AlertCircle} label="Riesgo alto" value={stats.highRisk} color="var(--destructive)" />
        </div>

        {/* Recent analyses */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Análisis recientes</h2>
            <Link to="/history" className="text-xs text-primary hover:underline">
              Ver historial completo →
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Archivo</th>
                    <th className="text-left px-4 py-3 font-medium">Plataforma</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-left px-4 py-3 font-medium">Riesgo</th>
                    <th className="text-left px-4 py-3 font-medium">Detecciones</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 8).map((a) => {
                    const intensity = Math.min(100, (a.result?.totalDetections || 0) * 10);
                    const riskBorder =
                      a.result?.risk === "critical" || a.result?.risk === "high"
                        ? "var(--destructive)"
                        : a.result?.risk === "medium"
                          ? "var(--warning)"
                          : a.result?.risk === "low"
                            ? "var(--success)"
                            : "var(--border)";
                    return (
                      <tr
                        key={a.id}
                        className="border-t border-border hover:bg-muted/20 transition-colors"
                        style={{ boxShadow: `inset 3px 0 0 ${riskBorder}` }}
                      >
                        <td className="px-4 py-3 font-medium truncate max-w-[260px]">{a.fileName}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {a.result?.platform?.toUpperCase() || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                        </td>
                        <td className={`px-4 py-3 font-semibold ${riskColor(a.result?.risk)}`}>
                          {riskLabel(a.result?.risk)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums">{a.result?.totalDetections ?? "—"}</span>
                            {a.result && (
                              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${intensity}%`,
                                    backgroundColor: riskBorder,
                                    boxShadow: `0 0 8px ${riskBorder}`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link to="/analysis/$id" params={{ id: a.id }}>
                              Ver
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function HudPill({
  icon: Icon,
  label,
  value,
  color,
  spin,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  spin?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-card group hover:border-primary/40 transition-colors"
      style={{ boxShadow: `inset 0 0 0 1px transparent, 0 0 0 transparent` }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}`, animation: "pulse 2s infinite" }}
          />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
        </div>
        <Icon className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} style={{ color }} />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Analysis["status"] }) {
  const map = {
    pending: { c: "bg-muted text-muted-foreground", l: "Pendiente" },
    processing: { c: "bg-primary/15 text-primary", l: "Procesando" },
    completed: { c: "bg-success/15 text-success", l: "Completado" },
    error: { c: "bg-destructive/15 text-destructive", l: "Error" },
  }[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map.c}`}>
      {map.l}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-lg bg-secondary grid place-items-center mb-4">
        <UploadCloud className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold">Sin análisis todavía</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Sube tu primer artefacto MVT para empezar.
      </p>
      <Button
        asChild
        className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
      >
        <Link to="/upload">Subir archivos</Link>
      </Button>
    </div>
  );
}
