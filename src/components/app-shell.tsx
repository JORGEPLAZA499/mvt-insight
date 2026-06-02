import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield,
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  History,
  LogOut,
  Sparkles,
  Zap,
  Loader2,
  Coins,
  ShieldCheck,
  Users,
  Ticket,
  Activity,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAnalyses, upsertAnalysis, Analysis } from "@/lib/mock-store";
import { supabase } from "@/integrations/supabase/client";
import { parseMvtFiles } from "@/lib/mvt-parser";
import { LanguageSelector } from "@/components/language-selector";
import logoAsset from "@/assets/logo.png.asset.json";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { redeemCreditToken } from "@/lib/credits.functions";
import { openPurchaseCard, PurchaseCard, usePurchaseCardOpen } from "@/components/purchase-card";

const QUICK_MAX_SIZE = 500 * 1024 * 1024;

export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const navigate = useNavigate();
  const purchaseOpen = usePurchaseCardOpen();
  const [credits, setCredits] = useState(0);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const handleQuickUpload = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setQuickError(null);
    const incoming = Array.from(filesList);
    const ok: File[] = [];
    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".json") && !lower.endsWith(".zip")) {
        setQuickError(t("shell.quick.notSupported", { name: f.name }));
        continue;
      }
      if (f.size > QUICK_MAX_SIZE) {
        setQuickError(t("shell.quick.tooBig", { name: f.name }));
        continue;
      }
      ok.push(f);
    }
    if (!ok.length) return;

    setQuickBusy(true);
    const id = crypto.randomUUID();
    const sourceName = ok.length === 1 ? ok[0].name : t("shell.quick.filesLabel", { count: ok.length });

    const totalSize = ok.reduce((s, f) => s + f.size, 0);
    const base: Analysis = {
      id,
      fileName: sourceName,
      fileSize: totalSize,
      uploadedAt: new Date().toISOString(),
      status: "processing",
      progress: 10,
    };
    upsertAnalysis(base);
    try {
      const result = await parseMvtFiles(ok, sourceName);
      upsertAnalysis({ ...base, status: "completed", progress: 100, result });
      navigate({ to: "/analysis/$id", params: { id } });
    } catch (e: any) {
      upsertAnalysis({ ...base, status: "error", progress: 0, error: e?.message || "Error" });
      setQuickError(e?.message || t("shell.quick.genericError"));

    } finally {
      setQuickBusy(false);
      if (quickInputRef.current) quickInputRef.current.value = "";
    }
  };

  const isAdmin = userCode === "Admin";
  const isAdminRoute = path.startsWith("/admin");
  const adminTab = (typeof search?.tab === "string" ? search.tab : "clients") as string;
  const inAdminMode = isAdmin && isAdminRoute;

  const nav = inAdminMode
    ? [
        { to: "/admin", label: t("shell.admin.clients"), icon: Users, hint: "", search: { tab: "clients" }, tabKey: "clients" },
        { to: "/admin", label: t("shell.admin.tokens"), icon: Ticket, hint: "", search: { tab: "tokens" }, tabKey: "tokens" },
        { to: "/admin", label: t("shell.admin.health"), icon: Activity, hint: "", search: { tab: "health" }, tabKey: "health" },
      ]
    : [
        { to: "/dashboard", label: t("shell.nav.dashboard"), icon: LayoutDashboard, hint: t("shell.nav.dashboardHint") },
        { to: "/upload", label: t("shell.nav.newAnalysis"), icon: UploadCloud, hint: t("shell.nav.uploadHint"), highlight: true },
        { to: "/reports", label: t("shell.nav.reports"), icon: FileSearch, hint: t("shell.nav.reportsHint") },
        { to: "/history", label: t("shell.nav.history"), icon: History, hint: t("shell.nav.historyHint") },
        ...(isAdmin
          ? [{ to: "/admin", label: t("shell.nav.admin"), icon: ShieldCheck, hint: t("shell.adminHint") }]
          : []),
      ] as any[];


  // Redeem credit token dialog
  const redeemFn = useServerFn(redeemCreditToken);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const onRedeem = async () => {
    setRedeemError(null);
    setRedeemSuccess(null);
    setRedeemBusy(true);
    try {
      const r = await redeemFn({ data: { code: redeemCode.trim() } });
      setRedeemSuccess(`+${r.credits_added} créditos. Saldo: ${r.new_balance}`);
      setCredits(r.new_balance);
      setRedeemCode("");
    } catch (e: any) {
      setRedeemError(e?.message ?? "No se pudo canjear el token");
    } finally {
      setRedeemBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      const { data: acc } = await supabase
        .from("accounts")
        .select("user_code, credits")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!active) return;
      setUserCode(acc?.user_code ?? null);
      setCredits(acc?.credits ?? 0);
      setHistoryCount(getAnalyses().length);
    })();
    return () => {
      active = false;
    };
  }, [navigate, path]);

  const initial = userCode?.[0] ?? "U";
  const emailShort = userCode ?? "—";

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <aside
        className="relative w-64 hidden md:flex flex-col overflow-hidden shrink-0 h-screen sticky top-0"
        style={{
          background:
            "linear-gradient(180deg, var(--sidebar) 0%, color-mix(in oklab, var(--sidebar) 92%, var(--background)) 100%)",
          boxShadow: "inset -1px 0 0 var(--sidebar-border), 1px 0 30px -20px color-mix(in oklab, var(--primary) 50%, transparent)",
        }}
      >
        {/* Decorative glows */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 -left-10 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary) 30%, transparent), transparent 70%)",
          }}
        />

        {/* Brand */}
        <Link
          to="/dashboard"
          className="relative flex flex-col items-center px-2 py-1 group"
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 rounded-lg blur-md opacity-60 group-hover:opacity-90 transition-opacity"
              style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 50%, transparent), transparent 70%)" }}
            />
            <img
              src={logoAsset.url}
              alt="Spyware Forensic Analyzer"
              className="relative h-[210px] w-[210px] object-contain"
            />
          </div>
        </Link>

        <div
          className="mx-5 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--sidebar-border), transparent)",
          }}
        />

        {/* Nav */}
        <div className="relative flex-1 px-3 py-4 overflow-y-auto">
          <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 font-medium">
            {inAdminMode ? "Administración" : t("shell.sectionPrimary")}
          </div>
          <nav className="space-y-1">
            {nav.map((n) => {
              const active = inAdminMode
                ? (n as any).tabKey === adminTab
                : path.startsWith(n.to);
              const Icon = n.icon;
              const badge =
                !inAdminMode && n.to === "/history" && historyCount > 0
                  ? String(historyCount)
                  : !inAdminMode && (n as any).highlight && !active
                    ? "new"
                    : null;
              return (
                <Link
                  key={`${n.to}-${(n as any).tabKey ?? ""}`}
                  to={n.to}
                  search={(n as any).search}
                  className={`relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:translate-x-0.5"
                  }`}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(90deg, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 100%)",
                        }
                      : undefined
                  }
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                      style={{
                        background: "var(--primary)",
                        boxShadow: "0 0 12px var(--primary), 0 0 4px var(--primary)",
                      }}
                    />
                  )}

                  {/* Hover bg layer (non-active) */}
                  {!active && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: "color-mix(in oklab, var(--sidebar-accent) 50%, transparent)",
                      }}
                    />
                  )}

                  <Icon
                    className={`relative h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${
                      active ? "text-primary" : ""
                    }`}
                    style={
                      active
                        ? { filter: "drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 70%, transparent))" }
                        : undefined
                    }
                  />
                  <span className="relative flex-1 truncate">{n.label}</span>

                  {badge && (
                    <span
                      className={`relative inline-flex items-center justify-center text-[10px] font-semibold rounded-full px-1.5 min-w-[18px] h-[18px] ${
                        badge === "new"
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-sidebar-accent text-foreground"
                      }`}
                    >
                      {badge === "new" ? (
                        <span className="inline-flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          {t("common.new")}
                        </span>
                      ) : (
                        badge
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick upload */}
          {!inAdminMode && (
            <div className="mt-5 px-2">
              <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 font-medium">
                Acceso rápido
              </div>
              <input
                ref={quickInputRef}
                type="file"
                multiple
                accept=".json,.zip"
                className="hidden"
                onChange={(e) => handleQuickUpload(e.target.files)}
              />
              <button
                onClick={() => quickInputRef.current?.click()}
                disabled={quickBusy}
                className="w-full relative group flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-primary-foreground bg-gradient-primary shadow-glow hover:opacity-95 disabled:opacity-70 disabled:cursor-not-allowed transition cursor-pointer"
              >
                {quickBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span className="flex-1 text-left font-medium">
                  {quickBusy ? "Procesando…" : "Subir ZIP/JSON"}
                </span>
                <UploadCloud className="h-4 w-4 opacity-80" />
              </button>
              <button
                onClick={() => openPurchaseCard()}
                className="w-full relative group flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-primary-foreground bg-gradient-primary shadow-glow hover:opacity-95 transition mt-2 cursor-pointer"
              >
                <Coins className="h-4 w-4" />
                <span className="flex-1 text-left font-medium">Comprar créditos</span>
                <Sparkles className="h-4 w-4 opacity-80" />
              </button>
              <p className="px-2 mt-1.5 text-[10px] text-muted-foreground/70 leading-tight">
                Sube directamente los archivos MVT sin pasar por el asistente.
              </p>
              {quickError && (
                <p className="mt-2 px-2 text-[11px] text-destructive">{quickError}</p>
              )}
            </div>
          )}
        </div>


        {/* User card + logout */}
        <div className="relative p-3">
          <div
            className="rounded-xl border border-sidebar-border p-3 mb-2"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--sidebar-accent) 60%, transparent), transparent)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shadow-glow">
                  {initial}
                </div>
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar"
                  style={{
                    background: "var(--success)",
                    boxShadow: "0 0 8px var(--success)",
                    animation: "pulse 2s infinite",
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-medium tracking-wider truncate" title={userCode ?? ""}>{emailShort}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-success" />
                  Cuenta anónima
                </div>
              </div>
            </div>
          </div>


          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground border border-transparent hover:border-destructive/30 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 group"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <div className="md:hidden border-b border-border px-4 py-3 flex items-center justify-between gap-2">
          <img src={logoAsset.url} alt="" className="h-[210px] w-[210px] object-contain" />
          {userCode && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium shrink-0">
              <Coins className="h-3.5 w-3.5" />
              <span>{credits}</span>
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center justify-end border-b border-border/60 px-6 py-3 gap-4">
          {userCode && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Coins className="h-4 w-4" />
              <span>{credits} créditos</span>
            </div>
          )}
          <LanguageSelector />
        </div>
        <PurchaseCard />
        {purchaseOpen ? (
          <div className="flex-1" />
        ) : (
          children
        )}
      </main>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comprar créditos</DialogTitle>
            <DialogDescription>
              Introduce el token de créditos que te ha proporcionado el administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="redeem-code">Código del token</Label>
            <Input
              id="redeem-code"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="font-mono"
            />
            {redeemError && <p className="text-xs text-destructive">{redeemError}</p>}
            {redeemSuccess && <p className="text-xs text-success">{redeemSuccess}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemOpen(false)}>Cerrar</Button>
            <Button onClick={onRedeem} disabled={redeemBusy || !redeemCode.trim()}>
              {redeemBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Canjear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
