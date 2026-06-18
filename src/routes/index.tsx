import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Activity, FileSearch, ArrowRight, CheckCircle2, Radar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import i18n from "@/i18n";
import publicidadAsset from "@/assets/publicidad.png.asset.json";
import publicidadEnAsset from "@/assets/publicidad_en.png.asset.json";

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
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-14 lg:items-center">
            {/* Left column: copy + CTAs */}
            <div className="min-w-0">
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

            {/* Right column: threat intel callout */}
            <div className="lg:justify-self-end w-full">
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card/40 backdrop-blur-sm p-5 shadow-card group">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
                  <div className="h-px w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center shadow-glow">
                    <Radar className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm md:text-[0.95rem] leading-relaxed text-foreground/90">
                    {t("landing.hero.threatsPrefix")}{" "}
                    {["Pegasus", "Predator", "Reign", "Hermit", "Triangulation"].map((name, i, arr) => (
                      <span key={name}>
                        <span className="inline-block px-2 py-0.5 mx-0.5 rounded-md border border-primary/30 bg-primary/5 font-mono text-xs text-primary transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-glow">
                          {name}
                        </span>
                        {i < arr.length - 1 ? (i === arr.length - 2 ? " " : ", ") : " "}
                      </span>
                    ))}
                    {t("landing.hero.threatsSuffix")}
                  </p>
                </div>
              </div>
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
        <p className="mt-8 text-xs text-center text-muted-foreground max-w-3xl mx-auto">
          {t("landing.legalNotice")}
        </p>
      </section>

      {/* How */}
      <section id="how" className="scroll-mt-[180px] border-t border-border bg-card/30 pb-56">
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

          {/* Publicidad image with deep transparency fade edges */}
          <div className="relative mt-16 mx-auto max-w-3xl">
            <img
              src={publicidadAsset.url}
              alt="Spyware Forensic Analyzer - Análisis forense de spyware mercenario"
              className="w-full h-auto object-cover"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 28%, black 72%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 28%, black 72%, transparent 100%)",
                maskComposite: "intersect",
              }}
            />
          </div>
        </div>
      </section>
      </main>

      <PublicFooter />
    </div>
  );
}

