import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Analysis, riskColor, riskLabel } from "@/lib/mock-store";
import { listMyAnalyses } from "@/lib/analyses.functions";
import { mapServerAnalysis, type ServerAnalysisRow } from "@/lib/server-analyses";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FileSearch,
  History,
  Monitor,
  Coins,
  Headset,
  ArrowRight,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openPurchaseCard, PurchaseCard } from "@/components/purchase-card";
import { PaymentSuccessModal } from "@/components/payment-success-modal";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Spyware Forensic Analyzer" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [items, setItems] = useState<Analysis[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const [successOpen, setSuccessOpen] = useState(false);
  const fetchAnalyses = useServerFn(listMyAnalyses);

  useEffect(() => {
    let alive = true;
    fetchAnalyses()
      .then((r) => {
        if (!alive) return;
        setItems(((r?.analyses ?? []) as ServerAnalysisRow[]).map(mapServerAnalysis));
      })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [fetchAnalyses]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data: acc } = await supabase
        .from("accounts")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();
      if (alive) setCredits(acc?.credits ?? 0);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (search.checkout === "success") {
      setSuccessOpen(true);
      navigate({ to: "/dashboard", search: {}, replace: true });
    }
  }, [search.checkout, navigate]);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const highRisk = items.filter(
      (i) => i.result?.risk === "high" || i.result?.risk === "critical",
    ).length;
    return { total, completed, highRisk };
  }, [items]);

  return (
    <AppShell>
      <PurchaseCard />
      <PaymentSuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-primary/80 mb-2">
              {t("dashboard.eyebrow")}
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
          </div>
        </div>

        {/* Quick action shortcuts */}
        <section className="animate-fade-in">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              to="/upload"
              icon={UploadCloud}
              title={t("dashboard.shortcuts.newAnalysis.title")}
              desc={t("dashboard.shortcuts.newAnalysis.desc")}
              cta={t("dashboard.shortcuts.newAnalysis.cta")}
              tone="primary"
              featured
            />
            <ActionCard
              to="/reports"
              icon={FileSearch}
              title={t("dashboard.shortcuts.reports.title")}
              desc={t("dashboard.shortcuts.reports.desc")}
              cta={t("dashboard.shortcuts.reports.cta")}
              tone="accent"
            />
            <ActionCard
              to="/history"
              icon={History}
              title={t("dashboard.shortcuts.history.title")}
              desc={t("dashboard.shortcuts.history.desc")}
              cta={t("dashboard.shortcuts.history.cta")}
              tone="primary"
            />
            <ActionCard
              to="/settings/desktop"
              icon={Monitor}
              title={t("dashboard.shortcuts.desktop.title")}
              desc={t("dashboard.shortcuts.desktop.desc")}
              cta={t("dashboard.shortcuts.desktop.cta")}
              tone="accent"
            />
            <ActionCard
              onClick={() => openPurchaseCard()}
              icon={Coins}
              title={t("dashboard.shortcuts.credits.title")}
              desc={t("dashboard.shortcuts.credits.desc")}
              cta={t("dashboard.shortcuts.credits.cta")}
              tone="warning"
              badge={String(credits)}
            />
            <ActionCard
              href="https://www.rpjsoftware.com/help#contacto"
              icon={Headset}
              title={t("dashboard.shortcuts.support.title")}
              desc={t("dashboard.shortcuts.support.desc")}
              cta={t("dashboard.shortcuts.support.cta")}
              tone="muted"
            />
          </div>
        </section>

        {/* Compact stats strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 animate-fade-in">
          <StatTile icon={Activity} label={t("dashboard.stats.total")} value={stats.total} tone="primary" />
          <StatTile icon={ShieldCheck} label={t("dashboard.stats.completed")} value={stats.completed} tone="success" />
          <StatTile icon={AlertTriangle} label={t("dashboard.stats.highRisk")} value={stats.highRisk} tone="destructive" />
          <StatTile icon={Sparkles} label={t("dashboard.stats.credits")} value={credits} tone="warning" />
        </section>

      </div>
    </AppShell>
  );
}

type Tone = "primary" | "accent" | "warning" | "muted" | "success" | "destructive";

const toneColor: Record<Tone, string> = {
  primary: "var(--primary)",
  accent: "var(--accent)",
  warning: "var(--warning)",
  muted: "var(--muted-foreground)",
  success: "var(--success)",
  destructive: "var(--destructive)",
};

function ActionCard({
  to,
  href,
  onClick,
  icon: Icon,
  title,
  desc,
  cta,
  tone = "primary",
  featured,
  badge,
}: {
  to?: string;
  href?: string;
  onClick?: () => void;
  icon: any;
  title: string;
  desc: string;
  cta: string;
  tone?: Tone;
  featured?: boolean;
  badge?: string;
}) {
  const color = toneColor[tone];
  const inner = (
    <div
      className="group relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card p-px transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-glow"
      style={{
        background: featured
          ? `linear-gradient(135deg, color-mix(in oklab, ${color} 55%, transparent), color-mix(in oklab, var(--accent) 35%, transparent), transparent)`
          : undefined,
      }}
    >
      <div className="relative h-full rounded-[15px] bg-card/95 backdrop-blur-xl p-5 overflow-hidden">
        {/* glow orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
        />
        {/* sweep highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, white 18%, transparent), transparent)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div
            className="h-11 w-11 grid place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-110"
            style={{
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
              boxShadow: `0 0 24px -8px ${color}`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          {badge !== undefined && (
            <span
              className="text-[11px] tabular-nums font-semibold px-2 py-0.5 rounded-full border"
              style={{
                color,
                borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
                background: `color-mix(in oklab, ${color} 10%, transparent)`,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <h3 className="relative mt-4 text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="relative mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>

        <div
          className="relative mt-5 flex items-center gap-1.5 text-sm font-medium transition-transform duration-300 group-hover:translate-x-0.5"
          style={{ color }}
        >
          <span>{cta}</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block h-full w-full text-left cursor-pointer">
      {inner}
    </button>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: Tone;
}) {
  const color = toneColor[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card px-4 py-3 shadow-card group hover:border-primary/40 transition-colors">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Analysis["status"] }) {
  const { t } = useTranslation();
  const map = {
    pending: { c: "bg-muted text-muted-foreground", l: t("dashboard.status.pending") },
    processing: { c: "bg-primary/15 text-primary", l: t("dashboard.status.processing") },
    completed: { c: "bg-success/15 text-success", l: t("dashboard.status.completed") },
    error: { c: "bg-destructive/15 text-destructive", l: t("dashboard.status.error") },
  }[status];
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map.c}`}>
      {map.l}
    </span>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <h3 className="font-semibold">{t("dashboard.empty.title")}</h3>
      <p className="text-sm text-muted-foreground mt-1">{t("dashboard.empty.desc")}</p>
    </div>
  );
}
