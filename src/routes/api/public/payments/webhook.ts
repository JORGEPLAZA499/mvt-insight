import { createFileRoute } from '@tanstack/react-router';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

async function handleCheckoutCompleted(session: any) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

  const userId = session.metadata?.userId as string | undefined;
  const creditsStr = session.metadata?.credits as string | undefined;
  const sessionId = session.id as string;

  if (!userId || !creditsStr) {
    console.error('[webhook] missing metadata', { userId, creditsStr, sessionId });
    return;
  }
  const credits = Number(creditsStr);
  if (!Number.isFinite(credits) || credits <= 0) {
    console.error('[webhook] invalid credits', creditsStr);
    return;
  }

  // Idempotent insert
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('credit_recharges')
    .insert({
      account_id: userId,
      amount: credits,
      stripe_session_id: sessionId,
      source: 'stripe',
    })
    .select('id')
    .maybeSingle();

  if (insErr) {
    // 23505 unique_violation → already processed
    if ((insErr as any).code === '23505') {
      console.log('[webhook] session already processed', sessionId);
      return;
    }
    throw new Error(insErr.message);
  }
  if (!inserted) {
    console.log('[webhook] no insert (likely duplicate)', sessionId);
    return;
  }

  // Increment account credits
  const { data: acc, error: accErr } = await supabaseAdmin
    .from('accounts')
    .select('credits')
    .eq('id', userId)
    .maybeSingle();
  if (accErr) throw new Error(accErr.message);

  const current = acc?.credits ?? 0;
  const { error: updErr } = await supabaseAdmin
    .from('accounts')
    .update({ credits: current + credits })
    .eq('id', userId);
  if (updErr) throw new Error(updErr.message);

  console.log('[webhook] credits added', { userId, credits, sessionId });
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('[webhook] invalid env query:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case 'checkout.session.completed':
              await handleCheckoutCompleted(event.data.object);
              break;
            default:
              console.log('[webhook] unhandled', event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error('[webhook] error', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
