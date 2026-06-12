import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  getMyUserCode,
  listDesktopTokens,
  revokeDesktopToken,
} from "@/lib/desktop-pairing.functions";
import { Monitor, Copy, Check, X, RefreshCw } from "lucide-react";
import i18n from "@/i18n";

export const Route = createFileRoute("/settings/desktop")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return { meta: [{ title: t("settingsDesktop.metaTitle") }] };
  },
  component: SettingsDesktop,
});

type TokenRow = {
  id: string;
  last4: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function SettingsDesktop() {
  const { t } = useTranslation();
  const getCodeFn = useServerFn(getMyUserCode);
  const listFn = useServerFn(listDesktopTokens);
  const revokeFn = useServerFn(revokeDesktopToken);

  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [tokensRes, codeRes] = await Promise.all([listFn(), getCodeFn()]);
      setTokens(tokensRes.tokens as TokenRow[]);
      setUserCode(codeRes.userCode);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const copy = async () => {
    if (!userCode) return;
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const revoke = async (token: string) => {
    if (!confirm(t("settingsDesktop.revokeConfirm"))) return;
    try {
      await revokeFn({ data: { token } });
      setTokens((tk) => tk.filter((x) => x.id !== token));
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Monitor className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">{t("settingsDesktop.title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t("settingsDesktop.subtitle")}</p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("settingsDesktop.yourCodeTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("settingsDesktop.yourCodeDesc")}</p>
          <div className="rounded-lg bg-background/60 border border-border p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              {t("settingsDesktop.codeLabel")}
            </div>
            <div
              className="font-mono text-4xl font-bold tracking-[0.2em] select-all"
              style={{ color: "var(--primary)" }}
            >
              {userCode ?? "—"}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copy} disabled={!userCode} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("settingsDesktop.copied") : t("settingsDesktop.copy")}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("settingsDesktop.devicesTitle")}</h2>
            <Button variant="ghost" size="sm" onClick={refresh} className="gap-2">
              <RefreshCw className="h-3 w-3" /> {t("settingsDesktop.refresh")}
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("settingsDesktop.loading")}</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("settingsDesktop.noDevices")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {tokens.map((tk) => (
                <li key={tk.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{tk.label} · ••••{tk.last4}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("settingsDesktop.paired", { when: new Date(tk.createdAt).toLocaleString() })}
                      {tk.lastUsedAt && <> · {t("settingsDesktop.lastUsed", { when: new Date(tk.lastUsedAt).toLocaleString() })}</>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => revoke(tk.id)} className="gap-1 text-destructive">
                    <X className="h-4 w-4" /> {t("settingsDesktop.revoke")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            {t("settingsDesktop.back")}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
