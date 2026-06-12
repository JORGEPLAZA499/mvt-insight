import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Analysis, riskColor, riskLabel } from "@/lib/mock-store";
import { listMyAnalyses } from "@/lib/analyses.functions";
import { mapServerAnalysis, type ServerAnalysisRow } from "@/lib/server-analyses";
import { Button } from "@/components/ui/button";
import i18n from "@/i18n";

export const Route = createFileRoute("/history")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return { meta: [{ title: t("history.metaTitle") }] };
  },
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Analysis[]>([]);
  const fetchAnalyses = useServerFn(listMyAnalyses);
  useEffect(() => {
    let alive = true;
    fetchAnalyses()
      .then((r) => {
        if (!alive) return;
        setItems(((r?.analyses ?? []) as ServerAnalysisRow[]).map(mapServerAnalysis));
      })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [fetchAnalyses]);

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("history.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("history.subtitle")}</p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">{t("history.empty")}</div>
        ) : (
          <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">{t("history.file")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("history.date")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("history.status")}</th>
                  <th className="text-left px-4 py-3 font-medium">{t("history.risk")}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3 truncate max-w-[280px]">{a.fileName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.uploadedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{a.status}</td>
                    <td className={`px-4 py-3 font-semibold ${riskColor(a.result?.risk)}`}>{riskLabel(a.result?.risk)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button asChild variant="ghost" size="sm"><Link to="/analysis/$id" params={{ id: a.id }}>{t("history.view")}</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
