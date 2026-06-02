import { useEffect, useState } from "react";
import { CreditCard, Bitcoin, ShieldCheck, Sparkles, X, FileText, ScanSearch } from "lucide-react";

export const PURCHASE_EVENT = "open-purchase-card";

export function openPurchaseCard() {
  window.dispatchEvent(new CustomEvent(PURCHASE_EVENT));
}

export function PurchaseCard() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(PURCHASE_EVENT, handler);
    return () => window.removeEventListener(PURCHASE_EVENT, handler);
  }, []);

  if (!open) return null;

  return (
    <div className="mt-8 animate-fade-in">
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/30 p-px shadow-glow"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 60%, transparent), color-mix(in oklab, var(--accent) 40%, transparent), transparent)",
        }}
      >
        <div className="relative rounded-[15px] bg-card/95 backdrop-blur-xl p-6 md:p-8 overflow-hidden">
          {/* glow orbs */}
          <div
            aria-hidden
            className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-30"
            style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
          />
          {/* grid overlay */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-primary/90 mb-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                Servicio forense premium
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Análisis Forense Móvil
              </h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className="text-4xl md:text-5xl font-bold tabular-nums bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  98,73 €
                </span>
                <span className="text-sm text-muted-foreground">/ análisis</span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-xl">
                Verificación técnica de indicios de spyware, malware y actividad sospechosa en
                dispositivos móviles mediante artefactos, indicadores IOC/STIX2 y herramientas
                forenses compatibles con MVT.
              </p>

              <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
                <Feature icon={ScanSearch} text="Revisión de evidencias" />
                <Feature icon={Sparkles} text="Clasificación de riesgo" />
                <Feature icon={ShieldCheck} text="Resultados visuales" />
                <Feature icon={FileText} text="Informe PDF" />
              </ul>

              <p className="mt-4 text-[11px] text-muted-foreground/80 italic">
                Análisis bajo consentimiento del titular del dispositivo.
              </p>
            </div>

            <div className="md:w-[260px] w-full flex flex-col gap-3">
              <button
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.99]"
                style={{ background: "var(--gradient-primary)" }}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagar con Tarjeta
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in oklab, white 35%, transparent), transparent)",
                  }}
                />
              </button>

              <button
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 font-semibold border border-border bg-background/60 backdrop-blur hover:border-primary/50 hover:bg-background/80 transition hover:scale-[1.02] active:scale-[0.99]"
              >
                <span className="relative flex items-center justify-center gap-2">
                  <Bitcoin className="h-5 w-5 text-[color:var(--warning)]" />
                  Pagar con Cripto
                </span>
              </button>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <PayGroup title="Card Payments" items={["MC", "VISA", "AMEX", "Pay", "Pay"]} />
                <PayGroup title="Crypto" items={["BTC", "ETH", "USDT", "TRX", "BNB"]} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <li className="flex items-center gap-2 text-foreground/90">
      <span
        className="h-6 w-6 grid place-items-center rounded-md border border-primary/30 bg-primary/10"
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
      </span>
      {text}
    </li>
  );
}

function PayGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] italic text-muted-foreground mb-1.5 text-center">{title}</div>
      <div className="flex flex-wrap gap-1 justify-center">
        {items.map((it) => (
          <span
            key={it}
            className="text-[9px] font-bold tracking-wider px-1.5 py-1 rounded-md bg-muted/70 border border-border text-foreground/80"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
