CREATE TABLE public.plisio_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  invoice_id text,
  credits integer NOT NULL CHECK (credits > 0),
  amount_eur numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT ON public.plisio_invoices TO authenticated;
GRANT ALL ON public.plisio_invoices TO service_role;
ALTER TABLE public.plisio_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own plisio invoices"
  ON public.plisio_invoices FOR SELECT TO authenticated
  USING (account_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE INDEX idx_plisio_invoices_account ON public.plisio_invoices(account_id);