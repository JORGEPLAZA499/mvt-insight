import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("credits")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { credits: data?.credits ?? 0 };
  });

export const redeemCreditToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) =>
    z
      .object({ code: z.string().trim().min(4).max(64) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const code = data.code.toUpperCase();
    const { data: token, error } = await supabaseAdmin
      .from("credit_tokens")
      .select("id, credits, redeemed_at")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!token) throw new Error("Token inválido");
    if (token.redeemed_at) throw new Error("Este token ya fue canjeado");

    // Mark token as redeemed (atomic-ish via conditional update)
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("credit_tokens")
      .update({ redeemed_by: context.userId, redeemed_at: new Date().toISOString() })
      .eq("id", token.id)
      .is("redeemed_at", null)
      .select("id")
      .maybeSingle();
    if (updErr) throw new Error(updErr.message);
    if (!updated) throw new Error("Este token ya fue canjeado");

    // Insert recharge record
    await supabaseAdmin.from("credit_recharges").insert({
      account_id: context.userId,
      amount: token.credits,
      token_id: token.id,
    });

    // Increment credits
    const { data: acc } = await supabaseAdmin
      .from("accounts")
      .select("credits")
      .eq("id", context.userId)
      .maybeSingle();
    const current = acc?.credits ?? 0;
    const { error: incErr } = await supabaseAdmin
      .from("accounts")
      .update({ credits: current + token.credits })
      .eq("id", context.userId);
    if (incErr) throw new Error(incErr.message);

    return { credits_added: token.credits, new_balance: current + token.credits };
  });
