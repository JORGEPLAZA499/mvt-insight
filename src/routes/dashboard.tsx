import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { getAnalyses, Analysis, riskColor, riskLabel } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, UploadCloud, Activity, FileSearch } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Spyware Forensic Analyzer" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [items, setItems] = useState<Analysis[]>([]);
  useEffect(() => { setItems(getAnalyses()); }, []);

  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const highRisk = items.filter((i) => i.risk === "high" || i.risk === "critical").length;
  const matches = items.reduce((acc, i) => acc + (i.matches || 0), 0);

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Resumen general de tus análisis forenses.</p>
          </div>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/upload"><UploadCloud className="h-4 w-4 mr-2" /> Nuevo análisis</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon={Activity} label="Análisis totales" value={total.toString()} />
          <Metric icon={ShieldCheck} label="Completados" value={completed.toString()} tone="success" />
          <Metric icon={ShieldAlert} label="Riesgo alto/crítico" value={highRisk.toString()} tone="destructive" />
          <Metric icon={FileSearch} label="Coincidencias totales" value={matches.toString()} />
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Análisis recientes</h2>
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Archivo</th>
                    <th className="text-left px-4 py-3 font-medium">Dispositivo</th>
                    <th className="text-left px-4 py-3 font-medium">Estado</th>
                    <th className="text-left px-4 py-3 font-medium">Riesgo</th>
                    <th className="text-left px-4 py-3 font-medium">Coincidencias</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.slice(0, 8).map((a) => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium truncate max-w-[260px]">{a.fileName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.device || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className={`px-4 py-3 font-semibold ${riskColor(a.risk)}`}>{riskLabel(a.risk)}</td>
                      <td className="px-4 py-3">{a.matches ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/analysis/$id" params={{ id: a.id }}>Ver</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "success" | "destructive" }) {
  const color = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
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
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map.c}`}>{map.l}</span>;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-lg bg-secondary grid place-items-center mb-4">
        <UploadCloud className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold">Sin análisis todavía</h3>
      <p className="text-sm text-muted-foreground mt-1">Sube tu primer artefacto MVT para empezar.</p>
      <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
        <Link to="/upload">Subir archivos</Link>
      </Button>
    </div>
  );
}
