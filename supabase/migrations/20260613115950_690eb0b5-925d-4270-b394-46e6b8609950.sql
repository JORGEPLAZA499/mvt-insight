
CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code text NOT NULL,
  document_version text NOT NULL,
  document_hash text NOT NULL,
  document_text text NOT NULL,
  locale text NOT NULL,
  ip_address text,
  user_agent text,
  acceptance_method text NOT NULL DEFAULT 'explicit_checkbox_click',
  signature text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX legal_acceptances_user_idx ON public.legal_acceptances(user_id, accepted_at DESC);

GRANT SELECT, INSERT ON public.legal_acceptances TO authenticated;
GRANT ALL ON public.legal_acceptances TO service_role;

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own acceptances" ON public.legal_acceptances
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own acceptances" ON public.legal_acceptances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all acceptances" ON public.legal_acceptances
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Append-only enforcement
CREATE OR REPLACE FUNCTION public.legal_acceptances_no_mutate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'legal_acceptances is append-only';
END;
$$;

CREATE TRIGGER legal_acceptances_no_update
  BEFORE UPDATE ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.legal_acceptances_no_mutate();

CREATE TRIGGER legal_acceptances_no_delete
  BEFORE DELETE ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.legal_acceptances_no_mutate();

-- Accounts gating column
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS legal_accepted_version text;

-- RPC to atomically record acceptance and update the accounts gating column
CREATE OR REPLACE FUNCTION public.record_legal_acceptance(
  p_user_id uuid,
  p_document_version text,
  p_document_hash text,
  p_document_text text,
  p_locale text,
  p_ip text,
  p_user_agent text,
  p_signature text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_code text;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    -- allow service_role (auth.uid() is null) to insert too
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  SELECT user_code INTO v_code FROM public.accounts WHERE id = p_user_id;
  IF v_code IS NULL THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
  END IF;

  INSERT INTO public.legal_acceptances (
    user_id, user_code, document_version, document_hash, document_text,
    locale, ip_address, user_agent, signature
  ) VALUES (
    p_user_id, v_code, p_document_version, p_document_hash, p_document_text,
    p_locale, p_ip, p_user_agent, p_signature
  ) RETURNING id INTO v_id;

  UPDATE public.accounts SET legal_accepted_version = p_document_version WHERE id = p_user_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(uuid, text, text, text, text, text, text, text) TO authenticated, service_role;
