import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  createPairingCode,
  listDesktopTokens,
  revokeDesktopToken,
} from "@/lib/desktop-pairing.functions";
import { Monitor, Copy, Check, X, Clock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/settings/desktop")({
  head: () => ({ meta: [{ title: "App de escritorio — Spyware Forensic Analyzer" }] }),
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
  const createFn = useServerFn(createPairingCode);
  const listFn = useServerFn(listDesktopTokens);
  const revokeFn = useServerFn(revokeDesktopToken);

  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listFn();
      setTokens(r.tokens as TokenRow[]);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!code) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [code]);

  const remainingMs = code ? Math.max(0, new Date(code.expiresAt).getTime() - now) : 0;
  const remaining = Math.floor(remainingMs / 1000);
  const expired = code && remainingMs <= 0;

  const generate = async () => {
    setError(null);
    setGenerating(true);
    setCode(null);
    setCopied(false);
    try {
      const r = await createFn();
      setCode(r);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const revoke = async (token: string) => {
    if (!confirm("¿Revocar este dispositivo? Tendrá que vincularse de nuevo.")) return;
    try {
      await revokeFn({ data: { token } });
      setTokens((t) => t.filter((x) => x.id !== token));
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
            <h1 className="text-2xl font-semibold">App de escritorio</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Vincula MVT Insight Desktop para que los análisis se suban a tu cuenta automáticamente.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Vincular una nueva app</h2>
            <Button onClick={generate} disabled={generating} size="sm">
              {generating ? "Generando…" : code ? "Generar otro código" : "Generar código"}
            </Button>
          </div>
          {!code && (
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
              <li>Pulsa <strong>Generar código</strong>.</li>
              <li>Abre MVT Insight Desktop y pega el código en la pantalla de vinculación.</li>
              <li>El código caduca a los 10 minutos.</li>
            </ol>
          )}
          {code && (
            <div className="space-y-3">
              <div className="rounded-lg bg-background/60 border border-border p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Código de vinculación
                </div>
                <div
                  className="font-mono text-4xl font-bold tracking-[0.3em] select-all"
                  style={{ color: expired ? "var(--muted-foreground)" : "var(--primary)" }}
                >
                  {code.code}
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {expired ? (
                    <span className="text-destructive">Caducado — genera otro</span>
                  ) : (
                    <span>Caduca en {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={copy} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Dispositivos vinculados</h2>
            <Button variant="ghost" size="sm" onClick={refresh} className="gap-2">
              <RefreshCw className="h-3 w-3" /> Actualizar
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes ningún dispositivo vinculado todavía.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{t.label} · ••••{t.last4}</div>
                    <div className="text-xs text-muted-foreground">
                      Vinculado {new Date(t.createdAt).toLocaleString()}
                      {t.lastUsedAt && <> · Último uso {new Date(t.lastUsedAt).toLocaleString()}</>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => revoke(t.id)} className="gap-1 text-destructive">
                    <X className="h-4 w-4" /> Revocar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Volver al dashboard
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
