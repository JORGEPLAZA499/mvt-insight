-- 1) Add credits column to accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;

-- Helper function: is the calling user the Admin account?
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = _user_id AND user_code = 'Admin'
  )
$$;

-- Admin can view all accounts
DROP POLICY IF EXISTS "Admin can view all accounts" ON public.accounts;
CREATE POLICY "Admin can view all accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2) credit_tokens
CREATE TABLE IF NOT EXISTS public.credit_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  credits integer NOT NULL CHECK (credits > 0),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by uuid,
  redeemed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.credit_tokens TO authenticated;
GRANT ALL ON public.credit_tokens TO service_role;

ALTER TABLE public.credit_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all tokens"
ON public.credit_tokens
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can insert tokens"
ON public.credit_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 3) credit_recharges
CREATE TABLE IF NOT EXISTS public.credit_recharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  token_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_recharges_account ON public.credit_recharges(account_id);

GRANT SELECT ON public.credit_recharges TO authenticated;
GRANT ALL ON public.credit_recharges TO service_role;

ALTER TABLE public.credit_recharges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recharges"
ON public.credit_recharges
FOR SELECT
TO authenticated
USING (account_id = auth.uid() OR public.is_admin(auth.uid()));
