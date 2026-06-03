import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Sparkles, X, ShieldCheck } from "lucide-react";

export function PaymentSuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(id);
    }
    setMounted(false);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Confetti / sparkles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full"
            style={{
              left: `${(i * 53) % 100}%`,
              top: `${(i * 37) % 100}%`,
              width: `${4 + (i % 4) * 2}px`,
              height: `${4 + (i % 4) * 2}px`,
              background:
                i % 3 === 0
                  ? "var(--primary)"
                  : i % 3 === 1
                    ? "var(--accent)"
                    : "var(--success)",
              opacity: 0.45,
              filter: "blur(0.5px)",
              animation: `success-float ${3 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden rounded-3xl p-px shadow-glow transition-all duration-500 ${
          mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--success) 70%, transparent), color-mix(in oklab, var(--primary) 60%, transparent), color-mix(in oklab, var(--accent) 50%, transparent))",
        }}
      >
        <div className="relative rounded-[23px] bg-card/95 backdrop-blur-xl p-8 overflow-hidden">
          {/* Glow orbs */}
          <div
            aria-hidden
            className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-50"
            style={{
              background: "radial-gradient(circle, var(--success), transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full blur-3xl opacity-40"
            style={{
              background: "radial-gradient(circle, var(--primary), transparent 70%)",
            }}
          />
          {/* Grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex flex-col items-center text-center">
            {/* Animated success icon */}
            <div className="relative mb-5">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full blur-2xl opacity-70"
                style={{ background: "var(--success)" }}
              />
              <div
                className="relative h-20 w-20 rounded-full grid place-items-center border border-[color:var(--success)]/40"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--success) 35%, transparent), color-mix(in oklab, var(--primary) 15%, transparent))",
                  animation: "success-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                }}
              >
                <CheckCircle2
                  className="h-12 w-12 text-[color:var(--success)]"
                  strokeWidth={2.2}
                  style={{ animation: "success-check 0.7s ease-out 0.2s both" }}
                />
                {/* Pulse ring */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-[color:var(--success)]/50"
                  style={{ animation: "success-ring 1.6s ease-out infinite" }}
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-[color:var(--success)] mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              {t("purchase.successBadge", { defaultValue: "Pago confirmado" })}
            </div>

            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
              {t("purchase.successTitle", { defaultValue: "¡Gracias por tu compra!" })}
            </h3>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-6">
              {t("purchase.checkoutSuccess")}
            </p>

            <div className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6 py-2.5 px-4 rounded-xl border border-border/60 bg-background/40">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--success)]" />
              {t("purchase.successSecure", {
                defaultValue: "Transacción segura procesada por Stripe",
              })}
            </div>

            <button
              onClick={onClose}
              className="group relative w-full overflow-hidden rounded-xl px-4 py-3.5 font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
              style={{ background: "var(--gradient-primary)" }}
            >
              <span className="relative">
                {t("purchase.successContinue", { defaultValue: "Continuar" })}
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
          </div>
        </div>
      </div>

      <style>{`
        @keyframes success-pop {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes success-check {
          0% { transform: scale(0) rotate(-20deg); opacity: 0; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes success-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes success-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(8px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
