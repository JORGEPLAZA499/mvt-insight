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

type BrandItem = { key: string; src: string; alt: string; bg?: string };

const CARD_CDN = "https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@main/flat-rounded";
const CRYPTO_CDN = "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";

const cardBrands: BrandItem[] = [
  { key: "visa", src: `${CARD_CDN}/visa.svg`, alt: "Visa" },
  { key: "mc", src: `${CARD_CDN}/mastercard.svg`, alt: "Mastercard" },
  { key: "amex", src: `${CARD_CDN}/amex.svg`, alt: "American Express" },
  { key: "applepay", src: "https://cdn.simpleicons.org/applepay/000000", alt: "Apple Pay", bg: "#ffffff" },
  { key: "gpay", src: "https://cdn.simpleicons.org/googlepay/3C4043", alt: "Google Pay", bg: "#ffffff" },
];

const cryptoBrands: BrandItem[] = [
  { key: "btc", src: `${CRYPTO_CDN}/btc.svg`, alt: "Bitcoin" },
  { key: "eth", src: `${CRYPTO_CDN}/eth.svg`, alt: "Ethereum" },
  { key: "usdt", src: `${CRYPTO_CDN}/usdt.svg`, alt: "Tether" },
  { key: "trx", src: `${CRYPTO_CDN}/trx.svg`, alt: "Tron" },
  { key: "bnb", src: `${CRYPTO_CDN}/bnb.svg`, alt: "BNB" },
];

function PayGroup({ title, items }: { title: string; items: BrandItem[] }) {
  return (
    <div>
      <div className="text-[11px] italic text-muted-foreground mb-2 text-center">{title}</div>
      <div className="flex flex-wrap gap-2 justify-center items-center">
        {items.map((it) => (
          <div
            key={it.key}
            className="h-10 w-14 rounded-md grid place-items-center shadow-sm overflow-hidden"
            style={{ background: it.bg ?? "#ffffff" }}
          >
            <img
              src={it.src}
              alt={it.alt}
              loading="lazy"
              className="max-h-7 max-w-[80%] object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
