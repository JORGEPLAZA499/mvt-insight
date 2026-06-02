import { useEffect, useState, useSyncExternalStore } from "react";
import { CreditCard, Bitcoin, ShieldCheck, Sparkles, X, FileText, ScanSearch } from "lucide-react";

export const PURCHASE_EVENT = "open-purchase-card";

// ---- shared open state (module-level) ----
let purchaseOpen = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function setPurchaseOpen(v: boolean) {
  purchaseOpen = v;
  emit();
}

export function openPurchaseCard() {
  setPurchaseOpen(true);
}

export function closePurchaseCard() {
  setPurchaseOpen(false);
}

export function usePurchaseCardOpen() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => purchaseOpen,
    () => purchaseOpen
  );
}

export function PurchaseCard() {
  const open = usePurchaseCardOpen();

  useEffect(() => {
    const handler = () => setPurchaseOpen(true);
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
                <PayGroup title="Card Payments" items={cardBrands} />
                <PayGroup title="Crypto Payments" items={cryptoBrands} />
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

type BrandItem = { key: string; node: React.ReactNode };

const cardBrands: BrandItem[] = [
  {
    key: "mc",
    node: (
      <div className="h-7 w-10 rounded-md bg-white grid place-items-center shadow-sm">
        <svg viewBox="0 0 32 20" className="h-4">
          <circle cx="12" cy="10" r="7" fill="#EB001B" />
          <circle cx="20" cy="10" r="7" fill="#F79E1B" fillOpacity="0.9" />
          <path d="M16 5.2a7 7 0 0 0 0 9.6 7 7 0 0 0 0-9.6Z" fill="#FF5F00" />
        </svg>
      </div>
    ),
  },
  {
    key: "visa",
    node: (
      <div className="h-7 w-10 rounded-md bg-white grid place-items-center shadow-sm">
        <span className="text-[10px] font-black italic tracking-tight text-[#1A1F71]">VISA</span>
      </div>
    ),
  },
  {
    key: "amex",
    node: (
      <div className="h-7 w-10 rounded-md bg-[#1F72CD] grid place-items-center shadow-sm">
        <span className="text-[8px] font-black tracking-tight text-white">AMEX</span>
      </div>
    ),
  },
  {
    key: "applepay",
    node: (
      <div className="h-7 w-10 rounded-md bg-black border border-white/10 grid place-items-center shadow-sm">
        <span className="text-[9px] font-semibold text-white tracking-tight"> Pay</span>
      </div>
    ),
  },
  {
    key: "gpay",
    node: (
      <div className="h-7 w-10 rounded-md bg-white grid place-items-center shadow-sm">
        <span className="text-[8px] font-medium tracking-tight">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">o</span>
          <span className="text-[#FBBC04]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#34A853]">l</span>
          <span className="text-[#EA4335]">e</span>
          <span className="text-foreground/70"> Pay</span>
        </span>
      </div>
    ),
  },
];

const cryptoBrands: BrandItem[] = [
  { key: "btc", node: <CryptoCircle bg="#F7931A" label="₿" /> },
  {
    key: "eth",
    node: (
      <CryptoCircle bg="#627EEA">
        <svg viewBox="0 0 32 32" className="h-4 w-4">
          <path fill="#fff" d="M16 4 9 16.3l7 4.1 7-4.1z" opacity=".9" />
          <path fill="#fff" d="m16 21.6-7-4.1L16 28l7-10.5z" opacity=".7" />
        </svg>
      </CryptoCircle>
    ),
  },
  { key: "usdt", node: <CryptoCircle bg="#26A17B" label="₮" /> },
  { key: "trx", node: <CryptoCircle bg="#EF0027" label="T" /> },
  { key: "bnb", node: <CryptoCircle bg="#F3BA2F" label="◆" /> },
];

function CryptoCircle({
  bg,
  label,
  children,
}: {
  bg: string;
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="h-7 w-7 rounded-full grid place-items-center shadow-sm text-white font-bold text-xs"
      style={{ background: bg }}
    >
      {children ?? label}
    </div>
  );
}

function PayGroup({ title, items }: { title: string; items: BrandItem[] }) {
  return (
    <div>
      <div className="text-[10px] italic text-muted-foreground mb-1.5 text-center">{title}</div>
      <div className="flex flex-wrap gap-1.5 justify-center items-center">
        {items.map((it) => (
          <div key={it.key}>{it.node}</div>
        ))}
      </div>
    </div>
  );
}
