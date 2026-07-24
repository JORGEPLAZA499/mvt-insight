import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const Body = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/)),
  password: z.string().min(1).max(256),
});

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return (
    "dt_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

export const Route = createFileRoute("/api/public/desktop/pair")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_BODY" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const parsed = Body.safeParse(body);
        if (!parsed.success) {
          const missingPassword = !!(body && typeof body === "object" && !("password" in (body as object)));
          return new Response(
            JSON.stringify({ ok: false, error: missingPassword ? "PASSWORD_REQUIRED" : "INVALID_CODE" }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Buscar la cuenta por user_code
        const { data: account, error: selErr } = await supabaseAdmin
          .from("accounts")
          .select("id, user_code")
          .eq("user_code", parsed.data.code)
          .maybeSingle();
        if (selErr) {
          return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        if (!account) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_CREDENTIALS" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        // Obtener el email interno del usuario para verificar la contraseña
        let email: string | null = null;
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(account.id);
          email = u?.user?.email ?? null;
        } catch {}
        if (!email) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_CREDENTIALS" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        // Verificar contraseña con un cliente stateless (sin persistir sesión)
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const verifier = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: signIn, error: signErr } = await verifier.auth.signInWithPassword({
          email,
          password: parsed.data.password,
        });
        if (signErr || !signIn?.user || signIn.user.id !== account.id) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_CREDENTIALS" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        // Cerrar la sesión emitida por la verificación para no dejar refresh tokens vivos
        try { await verifier.auth.signOut(); } catch {}

        const token = generateToken();
        const { error: insErr } = await supabaseAdmin
          .from("desktop_tokens")
          .insert({ token, user_id: account.id, label: "Desktop" });
        if (insErr) {
          return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, token, email, label: "Desktop", userCode: account.user_code }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
