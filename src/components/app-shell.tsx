import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  LayoutDashboard,
  UploadCloud,
  FileSearch,
  History,
  LogOut,
  Sparkles,
  Languages,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSession, setSession, getAnalyses } from "@/lib/mock-store";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [session, setSessionState] = useState<{ email: string } | null>(null);
  const [historyCount, setHistoryCount] = useState(0);

  const nav = [
    { to: "/dashboard", label: t("shell.nav.dashboard"), icon: LayoutDashboard, hint: t("shell.nav.dashboardHint") },
    { to: "/upload", label: t("shell.nav.newAnalysis"), icon: UploadCloud, hint: t("shell.nav.uploadHint"), highlight: true },
    { to: "/reports", label: t("shell.nav.reports"), icon: FileSearch, hint: t("shell.nav.reportsHint") },
    { to: "/history", label: t("shell.nav.history"), icon: History, hint: t("shell.nav.historyHint") },
  ];

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    setSessionState(s);
    setHistoryCount(getAnalyses().length);
  }, [navigate, path]);

  const initial = session?.email?.[0]?.toUpperCase() ?? "U";
  const emailShort = session?.email?.split("@")[0] ?? "usuario";

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
          className="relative flex items-center gap-3 px-5 py-5 group"
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 rounded-lg blur-md opacity-70 group-hover:opacity-100 transition-opacity"
              style={{ background: "var(--gradient-primary, linear-gradient(135deg, var(--primary), var(--primary)))" }}
            />
            <div className="relative h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">
              Spyware Forensic
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
              Analyzer
            </div>
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
            Principal
          </div>
          <nav className="space-y-1">
            {nav.map((n) => {
              const active = path.startsWith(n.to);
              const Icon = n.icon;
              const badge =
                n.to === "/history" && historyCount > 0
                  ? String(historyCount)
                  : n.highlight && !active
                    ? "new"
                    : null;
              return (
                <Link
                  key={n.to}
                  to={n.to}
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
                          new
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
                <div className="text-sm font-medium truncate">{emailShort}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-success" />
                  En línea
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setSession(null);
              navigate({ to: "/login" });
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground border border-transparent hover:border-destructive/30 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 group"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <div className="md:hidden border-b border-border px-4 py-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Spyware Forensic Analyzer</span>
        </div>
        {children}
      </main>
    </div>
  );
}
