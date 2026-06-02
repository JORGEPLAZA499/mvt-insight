import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, RefreshCw } from "lucide-react";
import {
  listAccounts,
  generateCreditToken,
  listCreditTokens,
  getSystemHealth,
} from "@/lib/admin.functions";

type AdminTab = "clients" | "tokens" | "health";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Panel de control" }] }),
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => {
    const t = search.tab;
    return {
      tab: t === "tokens" || t === "health" ? t : "clients",
    };
  },
  component: AdminPanel,
});

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function AdminPanel() {
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
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando acceso…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.25em] text-primary/80 mb-2">
            Administración
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Panel de control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de clientes, tokens de créditos y estado del sistema.
          </p>
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
  const fetchAccounts = useServerFn(listAccounts);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchAccounts();
      setRows(r);
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
        <CardTitle>Clientes ({rows.length})</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por código…"
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
                <th className="text-left px-3 py-2 font-medium">Nº usuario</th>
                <th className="text-right px-3 py-2 font-medium">Créditos</th>
                <th className="text-right px-3 py-2 font-medium">Recargas</th>
                <th className="text-right px-3 py-2 font-medium">Total recargado</th>
                <th className="text-left px-3 py-2 font-medium">Última recarga</th>
                <th className="text-left px-3 py-2 font-medium">Último acceso</th>
                <th className="text-left px-3 py-2 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{r.user_code}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.credits}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.recharges_count}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.total_recharged}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmt(r.last_recharge_at)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmt(r.last_login_at)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmt(r.created_at)}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TokensTab() {
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
      setError(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Generar token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="credits">Créditos</Label>
            <Input
              id="credits"
              type="number"
              min={1}
              value={credits}
              onChange={(e) => setCredits(Math.max(1, Number(e.target.value) || 0))}
            />
          </div>
          <Button onClick={onGenerate} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar token"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {lastCode && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Nuevo token
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
          <CardTitle>Tokens emitidos ({tokens.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Código</th>
                  <th className="text-right px-3 py-2 font-medium">Créditos</th>
                  <th className="text-left px-3 py-2 font-medium">Estado</th>
                  <th className="text-left px-3 py-2 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{t.code}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.credits}</td>
                    <td className="px-3 py-2">
                      {t.redeemed_at ? (
                        <span className="text-xs text-muted-foreground">
                          Canjeado por{" "}
                          <span className="font-mono text-foreground">
                            {t.redeemed_by_code ?? "—"}
                          </span>{" "}
                          el {fmt(t.redeemed_at)}
                        </span>
                      ) : (
                        <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{fmt(t.created_at)}</td>
                  </tr>
                ))}
                {!loading && tokens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                      No hay tokens.
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
    { label: "Estado de la BD", value: data?.ok ? "Operativo" : "—", sub: `ping ${data?.pingMs ?? "—"} ms` },
    { label: "Cuentas", value: data?.accountsCount ?? "—" },
    { label: "Créditos en circulación", value: data?.creditsInCirculation ?? "—" },
    { label: "Tokens disponibles", value: data?.tokensAvailable ?? "—", sub: `${data?.tokensRedeemed ?? 0} canjeados / ${data?.tokensTotal ?? 0} totales` },
    { label: "Último acceso", value: fmt(data?.lastLoginAt) },
    { label: "Última recarga", value: fmt(data?.lastRechargeAt) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Última comprobación: {fmt(data?.checkedAt)}
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
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
