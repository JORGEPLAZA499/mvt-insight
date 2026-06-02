import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Activity, FileSearch, ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import logoAsset from "@/assets/logo.png.asset.json";
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-6 h-auto py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="" className="h-[150px] w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest">
            <a href="#features" className="relative text-muted-foreground hover:text-primary transition-colors duration-300 group">
              <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_8px_var(--primary)] transition-all duration-300">
                {t("landing.nav.features")}
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]" />
            </a>
            <a href="#how" className="relative text-muted-foreground hover:text-primary transition-colors duration-300 group">
              <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_8px_var(--primary)] transition-all duration-300">
                {t("landing.nav.how")}
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]" />
            </a>
            <a href="#legal" className="relative text-muted-foreground hover:text-primary transition-colors duration-300 group">
              <span className="drop-shadow-[0_0_6px_rgba(0,0,0,0)] group-hover:drop-shadow-[0_0_8px_var(--primary)] transition-all duration-300">
                {t("landing.nav.legal")}
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300 shadow-[0_0_8px_var(--primary)]" />
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button asChild variant="ghost" size="sm"><Link to="/login">{t("landing.nav.login")}</Link></Button>
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Link to="/login">{t("landing.nav.start")}</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
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
      <section id="how" className="scroll-mt-[200px] border-t border-border bg-card/30">
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

      {/* Legal */}
      <section id="legal" className="scroll-mt-[200px] max-w-4xl mx-auto px-6 py-20">
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-warning" /> {t("landing.legal.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("landing.legal.body")}
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("landing.footer.copy", { year: new Date().getFullYear() })}</span>
          <span>{t("landing.footer.engine")}</span>
        </div>
      </footer>
    </div>
  );
}
