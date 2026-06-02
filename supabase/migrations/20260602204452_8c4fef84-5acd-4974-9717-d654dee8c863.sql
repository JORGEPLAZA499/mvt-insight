ALTER TABLE public.credit_recharges
  ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'token';

GRANT ALL ON public.credit_recharges TO service_role;
GRANT ALL ON public.accounts TO service_role;