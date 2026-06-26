import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

function readBearer(request: Request): string | null {
  const h = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(dt_[a-f0-9]{20,})$/i.exec(h.trim());
  return m ? m[1] : null;
}

const Body = z.object({
  device: z.string().trim().min(1).max(32),
  fileName: z.string().trim().min(1).max(512),
  // fileSize es metadato informativo del ZIP local; el cuerpo del POST solo
  // contiene el JSON `result`, así que no necesitamos un tope estricto aquí.
  // Permitimos hasta ~9 TB (sigue cabiendo en int) para soportar teléfonos
  // con miles de fotos/vídeos cuyo ZIP local puede superar los 2 GB.
  fileSize: z.number().int().min(0).max(9_000_000_000_000),
  result: z.unknown(),
});

export const Route = createFileRoute("/api/public/desktop/submit-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = readBearer(request);
        if (!token) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        let body: unknown;
        try { body = await request.json(); } catch {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_BODY" }), {
            status: 400, headers: { "content-type": "application/json" },
          });
        }
        const parsed = Body.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ ok: false, error: "INVALID_BODY" }), {
            status: 400, headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error: selErr } = await supabaseAdmin
          .from("desktop_tokens")
          .select("token, user_id, revoked_at")
          .eq("token", token)
          .maybeSingle();
        if (selErr || !row || row.revoked_at) {
          return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
            status: 401, headers: { "content-type": "application/json" },
          });
        }

        await supabaseAdmin
          .from("desktop_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("token", token);

        const { data: rpc, error: rpcErr } = await supabaseAdmin.rpc(
          "consume_credit_and_insert_analysis",
          {
            p_user_id: row.user_id,
            p_device: parsed.data.device,
            p_file_name: parsed.data.fileName,
            p_file_size: parsed.data.fileSize,
            p_result: parsed.data.result as never,
          },
        );
        if (rpcErr) {
          const msg = rpcErr.message || "";
          console.error("desktop submit-analysis RPC failed", {
            code: rpcErr.code,
            message: rpcErr.message,
            details: rpcErr.details,
            hint: rpcErr.hint,
            userId: row.user_id,
            device: parsed.data.device,
            fileName: parsed.data.fileName,
            fileSize: parsed.data.fileSize,
            contentLength: request.headers.get("content-length"),
          });
          if (msg.includes("INSUFFICIENT_CREDITS")) {
            return new Response(JSON.stringify({ ok: false, error: "INSUFFICIENT_CREDITS" }), {
              status: 402, headers: { "content-type": "application/json" },
            });
          }
          if (msg.includes("ACCOUNT_NOT_FOUND")) {
            return new Response(JSON.stringify({ ok: false, error: "ACCOUNT_NOT_FOUND" }), {
              status: 404, headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), {
            status: 500, headers: { "content-type": "application/json" },
          });
        }
        const r = Array.isArray(rpc) ? rpc[0] : rpc;
        return new Response(
          JSON.stringify({
            ok: true,
            analysisId: r?.analysis_id,
            remainingCredits: r?.remaining_credits ?? 0,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
