import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/)),
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
          return new Response(JSON.stringify({ ok: false, error: "INVALID_CODE" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
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
          return new Response(JSON.stringify({ ok: false, error: "USER_CODE_NOT_FOUND" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }

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

        // Email del usuario (best-effort).
        let email: string | null = null;
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(account.id);
          email = u?.user?.email ?? null;
        } catch {}

        return new Response(
          JSON.stringify({ ok: true, token, email, label: "Desktop" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
