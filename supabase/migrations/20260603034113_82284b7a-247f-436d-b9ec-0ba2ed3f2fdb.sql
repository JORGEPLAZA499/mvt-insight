-- 1. Tabla analyses
CREATE TABLE public.analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  result jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_analyses_user_created ON public.analyses (user_id, created_at DESC);

GRANT SELECT ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analyses"
ON public.analyses
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies → solo service_role (vía la función SECURITY DEFINER) puede modificar.

-- 2. Función transaccional: descuenta crédito + inserta análisis
CREATE OR REPLACE FUNCTION public.consume_credit_and_insert_analysis(
  p_user_id uuid,
  p_device text,
  p_file_name text,
  p_file_size bigint,
  p_result jsonb
)
RETURNS TABLE(analysis_id uuid, remaining_credits integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
  v_new_credits integer;
  v_analysis_id uuid;
BEGIN
  -- Bloquea la fila de la cuenta para evitar carreras
  SELECT credits INTO v_credits
  FROM public.accounts
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
  END IF;

  IF v_credits < 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  v_new_credits := v_credits - 1;

  UPDATE public.accounts
  SET credits = v_new_credits
  WHERE id = p_user_id;

  INSERT INTO public.analyses (user_id, device, file_name, file_size, result)
  VALUES (p_user_id, p_device, p_file_name, p_file_size, p_result)
  RETURNING id INTO v_analysis_id;

  RETURN QUERY SELECT v_analysis_id, v_new_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit_and_insert_analysis(uuid, text, text, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credit_and_insert_analysis(uuid, text, text, bigint, jsonb) TO service_role;