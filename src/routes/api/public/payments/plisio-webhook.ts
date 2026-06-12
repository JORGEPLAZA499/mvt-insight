import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";

function verifyPlisioHash(payload: Record<string, unknown>, apiKey: string): boolean {
  const { verify_hash, ...rest } = payload as { verify_hash?: string } & Record<string, unknown>;
  if (!verify_hash || typeof verify_hash !== "string") return false;

  // Plisio: ksort + serialize then HMAC-SHA1 with API key.
  // Since we don't have PHP serialize, Plisio docs allow JSON sorted serialization
  // for JSON callbacks (?json=true). We replicate by sorting keys and JSON.stringify.
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(rest).sort()) {
    sorted[k] = (rest as Record<string, unknown>)[k];
  }
  const serialized = JSON.stringify(sorted);
  const expected = createHmac("sha1", apiKey).update(serialized).digest("hex");
  return expected === verify_hash;
}

async function handleCompleted(payload: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const orderNumber = String(payload.order_number ?? "");
  if (!orderNumber) {
    console.error("[plisio-webhook] missing order_number");
    return;
  }

  const { data: invoice, error: selErr } = await supabaseAdmin
    .from("plisio_invoices")
    .select("id, account_id, credits, processed_at")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (selErr) {
    console.error("[plisio-webhook] select error", selErr);
    return;
  }
  if (!invoice) {
    console.warn("[plisio-webhook] unknown order_number", orderNumber);
    return;
  }
  if (invoice.processed_at) {
    console.log("[plisio-webhook] already processed", orderNumber);
    return;
  }

  const sessionId = `plisio_${orderNumber}`;

  // Idempotent insert by stripe_session_id unique constraint
  const { error: insErr } = await supabaseAdmin.from("credit_recharges").insert({
    account_id: invoice.account_id,
    amount: invoice.credits,
    stripe_session_id: sessionId,
    source: "plisio",
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      console.log("[plisio-webhook] recharge already inserted", sessionId);
    } else {
      throw new Error(insErr.message);
    }
  } else {
    // Increment account credits
    const { data: acc, error: accErr } = await supabaseAdmin
      .from("accounts")
      .select("credits")
      .eq("id", invoice.account_id)
      .maybeSingle();
    if (accErr) throw new Error(accErr.message);
    const current = acc?.credits ?? 0;
    const { error: updErr } = await supabaseAdmin
      .from("accounts")
      .update({ credits: current + invoice.credits })
      .eq("id", invoice.account_id);
    if (updErr) throw new Error(updErr.message);
    console.log("[plisio-webhook] credits added", { userId: invoice.account_id, credits: invoice.credits });
  }

  await supabaseAdmin
    .from("plisio_invoices")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("id", invoice.id);
}

export const Route = createFileRoute("/api/public/payments/plisio-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.PLISIO_API_KEY;
        if (!apiKey) {
          console.error("[plisio-webhook] missing PLISIO_API_KEY");
          return new Response("Server misconfigured", { status: 500 });
        }
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (!verifyPlisioHash(payload, apiKey)) {
          console.error("[plisio-webhook] invalid verify_hash", { order: payload.order_number });
          return new Response("Invalid signature", { status: 401 });
        }

        const status = String(payload.status ?? "");
        try {
          if (status === "completed" || status === "mismatch") {
            await handleCompleted(payload);
          } else {
            console.log("[plisio-webhook] ignored status", status, payload.order_number);
          }
          return Response.json({ status: "success" });
        } catch (e) {
          console.error("[plisio-webhook] error", e);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
