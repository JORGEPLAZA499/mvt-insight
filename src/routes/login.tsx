import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
  const trimmed = raw.trim();
  if (/^[A-Za-z]+$/.test(trimmed)) {
    return trimmed.toUpperCase().slice(0, 20);
  }
  const clean = raw
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/g, "")
    .slice(0, 9);
  const parts = [clean.slice(0, 3), clean.slice(3, 6), clean.slice(6, 9)].filter(Boolean);
  return parts.join("-");
}

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useServerFn(registerAccount);
  const resolveEmail = useServerFn(resolveLoginEmail);
  const touch = useServerFn(touchLastLogin);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return t("loginExt.errors.pwdMin");
    if (!/[a-z]/.test(pwd)) return t("loginExt.errors.pwdLower");
    if (!/[A-Z]/.test(pwd)) return t("loginExt.errors.pwdUpper");
    if (!/[0-9]/.test(pwd)) return t("loginExt.errors.pwdNumber");
    return null;
  };

  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwdBuf = useRef(createSecureBuffer());
  const confirmBuf = useRef(createSecureBuffer());

  const syncBuffer = (
    buf: React.MutableRefObject<ReturnType<typeof createSecureBuffer>>,
    next: string,
  ) => {
    buf.current.clear();
    buf.current.append(next);
  };

  useEffect(() => {
    const p = pwdBuf.current;
    const c = confirmBuf.current;
    return () => {
      p.clear();
      c.clear();
    };
  }, []);

  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    const isWord = /^[A-Za-z]{2,20}$/.test(trimmed);
    const normalized = isWord ? trimmed.toUpperCase() : trimmed.toUpperCase();
    if (!isWord && !CODE_RE.test(normalized)) {
      setError(t("loginExt.errors.format"));
      return;
    }
    if (!password) {
      setError(t("loginExt.errors.enterPwd"));
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
        throw new Error(t("loginExt.errors.bad"));
      }
      await touch({ data: { userId: data.user.id } });
      pwdBuf.current.clear();
      setPassword("");
      const { data: acc } = await supabase
        .from("accounts")
        .select("user_code")
        .eq("id", data.user.id)
        .maybeSingle();
      navigate({ to: acc?.user_code === "Admin" ? "/admin" : "/dashboard" });
    } catch (err: any) {
      setError(err?.message || t("loginExt.errors.generic"));
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
      setError(t("loginExt.errors.weak"));
      return;
    }
    if (password !== confirm) {
      setError(t("loginExt.mismatch"));
      return;
    }
    setBusy(true);
    try {
      const { code: newCode, email } = await register({ data: { password } });
      await supabase.auth.signInWithPassword({ email, password });
      pwdBuf.current.clear();
      confirmBuf.current.clear();
      setPassword("");
      setConfirm("");
      setIssuedCode(newCode);
    } catch (err: any) {
      setError(err?.message || t("loginExt.errors.signupFail"));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
    } catch {
      /* noop */
    }
  };

  if (issuedCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-7 w-7 text-success" />
              <h1 className="text-2xl font-semibold tracking-tight">{t("loginExt.activated")}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              <Trans i18nKey="loginExt.savePwd" components={{ b: <b /> }} />
            </p>

            <div className="mt-6 rounded-xl bg-gradient-primary p-px shadow-glow">
              <div className="rounded-[11px] bg-background px-6 py-5 text-center">
                <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
                  {t("loginExt.yourCode")}
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
              {t("loginExt.copyCode")}
            </button>

            <div className="mt-6 flex gap-3 items-start rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">
                <Trans i18nKey="loginExt.lossWarn" components={{ b: <b /> }} />
                <br />
                <span className="text-muted-foreground">{t("loginExt.autoDelete")}</span>
              </p>
            </div>

            <label className="mt-5 flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>{t("loginExt.ack")}</span>
            </label>

            <Button
              type="button"
              disabled={!acknowledged}
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {t("loginExt.continueToPanel")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex sticky top-0 h-screen relative bg-hero p-12 flex-col items-center">
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

      <div className="flex items-center justify-center p-6 relative min-h-screen">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? t("loginExt.loginTitle") : t("loginExt.registerTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? t("loginExt.loginSubtitle") : t("loginExt.registerSubtitle")}
          </p>

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t("loginExt.codeLabel")}</Label>
                <Input
                  id="code"
                  required
                  autoComplete="username"
                  value={code}
                  onChange={(e) => setCode(formatCodeInput(e.target.value))}
                  placeholder="XXX-XXX-XXX"
                  className="font-mono tracking-[0.2em] uppercase"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">{t("loginExt.pwdLabel")}</Label>
                <PasswordField
                  id="pwd"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(v) => { setPassword(v); syncBuffer(pwdBuf, v); }}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                {busy ? t("loginExt.signingIn") : t("loginExt.signIn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="mt-8 space-y-4">
              {registerStep === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pwd">{t("loginExt.pwdLabel")}</Label>
                    <PasswordField
                      id="pwd"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(v) => { setPassword(v); syncBuffer(pwdBuf, v); }}
                      placeholder={t("loginExt.pwdHint")}
                    />
                    <PasswordStrengthMeter password={password} />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button
                    type="button"
                    disabled={busy || !password || scorePassword(password).level === "low"}
                    onClick={() => {
                      const pwdErr = validatePassword(password);
                      if (pwdErr) {
                        setError(pwdErr);
                        return;
                      }
                      if (scorePassword(password).level === "low") {
                        setError(t("loginExt.errors.weak"));
                        return;
                      }
                      setError(null);
                      setRegisterStep(2);
                    }}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  >
                    {t("loginExt.continue")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pwd2">{t("loginExt.repeatPwd")}</Label>
                    <PasswordField
                      id="pwd2"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(v) => { setConfirm(v); syncBuffer(confirmBuf, v); }}
                      placeholder="••••••••"
                    />
                    {confirm && confirm !== password && (
                      <p className="text-[11px] text-destructive">{t("loginExt.mismatch")}</p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <Trans i18nKey="loginExt.codeIntro" components={[<span className="font-mono" />, <b />]} />
                  </p>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button
                    type="submit"
                    disabled={busy || !password || password !== confirm || scorePassword(password).level === "low"}
                    className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                  >
                    {busy ? t("loginExt.creating") : t("loginExt.createAccount")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setRegisterStep(1); setError(null); setConfirm(""); confirmBuf.current.clear(); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("loginExt.backToPwd")}
                  </button>
                </>
              )}
            </form>
          )}

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setPassword("");
              setConfirm("");
              setRegisterStep(1);
            }}
            className="mt-6 text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? t("loginExt.toggleRegister") : t("loginExt.toggleLogin")}
          </button>

          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
            <Trans i18nKey="loginExt.privacyNote" components={{ b: <b /> }} />
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            {t("loginExt.virtualNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
