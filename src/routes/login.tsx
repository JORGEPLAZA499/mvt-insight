import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Copy, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/language-selector";
import { PasswordField } from "@/components/password-field";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { scorePassword } from "@/lib/password-strength";
import { createSecureBuffer } from "@/lib/secure-string";
import logoAsset from "@/assets/logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import {
  registerAccount,
  resolveLoginEmail,
  touchLastLogin,
} from "@/lib/account.functions";
import i18n from "@/i18n";

export const Route = createFileRoute("/login")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return { meta: [{ title: t("login.meta.title") }] };
  },
  validateSearch: (search: Record<string, unknown>) => {
    const mode = search.mode === "register" ? "register" : "login";
    return { mode };
  },
  component: Login,
});

const CODE_RE = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/;

function formatCodeInput(raw: string): string {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g, "")
    .slice(0, 9);
  const parts = [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 9)].filter(Boolean);
  return parts.join("-");
}

function validatePassword(pwd: string): string | null {
  if (pwd.length < 8) return "Mínimo 8 caracteres.";
  if (!/[a-z]/.test(pwd)) return "Debe incluir una minúscula.";
  if (!/[A-Z]/.test(pwd)) return "Debe incluir una mayúscula.";
  if (!/[0-9]/.test(pwd)) return "Debe incluir un número.";
  return null;
}

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useServerFn(registerAccount);
  const resolveEmail = useServerFn(resolveLoginEmail);
  const touch = useServerFn(touchLastLogin);

  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado post-registro
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (!CODE_RE.test(normalized)) {
      setError("El código debe tener el formato XXX-XXX-XXX.");
      return;
    }
    if (!password) {
      setError("Introduce tu contraseña.");
      return;
    }
    setBusy(true);
    try {
      const { email } = await resolveEmail({ data: { code: normalized } });
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signErr || !data.user) {
        throw new Error("Código o contraseña incorrectos.");
      }
      await touch({ data: { userId: data.user.id } });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (scorePassword(password).level === "low") {
      setError("La contraseña es demasiado débil. Mejora la seguridad antes de continuar.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { code: newCode, email } = await register({ data: { password } });
      // Inicia sesión automáticamente para que el usuario quede autenticado
      await supabase.auth.signInWithPassword({ email, password });
      setIssuedCode(newCode);
    } catch (err: any) {
      setError(err?.message || "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  };

  const registerBlocked =
    !password ||
    password !== confirm ||
    scorePassword(password).level === "low";

  const copyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
    } catch {
      /* noop */
    }
  };

  // Pantalla post-registro: muestra el código una sola vez
  if (issuedCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-7 w-7 text-success" />
              <h1 className="text-2xl font-semibold tracking-tight">Cuenta activada</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Guarda en un lugar seguro tu <b>código de usuario</b>. Es la única forma de
              acceder al panel de control.
            </p>

            <div className="mt-6 rounded-xl bg-gradient-primary p-px shadow-glow">
              <div className="rounded-[11px] bg-background px-6 py-5 text-center">
                <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  Tu código
                </div>
                <div className="font-mono text-3xl sm:text-4xl tracking-[0.2em] font-semibold text-primary select-all">
                  {issuedCode}
                </div>
              </div>
            </div>

            <button
              onClick={copyCode}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent transition"
            >
              <Copy className="h-4 w-4" />
              Copiar código
            </button>

            <div className="mt-6 flex gap-3 items-start rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">
                Si pierdes este código, <b>nadie —ni siquiera la organización—</b> podrá
                acceder a tu cuenta ni recuperarla. Esto garantiza tu privacidad.
                <br />
                <span className="text-muted-foreground">
                  Si no inicias sesión durante 10 días, la cuenta se elimina automáticamente.
                </span>
              </p>
            </div>

            <label className="mt-5 flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>He guardado mi código en un lugar seguro.</span>
            </label>

            <Button
              type="button"
              disabled={!acknowledged}
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              Continuar al panel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative bg-hero p-12 flex-col items-center">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative flex-1 flex items-center justify-center w-full">
          <Link to="/">
            <img src={logoAsset.url} alt="" className="h-[300px] w-[300px] object-contain" />
          </Link>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">{t("login.sideTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t("login.sideDesc")}</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Acceder con tu código" : "Crear cuenta anónima"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login"
              ? "Introduce tu código de usuario y contraseña."
              : "Sin email. El sistema generará tu código de usuario único."}
          </p>

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de usuario</Label>
                <Input
                  id="code"
                  required
                  autoComplete="username"
                  value={code}
                  onChange={(e) => setCode(formatCodeInput(e.target.value))}
                  placeholder="XXX-XXX-XXX"
                  className="font-mono tracking-[0.2em] uppercase"
                  maxLength={11}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">Contraseña</Label>
                <PasswordField
                  id="pwd"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {busy ? "Accediendo…" : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pwd">Contraseña</Label>
                <PasswordField
                  id="pwd"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Mín 8 · May + min + número"
                />
                <PasswordStrengthMeter password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd2">Repite la contraseña</Label>
                <PasswordField
                  id="pwd2"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="••••••••"
                />
                {confirm && confirm !== password && (
                  <p className="text-[11px] text-destructive">Las contraseñas no coinciden.</p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Al crear la cuenta el sistema generará un código único{" "}
                <span className="font-mono">XXX-XXX-XXX</span>. Será tu único identificador:
                guárdalo en un lugar seguro porque <b>no se puede recuperar</b>.
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={busy || registerBlocked}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {busy ? "Creando…" : "Crear cuenta"}
              </Button>
            </form>
          )}

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setPassword("");
              setConfirm("");
            }}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Crea una"
              : "¿Ya tienes código? Inicia sesión"}
          </button>

          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            Privacidad por diseño: no pedimos email ni datos personales. Si no inicias
            sesión durante <b>10 días</b>, la cuenta se elimina automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
