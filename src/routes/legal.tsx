import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import i18n from "@/i18n";

export const Route = createFileRoute("/legal")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return {
      meta: [
        { title: `${t("landing.legal.title")} — MVT Insight` },
        { name: "description", content: t("landing.legal.body") },
        { property: "og:title", content: t("landing.legal.title") },
        { property: "og:description", content: t("landing.legal.body") },
      ],
    };
  },
  component: LegalPage,
});

function LegalPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader anchorsToHome />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-8 flex items-center gap-3">
          <Shield className="h-7 w-7 text-warning" />
          {t("landing.legal.title")}
        </h1>
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-6">
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {t("landing.legal.body")}
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
