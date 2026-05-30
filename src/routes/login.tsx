import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSession } from "@/lib/mock-store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Iniciar sesión — Spyware Forensic Analyzer" }] }),
  component: Login,
});

function Login() {
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
          <h2 className="text-3xl font-semibold tracking-tight">Privacidad por diseño.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Tus archivos se procesan en un entorno aislado y pueden eliminarse de forma definitiva en cualquier momento.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accede a tus análisis e informes.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@dominio.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Contraseña</Label>
              <Input id="pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              {mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-6 text-xs text-muted-foreground hover:text-foreground">
            {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
          <p className="mt-8 text-[11px] text-muted-foreground">
            Demo: cualquier correo y contraseña inicia sesión. La autenticación real se conectará al backend.
          </p>
        </div>
      </div>
    </div>
  );
}
