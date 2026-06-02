import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Activity, FileSearch, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import i18n from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return {
      meta: [
        { title: t("landing.meta.title") },
        { name: "description", content: t("landing.meta.description") },
        { property: "og:title", content: t("landing.meta.ogTitle") },
        { property: "og:description", content: t("landing.meta.ogDescription") },
      ],
    };
  },
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();

  const features = [
    { icon: Shield, key: "mvt" },
    { icon: Activity, key: "visual" },
    { icon: FileSearch, key: "report" },
    { icon: Lock, key: "privacy" },
    { icon: CheckCircle2, key: "normalized" },
    { icon: Shield, key: "consent" },
  ] as const;

  const steps = [
    { n: "01", key: "s1" },
    { n: "02", key: "s2" },
    { n: "03", key: "s3" },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1">
      <section className="relative bg-hero">
        <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              {t("landing.hero.badge")}
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              {t("landing.hero.titleStart")}
              <span className="text-gradient-primary">{t("landing.hero.titleHighlight")}</span>
              {t("landing.hero.titleEnd")}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to="/login">{t("landing.hero.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">{t("landing.hero.ctaSecondary")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-[200px] max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.key} className="rounded-xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-secondary grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{t(`landing.features.items.${f.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`landing.features.items.${f.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="scroll-mt-[180px] border-t border-border bg-card/30 pb-24">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("landing.how.title")}</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-6">
                <div className="text-xs font-mono text-primary">{s.n}</div>
                <h3 className="mt-2 font-semibold">{t(`landing.how.steps.${s.key}.t`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`landing.how.steps.${s.key}.d`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>

      <PublicFooter />
    </div>
  );
}

