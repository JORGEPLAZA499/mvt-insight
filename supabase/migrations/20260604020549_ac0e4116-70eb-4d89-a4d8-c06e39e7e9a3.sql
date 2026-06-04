CREATE OR REPLACE FUNCTION public.consume_credit_and_insert_analysis(p_user_id uuid, p_device text, p_file_name text, p_file_size bigint, p_result jsonb)
 RETURNS TABLE(analysis_id uuid, remaining_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cost constant integer := 98;
  v_credits integer;
  v_new_credits integer;
  v_analysis_id uuid;
BEGIN
  SELECT credits INTO v_credits
  FROM public.accounts
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
  END IF;

  IF v_credits < v_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  v_new_credits := v_credits - v_cost;

  UPDATE public.accounts
  SET credits = v_new_credits
  WHERE id = p_user_id;

  INSERT INTO public.analyses (user_id, device, file_name, file_size, result)
  VALUES (p_user_id, p_device, p_file_name, p_file_size, p_result)
  RETURNING id INTO v_analysis_id;

  RETURN QUERY SELECT v_analysis_id, v_new_credits;
END;
$function$;