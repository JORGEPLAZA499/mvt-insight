import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, RefreshCw, Scale, UploadCloud } from "lucide-react";
import i18n from "@/i18n";
import {
  listAccounts,
  generateCreditToken,
  listCreditTokens,
  getSystemHealth,
  adminUploadAnalysisForUser,
} from "@/lib/admin.functions";
import { adminGetUserLegalSummary } from "@/lib/legal.functions";
import { LegalAcceptanceViewer } from "@/components/legal-acceptance-viewer";
import { parseMvtFiles } from "@/lib/mvt-parser";

type AdminTab = "clients" | "tokens" | "health" | "upload";

export const Route = createFileRoute("/admin")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return { meta: [{ title: t("admin.metaTitle") }] };
  },
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => {
    const t = search.tab;
    return {
      tab:
        t === "tokens" || t === "health" || t === "upload" ? t : "clients",
    };
  },
  component: AdminPanel,
});

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function AdminPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: acc } = await supabase
        .from("accounts")
        .select("user_code")
        .eq("id", data.user.id)
        .maybeSingle();
      if (acc?.user_code === "Admin") setAuthorized(true);
      else {
        setAuthorized(false);
        navigate({ to: "/dashboard" });
      }
    })();
  }, [navigate]);

  if (authorized !== true) {
    return (
      <AppShell>
        <div className="p-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("admin.verifying")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.25em] text-primary/80 mb-2">
            {t("admin.eyebrow")}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{t("admin.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.subtitle")}</p>
        </div>

        <AdminSectionContent />

      </div>
    </AppShell>
  );
}

function AdminSectionContent() {
  const { tab } = Route.useSearch();
  if (tab === "tokens") return <TokensTab />;
  if (tab === "health") return <HealthTab />;
  return <ClientsTab />;
}


function ClientsTab() {
  const { t } = useTranslation();
  const fetchAccounts = useServerFn(listAccounts);
  const fetchLegal = useServerFn(adminGetUserLegalSummary);
  const [rows, setRows] = useState<any[]>([]);
  const [legalMap, setLegalMap] = useState<Map<string, string | null>>(new Map());
  const [legalVersion, setLegalVersion] = useState<string>("");
  const [viewer, setViewer] = useState<{ userId: string; userCode: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [r, l] = await Promise.all([fetchAccounts(), fetchLegal()]);
      setRows(r);
      setLegalVersion(l.currentVersion);
      setLegalMap(new Map(l.accounts.map((a) => [a.id, a.accepted_version])));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      q
        ? rows.filter((r) => r.user_code?.toLowerCase().includes(q.toLowerCase()))
        : rows,
    [rows, q],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t("admin.clients.title", { count: rows.length })}</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("admin.clients.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56"
          />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{t("admin.clients.userNum")}</th>
                <th className="text-center px-3 py-2 font-medium">{t("admin.clients.legal")}</th>
                <th className="text-right px-3 py-2 font-medium">{t("admin.clients.credits")}</th>
                <th className="text-right px-3 py-2 font-medium">{t("admin.clients.recharges")}</th>
                <th className="text-right px-3 py-2 font-medium">{t("admin.clients.totalRecharged")}</th>
                <th className="text-left px-3 py-2 font-medium">{t("admin.clients.lastRecharge")}</th>
                <th className="text-left px-3 py-2 font-medium">{t("admin.clients.lastLogin")}</th>
                <th className="text-left px-3 py-2 font-medium">{t("admin.clients.created")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const accepted = legalMap.get(r.id) ?? null;
                const status: "ok" | "outdated" | "missing" =
                  accepted === legalVersion
                    ? "ok"
                    : accepted
                      ? "outdated"
                      : "missing";
                const tone =
                  status === "ok"
                    ? "text-success"
                    : status === "outdated"
                      ? "text-warning"
                      : "text-destructive";
                const title =
                  status === "ok"
                    ? t("admin.legal.statusOk")
                    : status === "outdated"
                      ? t("admin.legal.statusOutdated", { v: accepted })
                      : t("admin.legal.statusMissing");
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{r.user_code}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setViewer({ userId: r.id, userCode: r.user_code })}
                        className={`inline-flex items-center justify-center rounded-md hover:bg-muted p-1 ${tone}`}
                        title={title}
                        aria-label={title}
                      >
                        <Scale className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.credits}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.recharges_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.total_recharged}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmt(r.last_recharge_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmt(r.last_login_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{fmt(r.created_at)}</td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t("admin.clients.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {viewer && (
        <LegalAcceptanceViewer
          open={!!viewer}
          onOpenChange={(v) => !v && setViewer(null)}
          userId={viewer.userId}
          userCode={viewer.userCode}
        />
      )}
    </Card>
  );
}

function TokensTab() {
  const { t } = useTranslation();
  const fetchTokens = useServerFn(listCreditTokens);
  const createToken = useServerFn(generateCreditToken);
  const [tokens, setTokens] = useState<any[]>([]);
  const [credits, setCredits] = useState(100);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTokens(await fetchTokens());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const onGenerate = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await createToken({ data: { credits } });
      setLastCode(r.code);
      await load();
    } catch (e: any) {
      setError(e?.message ?? t("admin.tokens.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>{t("admin.tokens.generate")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="credits">{t("admin.tokens.credits")}</Label>
            <Input
              id="credits"
              type="number"
              min={1}
              value={credits}
              onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 0))}
            />
          </div>
          <Button onClick={onGenerate} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.tokens.generate")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {lastCode && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                {t("admin.tokens.newToken")}
              </div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm flex-1 break-all">{lastCode}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(lastCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("admin.tokens.issued", { count: tokens.length })}</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.tokens.code")}</th>
                  <th className="text-right px-3 py-2 font-medium">{t("admin.tokens.credits")}</th>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.tokens.status")}</th>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.tokens.created")}</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((tk) => (
                  <tr key={tk.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{tk.code}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tk.credits}</td>
                    <td className="px-3 py-2">
                      {tk.redeemed_at ? (
                        <span className="text-xs text-muted-foreground">
                          {t("admin.tokens.redeemedBy")}{" "}
                          <span className="font-mono text-foreground">
                            {tk.redeemed_by_code ?? "—"}
                          </span>{" "}
                          {t("admin.tokens.on")} {fmt(tk.redeemed_at)}
                        </span>
                      ) : (
                        <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">
                          {t("admin.tokens.available")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmt(tk.created_at)}</td>
                  </tr>
                ))}
                {!loading && tokens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      {t("admin.tokens.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthTab() {
  const { t } = useTranslation();
  const fetchHealth = useServerFn(getSystemHealth);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await fetchHealth());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const stats = [
    { label: t("admin.health.dbStatus"), value: data?.ok ? t("admin.health.operative") : "—", sub: t("admin.health.ping", { ms: data?.pingMs ?? "—" }) },
    { label: t("admin.health.accounts"), value: data?.accountsCount ?? "—" },
    { label: t("admin.health.creditsCirc"), value: data?.creditsInCirculation ?? "—" },
    { label: t("admin.health.tokensAvailable"), value: data?.tokensAvailable ?? "—", sub: t("admin.health.tokensSub", { redeemed: data?.tokensRedeemed ?? 0, total: data?.tokensTotal ?? 0 }) },
    { label: t("admin.health.lastLogin"), value: fmt(data?.lastLoginAt) },
    { label: t("admin.health.lastRecharge"), value: fmt(data?.lastRechargeAt) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {t("admin.health.lastCheck", { when: fmt(data?.checkedAt) })}
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> {t("admin.health.refresh")}
        </Button>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{String(s.value)}</div>
              {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
