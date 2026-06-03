import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Base32 sin caracteres ambiguos (0/O/1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateCode(len = 8): string {
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * Genera un código de un solo uso (caduca a los 10 min) que el usuario
 * pegará en la app de escritorio para vincularla con su cuenta.
 */
export const createPairingCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = generateCode(8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin
      .from("desktop_pairing_codes")
      .insert({ code, user_id: context.userId, expires_at: expiresAt });
    if (error) throw new Error(error.message);
    return { code, expiresAt };
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
    // Devolvemos solo los últimos 4 chars del token como id visual.
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
