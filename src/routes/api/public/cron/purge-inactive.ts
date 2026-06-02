import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Borra cuentas inactivas (>10 días sin login).
// Llamado por pg_cron con header `apikey` = SUPABASE_ANON_KEY.
export const Route = createFileRoute("/api/public/cron/purge-inactive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
        const { data: stale, error } = await supabaseAdmin
          .from("accounts")
          .select("id")
          .lt("last_login_at", cutoff);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let deleted = 0;
        for (const row of stale ?? []) {
          // ON DELETE CASCADE en accounts.id eliminará la fila también
          const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(row.id);
          if (!delErr) deleted++;
        }

        return new Response(
          JSON.stringify({ ok: true, deleted, considered: stale?.length ?? 0 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
