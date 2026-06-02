import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { claimAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/setup-admin")({
  head: () => ({ meta: [{ title: "Configurar Admin" }] }),
  component: SetupAdmin,
});

function SetupAdmin() {
  const navigate = useNavigate();
  const claim = useServerFn(claimAdmin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      await claim();
      setDone(true);
      setTimeout(() => navigate({ to: "/admin" }), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Configurar cuenta Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta página convierte tu cuenta actualmente conectada en el
            administrador del sistema. Solo funciona una vez: si ya existe un
            Admin, fallará.
          </p>
          <p className="text-sm">
            Asegúrate de haber iniciado sesión con la cuenta que quieres usar
            como Admin antes de continuar.
          </p>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
              {error}
            </div>
          )}
          {done ? (
            <div className="text-sm text-green-600">
              Listo. Redirigiendo al panel de administración…
            </div>
          ) : (
            <Button onClick={onClaim} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Convertir mi cuenta en Admin
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
