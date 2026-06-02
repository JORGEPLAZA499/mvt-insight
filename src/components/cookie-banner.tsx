import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Cookie, X, ShieldCheck, ChevronDown } from "lucide-react";

/**
 * GDPR / ePrivacy compliant cookie banner.
 * - Slides up from bottom-right
 * - Three explicit choices (accept / reject / customize) — equal weight
 * - Strictly necessary cookies always on (cannot be toggled)
 * - Stores consent with version + expiry in localStorage
 * - Re-prompts after CONSENT_TTL_DAYS or if version changes
 */

const STORAGE_KEY = "sfa.cookie-consent.v1";
const CONSENT_VERSION = 1;
const CONSENT_TTL_DAYS = 180; // 6 months — EDPB recommendation

export type CookiePrefs = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = {
  version: number;
  ts: number;
  expiresAt: number;
  prefs: CookiePrefs;
};

function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(prefs: CookiePrefs) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    ts: now,
    expiresAt: now + CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000,
    prefs,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("sfa:cookie-consent", { detail: payload }));
}

export function getCookieConsent(): CookiePrefs | null {
  return readConsent()?.prefs ?? null;
}

export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sfa:open-cookie-settings"));
  }
}

export function CookieBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (!existing) {
      // tiny delay so the slide-up animation plays
      const id = setTimeout(() => {
        setOpen(true);
        requestAnimationFrame(() => setMounted(true));
      }, 400);
      return () => clearTimeout(id);
    }
    setAnalytics(existing.prefs.analytics);
    setMarketing(existing.prefs.marketing);
  }, []);

  useEffect(() => {
    const reopen = () => {
      const existing = readConsent();
      if (existing) {
        setAnalytics(existing.prefs.analytics);
        setMarketing(existing.prefs.marketing);
      }
      setCustomize(true);
      setOpen(true);
      requestAnimationFrame(() => setMounted(true));
    };
    window.addEventListener("sfa:open-cookie-settings", reopen);
    return () => window.removeEventListener("sfa:open-cookie-settings", reopen);
  }, []);

  const close = () => {
    setMounted(false);
    setTimeout(() => {
      setOpen(false);
      setCustomize(false);
    }, 280);
  };

  const acceptAll = () => {
    writeConsent({ necessary: true, analytics: true, marketing: true });
    close();
  };
  const rejectAll = () => {
    writeConsent({ necessary: true, analytics: false, marketing: false });
    close();
  };
  const savePrefs = () => {
    writeConsent({ necessary: true, analytics, marketing });
    close();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className={`fixed bottom-4 right-4 left-4 sm:left-auto z-[60] w-auto sm:max-w-md transition-all duration-[900ms] ease-out ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl"
        style={{
          boxShadow:
            "0 20px 60px -20px color-mix(in oklab, var(--primary) 30%, transparent), 0 8px 30px -10px rgba(0,0,0,0.4)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent)",
          }}
        />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Cookie className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                id="cookie-banner-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                {t("cookies.title")}
              </h2>
              <p
                id="cookie-banner-desc"
                className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground"
              >
                {t("cookies.description")}{" "}
                <Link
                  to="/legal"
                  className="text-primary hover:underline underline-offset-2"
                >
                  {t("cookies.privacyPolicy")}
                </Link>
                .
              </p>
            </div>
            <button
              onClick={rejectAll}
              aria-label={t("cookies.close")}
              className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {customize && (
            <div className="mt-4 space-y-2 border-t border-border/60 pt-4 animate-fade-in">
              <CookieRow
                title={t("cookies.cats.necessary.title")}
                desc={t("cookies.cats.necessary.desc")}
                checked
                disabled
                onChange={() => undefined}
                alwaysOnLabel={t("cookies.alwaysOn")}
              />
              <CookieRow
                title={t("cookies.cats.analytics.title")}
                desc={t("cookies.cats.analytics.desc")}
                checked={analytics}
                onChange={setAnalytics}
              />
              <CookieRow
                title={t("cookies.cats.marketing.title")}
                desc={t("cookies.cats.marketing.desc")}
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {customize ? (
              <>
                <button
                  onClick={rejectAll}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background/60 text-sm font-medium hover:bg-background hover:border-primary/40 transition cursor-pointer"
                >
                  {t("cookies.rejectAll")}
                </button>
                <button
                  onClick={savePrefs}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {t("cookies.savePrefs")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={rejectAll}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background/60 text-sm font-medium hover:bg-background hover:border-primary/40 transition cursor-pointer"
                >
                  {t("cookies.rejectAll")}
                </button>
                <button
                  onClick={() => setCustomize(true)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background/60 text-sm font-medium hover:bg-background hover:border-primary/40 transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  {t("cookies.customize")} <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {t("cookies.acceptAll")}
                </button>
              </>
            )}
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground/70 inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            {t("cookies.gdprNote")}
          </p>
        </div>
      </div>
    </div>
  );
}

function CookieRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
  alwaysOnLabel,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  alwaysOnLabel?: string;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 ${
        disabled ? "opacity-90" : "cursor-pointer hover:border-primary/40"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</div>
      </div>
      {disabled ? (
        <span className="text-[10px] uppercase tracking-wider text-primary font-semibold mt-0.5">
          {alwaysOnLabel}
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition cursor-pointer ${
            checked ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
              checked ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </button>
      )}
    </label>
  );
}
