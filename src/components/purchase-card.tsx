import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Bitcoin, ShieldCheck, Sparkles, X, FileText, ScanSearch, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { StripeEmbeddedCheckoutInline } from "@/components/stripe-embedded-checkout";
import { createPlisioInvoice } from "@/lib/plisio.functions";



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

export const ANALYSIS_COST = 98;
const CREDIT_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * ANALYSIS_COST);

export function PurchaseCard() {
  const { t } = useTranslation();
  const open = usePurchaseCardOpen();
  const [credits, setCredits] = useState<number>(ANALYSIS_COST);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const createPlisio = useServerFn(createPlisioInvoice);


  useEffect(() => {
    const handler = () => setPurchaseOpen(true);
    window.addEventListener(PURCHASE_EVENT, handler);
    return () => window.removeEventListener(PURCHASE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) setCheckoutOpen(false);
  }, [open]);

  if (!open) return null;

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
      : "/dashboard";


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/30 p-px shadow-glow max-w-4xl w-full"
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
            onClick={() => setPurchaseOpen(false)}
            aria-label={t("purchase.close")}
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-primary/90 mb-3">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("purchase.badge")}
              </div>
              <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
                {t("purchase.title")}
              </h3>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className="text-4xl md:text-5xl font-bold tabular-nums bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  {t("purchase.pricePerAnalysis", { credits: ANALYSIS_COST })}
                </span>
                <span className="text-sm text-muted-foreground">{t("purchase.perAnalysis")}</span>
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
                      {t("purchase.option", { credits: c, analyses: c / ANALYSIS_COST })}
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
              <button
                onClick={() => setCheckoutOpen(true)}
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                style={{ background: "var(--gradient-primary)" }}
              >
                <span className="relative flex items-center justify-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("purchase.payCard")}
                </span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in oklab, white 35%, transparent), transparent)",
                  }}
                />
              </button>

              <button
                onClick={async () => {
                  if (cryptoLoading) return;
                  setCryptoLoading(true);
                  try {
                    const res = await createPlisio({ data: { credits } });
                    if (res?.invoice_url) {
                      window.location.href = res.invoice_url;
                    } else {
                      throw new Error("missing invoice_url");
                    }
                  } catch (e) {
                    console.error("[plisio] create invoice error", e);
                    toast.error(t("purchase.cryptoError"));
                    setCryptoLoading(false);
                  }
                }}
                disabled={cryptoLoading}
                className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 font-semibold border border-primary/30 bg-background/60 backdrop-blur hover:border-primary/60 hover:text-primary transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {cryptoLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("purchase.cryptoLoading")}
                    </>
                  ) : (
                    <>
                      <Bitcoin className="h-5 w-5 text-[color:var(--warning)]" />
                      {t("purchase.payCrypto")}
                    </>
                  )}
                </span>
              </button>


              <div className="mt-3 space-y-3">
                <PayGroup title={t("purchase.cardPayments")} items={cardBrands} />
                <PayGroup title={t("purchase.cryptoPayments")} items={cryptoBrands} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="relative bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCheckoutOpen(false)}
              aria-label={t("purchase.close")}
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition z-10 bg-card"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="p-4 pt-12">
              <StripeEmbeddedCheckoutInline
                priceId={`credits_${credits}`}
                returnUrl={returnUrl}
              />
            </div>
          </div>
        </div>
      )}
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

