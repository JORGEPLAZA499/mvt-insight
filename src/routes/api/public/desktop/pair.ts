import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  code: z.string().trim().length(8).regex(/^[A-Z2-9]+$/),
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

        const { data: codeRow, error: selErr } = await supabaseAdmin
          .from("desktop_pairing_codes")
          .select("code, user_id, expires_at, used_at")
          .eq("code", parsed.data.code)
          .maybeSingle();
        if (selErr) {
          return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        if (!codeRow || codeRow.used_at || new Date(codeRow.expires_at) < new Date()) {
          return new Response(JSON.stringify({ ok: false, error: "CODE_INVALID_OR_EXPIRED" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }

        // Marcar usado de forma atómica (solo si sigue sin usar).
        const { data: claimed, error: updErr } = await supabaseAdmin
          .from("desktop_pairing_codes")
          .update({ used_at: new Date().toISOString() })
          .eq("code", parsed.data.code)
          .is("used_at", null)
          .select("code")
          .maybeSingle();
        if (updErr || !claimed) {
          return new Response(JSON.stringify({ ok: false, error: "CODE_INVALID_OR_EXPIRED" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          });
        }

        const token = generateToken();
        const { error: insErr } = await supabaseAdmin
          .from("desktop_tokens")
          .insert({ token, user_id: codeRow.user_id, label: "Desktop" });
        if (insErr) {
          return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        // Email del usuario (best-effort).
        let email: string | null = null;
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(codeRow.user_id);
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
