import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  Sparkles,
  FileText,
  ScanSearch,
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import i18n from "@/i18n";

const ANALYSIS_COST = 98;
const CREDIT_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * ANALYSIS_COST);

export const Route = createFileRoute("/pricing")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return {
      meta: [
        { title: `${t("landing.nav.pricing")} — Spyware Forensic Analyzer` },
        {
          name: "description",
          content: t("purchase.description"),
        },
        {
          property: "og:title",
          content: `${t("landing.nav.pricing")} — Spyware Forensic Analyzer`,
        },
        { property: "og:description", content: t("purchase.description") },
      ],
    };
  },
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation();
  const [credits, setCredits] = useState<number>(ANALYSIS_COST);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="flex-1 relative overflow-hidden">
        {/* Ambient background glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <section className="relative max-w-5xl mx-auto px-6 pt-6 pb-16 md:pt-8 md:pb-24">
          {/* Pricing card — same visual language as purchase modal */}
          <div
            className="relative overflow-hidden rounded-2xl border border-primary/30 p-px shadow-glow animate-fade-in"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 60%, transparent), color-mix(in oklab, var(--accent) 40%, transparent), transparent)",
            }}
          >
            <div className="relative rounded-[15px] bg-card/95 backdrop-blur-xl p-6 md:p-10 overflow-hidden">
              {/* glow orbs */}
              <div
                aria-hidden
                className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-40 animate-pulse"
                style={{
                  background:
                    "radial-gradient(circle, var(--primary), transparent 70%)",
                }}
              />
              <div
                aria-hidden
                className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30 animate-pulse"
                style={{
                  background:
                    "radial-gradient(circle, var(--accent), transparent 70%)",
                  animationDelay: "1.2s",
                }}
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

              <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-primary/90">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t("purchase.badge")}
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                    {t("purchase.title")}
                  </h2>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span
                      className="text-4xl md:text-5xl font-bold tabular-nums bg-clip-text text-transparent"
                      style={{ backgroundImage: "var(--gradient-primary)" }}
                    >
                      {t("purchase.pricePerAnalysis", { credits: ANALYSIS_COST })}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t("purchase.perAnalysis")}
                    </span>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                      {t("purchase.selectPackage")}
                    </label>
                    <select
                      value={credits}
                      onChange={(e) => setCredits(Number(e.target.value))}
                      className="w-full max-w-sm rounded-xl border border-primary/30 bg-background/70 px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/60 focus:border-primary focus:outline-none cursor-pointer transition"
                    >
                      {CREDIT_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {t("purchase.option", {
                            credits: c,
                            analyses: c / ANALYSIS_COST,
                          })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-xl">
                    {t("purchase.description")}
                  </p>

                  <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
                    <Feature icon={ScanSearch} text={t("purchase.features.evidence")} />
                    <Feature icon={Sparkles} text={t("purchase.features.risk")} />
                    <Feature icon={ShieldCheck} text={t("purchase.features.visual")} />
                    <Feature icon={FileText} text={t("purchase.features.report")} />
                  </ul>

                  <p className="mt-4 text-[11px] text-muted-foreground/80 italic">
                    {t("purchase.consent")}
                  </p>
                </div>

                <div className="md:w-[260px] w-full flex flex-col gap-3">
                  <div className="flex flex-col gap-3">
                    <PayGroup title={t("purchase.cardPayments")} items={cardBrands} />
                    <PayGroup title={t("purchase.cryptoPayments")} items={cryptoBrands} />
                  </div>


                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground text-center">
                    Las compras se realizan desde el panel de control una vez iniciada sesión.
                  </p>

                  <Link
                    to="/login"
                    className="w-full text-center rounded-xl border border-primary/30 bg-background/60 backdrop-blur px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/60 hover:text-primary transition"
                  >
                    {t("landing.nav.login")}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t("purchase.consent")}
          </p>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <li className="flex items-center gap-2 text-foreground/90">
      <span className="h-6 w-6 grid place-items-center rounded-md border border-primary/30 bg-primary/10">
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
      <div className="flex flex-nowrap gap-1.5 justify-center items-center">
        {items.map((it) => (
          <span key={it.key} className="shrink-0">{it.node}</span>
        ))}
      </div>
    </div>
  );
}
