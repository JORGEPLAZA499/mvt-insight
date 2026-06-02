import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';

type CheckoutResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error('Invalid userId');

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createCreditsCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { priceId: string; returnUrl: string; environment: StripeEnv }) =>
    z
      .object({
        priceId: z.string().regex(/^credits_\d+$/),
        returnUrl: z.string().url(),
        environment: z.enum(['sandbox', 'live']),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const userId = context.userId as string;
      const email = (context.claims as any)?.email as string | undefined;

      const credits = Number(data.priceId.replace('credits_', ''));
      if (!Number.isFinite(credits) || credits <= 0) throw new Error('Invalid priceId');

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId], limit: 1 });
      if (!prices.data.length) throw new Error('Price not found');
      const stripePrice = prices.data[0];

      const productId =
        typeof stripePrice.product === 'string' ? stripePrice.product : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);

      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name },
        metadata: {
          userId,
          credits: String(credits),
        },
        // Stripe-managed payments: end-to-end tax/fraud/dispute handling (+3.5%).
        // Cast: the type def in the pinned SDK lags behind the API.
        ...({ managed_payments: { enabled: true } } as any),
      });

      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      console.error('[createCreditsCheckout]', error);
      return { error: getStripeErrorMessage(error) };
    }
  });
