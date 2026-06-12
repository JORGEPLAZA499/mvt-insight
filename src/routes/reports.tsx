import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Analysis, riskColor, riskLabel } from "@/lib/mock-store";
import { listMyAnalyses, deleteAnalysis } from "@/lib/analyses.functions";
import { mapServerAnalysis, type ServerAnalysisRow } from "@/lib/server-analyses";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2 } from "lucide-react";
import { generatePdfReport } from "@/lib/pdf-report";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Informes — Spyware Forensic Analyzer" }] }),
  component: Reports,
});

function Reports() {
  const [items, setItems] = useState<Analysis[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchAnalyses = useServerFn(listMyAnalyses);
  const removeAnalysis = useServerFn(deleteAnalysis);

  useEffect(() => {
    let alive = true;
    fetchAnalyses()
      .then((r) => {
        if (!alive) return;
        const mapped = ((r?.analyses ?? []) as ServerAnalysisRow[]).map(mapServerAnalysis);
        setItems(mapped.filter((a) => a.status === "completed"));
      })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [fetchAnalyses]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeAnalysis({ data: { id } });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("Informe eliminado");
    } catch (e) {
      toast.error("No se pudo eliminar el informe", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  };

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
                  <span className="text-muted-foreground">{a.result?.totalDetections ?? 0} detecciones</span>
                  <span className={`font-semibold ${riskColor(a.result?.risk)}`}>{riskLabel(a.result?.risk)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/analysis/$id" params={{ id: a.id }}>Ver</Link>
                  </Button>
                  <Button size="sm" className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" onClick={() => generatePdfReport(a)}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Eliminar informe"
                        disabled={deletingId === a.id}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar este informe?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará permanentemente el análisis de <span className="font-medium">{a.fileName}</span>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(a.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
