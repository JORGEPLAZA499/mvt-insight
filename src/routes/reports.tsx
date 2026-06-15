import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Analysis, riskColor, riskLabel } from "@/lib/mock-store";
import { listMyAnalyses, deleteAnalysis } from "@/lib/analyses.functions";
import { mapServerAnalysis, type ServerAnalysisRow } from "@/lib/server-analyses";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import i18n from "@/i18n";
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
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return { meta: [{ title: t("reports.metaTitle") }] };
  },
  component: Reports,
});

function Reports() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Analysis[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchAnalyses = useServerFn(listMyAnalyses);
  const removeAnalysis = useServerFn(deleteAnalysis);

  const reload = useCallback(() => {
    return fetchAnalyses()
      .then((r) => {
        const mapped = ((r?.analyses ?? []) as ServerAnalysisRow[]).map(mapServerAnalysis);
        setItems(mapped.filter((a) => a.status === "completed"));
      })
      .catch(() => setItems([]));
  }, [fetchAnalyses]);

  useEffect(() => {
    let alive = true;
    reload();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      channel = supabase
        .channel(`analyses-reports-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "analyses", filter: `user_id=eq.${data.user.id}` },
          () => { reload(); },
        )
        .subscribe();
    });
    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [reload]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeAnalysis({ data: { id } });
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(t("reports.toastDeleted"));
    } catch (e) {
      toast.error(t("reports.toastError"), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("reports.subtitle")}</p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            {t("reports.empty")}
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
                    <div className="text-xs text-muted-foreground">{new Date(a.uploadedAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("reports.detections", { count: a.result?.totalDetections ?? 0 })}</span>
                  <span className={`font-semibold ${riskColor(a.result?.risk)}`}>{riskLabel(a.result?.risk)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/analysis/$id" params={{ id: a.id }}>{t("reports.view")}</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                    <Link to="/analysis/$id" params={{ id: a.id }} search={{ export: 1 }}>
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={t("reports.deleteAria")}
                        disabled={deletingId === a.id}
                        className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("reports.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          <Trans i18nKey="reports.confirmBody" values={{ name: a.fileName }} components={[<span className="font-medium" />]} />
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("reports.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(a.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("reports.delete")}
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
