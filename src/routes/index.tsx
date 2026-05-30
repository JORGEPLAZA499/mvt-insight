import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Activity, FileSearch, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spyware Forensic Analyzer — Análisis forense de indicios de spyware" },
      { name: "description", content: "Plataforma de análisis forense preliminar de dispositivos móviles basada en MVT (Mobile Verification Toolkit). Detecta posibles indicios de compromiso." },
      { property: "og:title", content: "Spyware Forensic Analyzer" },
      { property: "og:description", content: "Análisis forense de indicios de spyware en dispositivos móviles con MVT." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur-md sticky top-0 z-50 bg-background/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Spyware Forensic Analyzer</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Características</a>
            <a href="#how" className="hover:text-foreground">Cómo funciona</a>
            <a href="#legal" className="hover:text-foreground">Aviso legal</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Iniciar sesión</Link></Button>
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"><Link to="/login">Empezar</Link></Button>
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
              Motor basado en MVT · Mobile Verification Toolkit
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Análisis forense de <span className="text-gradient-primary">indicios de spyware</span> en dispositivos móviles.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              Sube los archivos generados por MVT o un backup preparado y obtén un informe estructurado con los posibles indicadores de compromiso, fechas, dominios y artefactos sospechosos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to="/login">Iniciar análisis <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">Cómo funciona</a>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground max-w-xl">
              Esta plataforma <strong className="text-foreground">no instala spyware</strong>, no accede a dispositivos sin permiso y no realiza vigilancia. Ofrece indicios técnicos, no una certificación absoluta de infección.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: "Motor MVT", desc: "Procesa los artefactos generados por Mobile Verification Toolkit, incluidos resultados STIX2/IOC." },
            { icon: Activity, title: "Resultados visuales", desc: "Métricas, línea de tiempo, severidad y origen de cada indicador detectado." },
            { icon: FileSearch, title: "Informe exportable", desc: "Resumen ejecutivo y evidencias en PDF, listo para compartir con tu equipo." },
            { icon: Lock, title: "Privacidad por diseño", desc: "Archivos cifrados en reposo. Eliminación definitiva bajo demanda." },
            { icon: CheckCircle2, title: "Indicadores normalizados", desc: "Dominios, procesos, rutas, hashes y eventos correlacionados con feeds públicos." },
            { icon: Shield, title: "Consentimiento primero", desc: "Diseñado para análisis con permiso explícito del titular del dispositivo." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-card hover:border-primary/40 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-secondary grid place-items-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Tres pasos para un análisis preliminar</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Sube los artefactos", d: "Carga los resultados JSON/CSV exportados por MVT o un backup preparado para análisis." },
              { n: "02", t: "Procesamiento seguro", d: "El backend ejecuta MVT en un entorno aislado y correlaciona los IOC contra feeds públicos." },
              { n: "03", t: "Informe estructurado", d: "Recibes coincidencias, nivel de riesgo estimado, línea de tiempo y un PDF descargable." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-6">
                <div className="text-xs font-mono text-primary">{s.n}</div>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legal */}
      <section id="legal" className="max-w-4xl mx-auto px-6 py-20">
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-warning" /> Aviso legal</h3>
          <p className="text-sm text-muted-foreground">
            Spyware Forensic Analyzer es una herramienta de análisis forense preliminar. Los resultados son indicios técnicos basados en patrones conocidos y no constituyen una certificación absoluta de infección. El análisis debe realizarse únicamente con el consentimiento explícito del propietario del dispositivo. No compartimos datos con terceros.
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Spyware Forensic Analyzer</span>
          <span>Motor técnico: MVT — Mobile Verification Toolkit (Amnesty International)</span>
        </div>
      </footer>
    </div>
  );
}
