import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Analysis, getAnalyses, riskColor, riskLabel } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { generatePdfReport } from "@/lib/pdf-report";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Informes — Spyware Forensic Analyzer" }] }),
  component: Reports,
});

function Reports() {
  const [items, setItems] = useState<Analysis[]>([]);
  useEffect(() => { setItems(getAnalyses().filter((a) => a.status === "completed")); }, []);

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Informes</h1>
        <p className="text-sm text-muted-foreground mt-1">Descarga el informe PDF de cada análisis completado.</p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Aún no hay informes disponibles.
          </div>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary grid place-items-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.fileName}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.uploadedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{a.matches} coincidencias</span>
                  <span className={`font-semibold ${riskColor(a.risk)}`}>{riskLabel(a.risk)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/analysis/$id" params={{ id: a.id }}>Ver</Link>
                  </Button>
                  <Button size="sm" className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" onClick={() => generatePdfReport(a)}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
