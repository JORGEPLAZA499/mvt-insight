import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useMemo } from 'react';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createCreditsCheckout } from '@/lib/payments.functions';

export function StripeEmbeddedCheckoutInline({
  priceId,
  returnUrl,
}: {
  priceId: string;
  returnUrl: string;
}) {
  const options = useMemo(
    () => ({
      fetchClientSecret: async (): Promise<string> => {
        const result = await createCreditsCheckout({
          data: { priceId, returnUrl, environment: getStripeEnvironment() },
        });
        if ('error' in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error('Stripe no devolvió clientSecret');
        return result.clientSecret;
      },
    }),
    [priceId, returnUrl],
  );

  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
