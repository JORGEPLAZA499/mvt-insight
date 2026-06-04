import { createFileRoute } from "@tanstack/react-router";

function readBearer(request: Request): string | null {
  const h = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(dt_[a-f0-9]{20,})$/i.exec(h.trim());
  return m ? m[1] : null;
}

export const Route = createFileRoute("/api/public/desktop/whoami")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = readBearer(request);
        if (!token) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("desktop_tokens")
          .select("token, user_id, label, revoked_at")
          .eq("token", token)
          .maybeSingle();
        if (error || !row || row.revoked_at) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const [{ data: account }, { data: userRes }] = await Promise.all([
          supabaseAdmin.from("accounts").select("credits, user_code").eq("id", row.user_id).maybeSingle(),
          supabaseAdmin.auth.admin.getUserById(row.user_id),
        ]);

        return new Response(
          JSON.stringify({
            ok: true,
            email: userRes?.user?.email ?? null,
            label: row.label,
            credits: account?.credits ?? 0,
            userCode: account?.user_code ?? null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
