import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Procesa un análisis MVT ya parseado en el cliente y lo guarda en la BD,
 * descontando 1 crédito de forma atómica. Si la cuenta no tiene créditos,
 * la transacción se cancela y no se guarda nada.
 *
 * Es la única vía legítima para crear un registro en la tabla `analyses`.
 */
export const processAndStoreAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        device: z.string().trim().min(1).max(32),
        fileName: z.string().trim().min(1).max(512),
        fileSize: z.number().int().min(0).max(2_000_000_000),
        // El resultado del parser MVT. Lo guardamos tal cual (jsonb).
        result: z.unknown(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: rpc, error } = await supabaseAdmin.rpc(
      "consume_credit_and_insert_analysis",
      {
        p_user_id: context.userId,
        p_device: data.device,
        p_file_name: data.fileName,
        p_file_size: data.fileSize,
        p_result: data.result as never,
      },
    );

    if (error) {
      const msg = error.message || "";
      if (msg.includes("INSUFFICIENT_CREDITS")) {
        return { ok: false as const, error: "INSUFFICIENT_CREDITS" };
      }
      if (msg.includes("ACCOUNT_NOT_FOUND")) {
        return { ok: false as const, error: "ACCOUNT_NOT_FOUND" };
      }
      throw new Error(msg || "No se pudo registrar el análisis");
    }

    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    if (!row?.analysis_id) {
      throw new Error("Respuesta inválida del servidor");
    }

    return {
      ok: true as const,
      analysisId: row.analysis_id as string,
      remainingCredits: (row.remaining_credits ?? 0) as number,
    };
  });

/**
 * Devuelve los análisis del usuario actual (más recientes primero).
 */
export const listMyAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("analyses")
      .select("id, device, file_name, file_size, result, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { analyses: data ?? [] };
  });

export const getAnalysisById = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("analyses")
      .select("id, device, file_name, file_size, result, created_at, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.user_id !== context.userId) return { analysis: null };
    return { analysis: row };
  });
