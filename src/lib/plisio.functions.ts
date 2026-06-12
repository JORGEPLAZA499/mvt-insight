import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ANALYSIS_COST = 98;

export const createPlisioInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { credits: number }) =>
    z
      .object({
        credits: z
          .number()
          .int()
          .min(ANALYSIS_COST)
          .max(ANALYSIS_COST * 10)
          .refine((v) => v % ANALYSIS_COST === 0, "credits must be a multiple of 98"),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const apiKey = process.env.PLISIO_API_KEY;
    if (!apiKey) throw new Error("PLISIO_API_KEY no configurada");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const credits = data.credits;
    const amountEur = credits; // 1 crédito = 1 €
    const analyses = credits / ANALYSIS_COST;
    const orderNumber = crypto.randomUUID();

    // Get user email for the invoice
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userData?.user?.email;

    // Origin for callbacks/success
    const origin = "https://spyware.rpjsoftware.com";

    const params = new URLSearchParams({
      source_currency: "EUR",
      source_amount: amountEur.toFixed(2),
      order_number: orderNumber,
      order_name: `Créditos análisis forense (x${analyses})`,
      callback_url: `${origin}/api/public/payments/plisio-webhook?json=true`,
      success_callback_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancel`,
      api_key: apiKey,
    });
    if (email) params.set("email", email);

    const resp = await fetch(`https://api.plisio.net/api/v1/invoices/new?${params.toString()}`, {
      method: "GET",
    });
    const json = (await resp.json()) as {
      status: string;
      data?: { invoice_url?: string; txn_id?: string; id?: string };
      message?: string;
    };
    if (json.status !== "success" || !json.data?.invoice_url) {
      console.error("[plisio] create invoice failed", json);
      throw new Error(json.message || "No se pudo crear la factura de Plisio");
    }

    // Pre-record invoice
    const { error: insErr } = await supabaseAdmin.from("plisio_invoices").insert({
      account_id: context.userId,
      order_number: orderNumber,
      invoice_id: json.data.txn_id ?? json.data.id ?? null,
      credits,
      amount_eur: amountEur,
      status: "pending",
    });
    if (insErr) {
      console.error("[plisio] insert pending failed", insErr);
      // No bloqueamos; el webhook puede reintentar contra order_number único.
    }

    return { invoice_url: json.data.invoice_url };
  });
