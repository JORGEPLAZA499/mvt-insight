import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LegalLocale = "es" | "en";

const LocaleSchema = z.enum(["es", "en"]).default("es");

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function buildSignaturePayload(parts: {
  userId: string;
  version: string;
  hash: string;
  acceptedAt: string;
  ip: string | null;
  ua: string | null;
  locale: string;
}): string {
  return [
    parts.userId,
    parts.version,
    parts.hash,
    parts.acceptedAt,
    parts.ip ?? "",
    parts.ua ?? "",
    parts.locale,
  ].join("|");
}

function signPayload(payload: string): string {
  const secret = process.env.LEGAL_SIGNING_SECRET;
  if (!secret) throw new Error("LEGAL_SIGNING_SECRET not configured");
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

async function assertAdminRole(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("accounts")
    .select("user_code")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.user_code !== "Admin") throw new Error("No autorizado");
}

export const getCurrentLegalDocument = createServerFn({ method: "GET" })
  .inputValidator((input: { locale?: LegalLocale } | undefined) =>
    z.object({ locale: LocaleSchema }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { getLegalDocument } = await import("./legal-text.server");
    const doc = getLegalDocument(data.locale as LegalLocale);
    return {
      version: doc.version,
      locale: doc.locale,
      title: doc.title,
      text: doc.text,
      hash: sha256(doc.text),
    };
  });

export const getMyLegalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { CURRENT_LEGAL_VERSION } = await import("./legal-text.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("legal_accepted_version")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const acceptedVersion = data?.legal_accepted_version ?? null;
    return {
      needsAcceptance: acceptedVersion !== CURRENT_LEGAL_VERSION,
      currentVersion: CURRENT_LEGAL_VERSION,
      acceptedVersion,
    };
  });

export const acceptLegalTerms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { version: string; hash: string; locale: LegalLocale }) =>
    z
      .object({
        version: z.string().min(1).max(64),
        hash: z.string().regex(/^[a-f0-9]{64}$/i),
        locale: LocaleSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { getLegalDocument, CURRENT_LEGAL_VERSION } = await import("./legal-text.server");
    if (data.version !== CURRENT_LEGAL_VERSION) {
      throw new Error("Versión de términos obsoleta. Recarga la página.");
    }
    const doc = getLegalDocument(data.locale);
    const expectedHash = sha256(doc.text);
    if (expectedHash.toLowerCase() !== data.hash.toLowerCase()) {
      throw new Error("La huella del documento no coincide. Reintenta.");
    }

    const ip = (() => {
      try {
        return getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        return null;
      }
    })();
    const ua = getRequestHeader("user-agent") ?? null;
    const acceptedAt = new Date().toISOString();

    const signature = signPayload(
      buildSignaturePayload({
        userId: context.userId,
        version: doc.version,
        hash: expectedHash,
        acceptedAt,
        ip,
        ua,
        locale: doc.locale,
      }),
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("record_legal_acceptance", {
      p_user_id: context.userId,
      p_document_version: doc.version,
      p_document_hash: expectedHash,
      p_document_text: doc.text,
      p_locale: doc.locale,
      p_ip: ip ?? "",
      p_user_agent: ua ?? "",
      p_signature: signature,
    });
    if (error) throw new Error(error.message);

    return { id: row as unknown as string, version: doc.version, acceptedAt };
  });

export type LegalAcceptanceDetail = {
  id: string;
  user_id: string;
  user_code: string | null;
  document_version: string;
  document_hash: string;
  document_text: string;
  locale: string;
  ip_address: string | null;
  user_agent: string | null;
  acceptance_method: string | null;
  signature: string;
  accepted_at: string;
  verified: boolean;
};

export const adminListLegalAcceptances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdminRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("legal_acceptances")
      .select("id, document_version, locale, ip_address, user_agent, acceptance_method, accepted_at")
      .eq("user_id", data.userId)
      .order("accepted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetLegalAcceptance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<LegalAcceptanceDetail> => {
    await assertAdminRole(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("legal_acceptances")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Comprobante no encontrado");

    let verified = false;
    try {
      const expected = signPayload(
        buildSignaturePayload({
          userId: row.user_id,
          version: row.document_version,
          hash: row.document_hash,
          acceptedAt: new Date(row.accepted_at).toISOString(),
          ip: row.ip_address,
          ua: row.user_agent,
          locale: row.locale,
        }),
      );
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(row.signature, "hex");
      verified = a.length === b.length && timingSafeEqual(a, b);
    } catch {
      verified = false;
    }

    return {
      id: row.id,
      user_id: row.user_id,
      user_code: row.user_code,
      document_version: row.document_version,
      document_hash: row.document_hash,
      document_text: row.document_text,
      locale: row.locale,
      ip_address: row.ip_address as string | null,
      user_agent: row.user_agent,
      acceptance_method: row.acceptance_method,
      signature: row.signature,
      accepted_at: row.accepted_at,
      verified,
    };
  });

export const adminGetUserLegalSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminRole(context.userId);
    const { CURRENT_LEGAL_VERSION } = await import("./legal-text.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("id, legal_accepted_version");
    if (error) throw new Error(error.message);
    return {
      currentVersion: CURRENT_LEGAL_VERSION,
      accounts: (data ?? []).map((a) => ({
        id: a.id,
        accepted_version: a.legal_accepted_version as string | null,
      })),
    };
  });
