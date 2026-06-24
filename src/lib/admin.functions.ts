import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("user_code")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.user_code !== "Admin") throw new Error("No autorizado");
}

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateTokenCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 12; i++) out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: accounts, error } = await supabaseAdmin
      .from("accounts")
      .select("id, user_code, credits, created_at, last_login_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: recharges } = await supabaseAdmin
      .from("credit_recharges")
      .select("account_id, amount, created_at");

    const totals = new Map<string, { total: number; count: number; last?: string }>();
    (recharges ?? []).forEach((r) => {
      const t = totals.get(r.account_id) ?? { total: 0, count: 0 };
      t.total += r.amount;
      t.count += 1;
      if (!t.last || r.created_at > t.last) t.last = r.created_at;
      totals.set(r.account_id, t);
    });

    return (accounts ?? []).map((a) => ({
      ...a,
      total_recharged: totals.get(a.id)?.total ?? 0,
      recharges_count: totals.get(a.id)?.count ?? 0,
      last_recharge_at: totals.get(a.id)?.last ?? null,
    }));
  });

export const generateCreditToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { credits: number }) =>
    z.object({ credits: z.number().int().min(1).max(1000000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    let code = "";
    for (let i = 0; i < 5; i++) {
      code = generateTokenCode();
      const { error } = await supabaseAdmin
        .from("credit_tokens")
        .insert({ code, credits: data.credits, created_by: context.userId });
      if (!error) return { code, credits: data.credits };
      if (!/duplicate|unique/i.test(error.message)) throw new Error(error.message);
    }
    throw new Error("No se pudo generar el token");
  });

export const listCreditTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: tokens, error } = await supabaseAdmin
      .from("credit_tokens")
      .select("id, code, credits, created_at, redeemed_by, redeemed_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const redeemerIds = Array.from(
      new Set((tokens ?? []).map((t) => t.redeemed_by).filter(Boolean) as string[]),
    );
    const codeMap = new Map<string, string>();
    if (redeemerIds.length) {
      const { data: accs } = await supabaseAdmin
        .from("accounts")
        .select("id, user_code")
        .in("id", redeemerIds);
      (accs ?? []).forEach((a) => codeMap.set(a.id, a.user_code));
    }
    return (tokens ?? []).map((t) => ({
      ...t,
      redeemed_by_code: t.redeemed_by ? codeMap.get(t.redeemed_by) ?? null : null,
    }));
  });

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const startedAt = Date.now();
    const [{ count: accountsCount }, { count: tokensTotal }, { count: tokensRedeemed }, { data: creditsSumRow }, { data: lastLogin }, { data: lastRecharge }] = await Promise.all([
      supabaseAdmin.from("accounts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("credit_tokens").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("credit_tokens")
        .select("id", { count: "exact", head: true })
        .not("redeemed_at", "is", null),
      supabaseAdmin.from("accounts").select("credits"),
      supabaseAdmin
        .from("accounts")
        .select("last_login_at")
        .order("last_login_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("credit_recharges")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const creditsInCirculation = (creditsSumRow ?? []).reduce(
      (acc: number, r: { credits: number }) => acc + (r.credits ?? 0),
      0,
    );
    return {
      ok: true,
      pingMs: Date.now() - startedAt,
      accountsCount: accountsCount ?? 0,
      tokensTotal: tokensTotal ?? 0,
      tokensRedeemed: tokensRedeemed ?? 0,
      tokensAvailable: (tokensTotal ?? 0) - (tokensRedeemed ?? 0),
      creditsInCirculation,
      lastLoginAt: lastLogin?.last_login_at ?? null,
      lastRechargeAt: lastRecharge?.created_at ?? null,
      checkedAt: new Date().toISOString(),
    };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("accounts")
      .select("id")
      .eq("user_code", "Admin")
      .maybeSingle();
    if (checkError) throw new Error(checkError.message);
    if (existing) throw new Error("Ya existe una cuenta Admin");

    const { error: updateError } = await supabaseAdmin
      .from("accounts")
      .update({ user_code: "Admin" })
      .eq("id", context.userId);
    if (updateError) throw new Error(updateError.message);

    return { success: true };
  });

/**
 * Sube un análisis ya parseado en cliente y lo asigna a la cuenta indicada
 * por `userCode`. Pensado para recuperar informes que se quedaron sin subir
 * (p. ej. caída de la app de escritorio). No consume créditos: el cliente ya
 * los pagó cuando se ejecutó el análisis original.
 */
export const adminUploadAnalysisForUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userCode: z.string().trim().min(1).max(64),
        device: z.string().trim().min(1).max(32),
        fileName: z.string().trim().min(1).max(512),
        fileSize: z.number().int().min(0).max(9_000_000_000_000),
        result: z.unknown(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);

    const { data: acc, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("id, user_code")
      .eq("user_code", data.userCode)
      .maybeSingle();
    if (accErr) throw new Error(accErr.message);
    if (!acc) return { ok: false as const, error: "ACCOUNT_NOT_FOUND" };

    const { data: row, error } = await supabaseAdmin
      .from("analyses")
      .insert({
        user_id: acc.id,
        device: data.device,
        file_name: data.fileName,
        file_size: data.fileSize,
        result: data.result as never,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true as const, analysisId: row.id, userCode: acc.user_code };
  });
