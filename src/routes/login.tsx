import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/language-selector";
import logoAsset from "@/assets/logo.png.asset.json";
import { setSession } from "@/lib/mock-store";
import i18n from "@/i18n";

export const Route = createFileRoute("/login")({
  head: () => {
    const t = i18n.getFixedT(null, "translation");
    return { meta: [{ title: t("login.meta.title") }] };
  },
  component: Login,
});

function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSession({ email });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative bg-hero p-12 flex-col justify-between">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold">Spyware Forensic Analyzer</span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">{t("login.sideTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("login.sideDesc")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? t("login.titleLogin") : t("login.titleRegister")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("login.subtitle")}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.emailPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">{t("login.password")}</Label>
              <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              {mode === "login" ? t("login.submitLogin") : t("login.submitRegister")}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-6 text-xs text-muted-foreground hover:text-foreground">
            {mode === "login" ? t("login.toggleToRegister") : t("login.toggleToLogin")}
          </button>
          <p className="mt-8 text-[11px] text-muted-foreground">
            {t("login.demoNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
