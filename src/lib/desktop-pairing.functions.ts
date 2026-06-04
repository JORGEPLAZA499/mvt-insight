import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Devuelve el user_code de la cuenta del usuario autenticado. */
export const getMyUserCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("user_code")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { userCode: data?.user_code ?? null };
  });

/** Lista los tokens de escritorio activos del usuario. */
export const listDesktopTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("desktop_tokens")
      .select("token, label, created_at, last_used_at, revoked_at")
      .eq("user_id", context.userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      tokens: (data ?? []).map((t) => ({
        id: t.token,
        last4: t.token.slice(-4),
        label: t.label,
        createdAt: t.created_at,
        lastUsedAt: t.last_used_at,
      })),
    };
  });

/** Revoca un token de escritorio. */
export const revokeDesktopToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10).max(64) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("desktop_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", data.token)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
