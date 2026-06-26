CREATE OR REPLACE FUNCTION public.prevent_account_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Llamadas desde service_role / SECURITY DEFINER (sin sesión de usuario)
  -- son confiables: el RPC consume_credit_and_insert_analysis las usa para
  -- descontar créditos de forma atómica. Solo bloqueamos modificaciones
  -- iniciadas por un usuario autenticado que no sea admin.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.user_code IS DISTINCT FROM OLD.user_code THEN
    RAISE EXCEPTION 'No tienes permiso para modificar el código de usuario';
  END IF;
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'No tienes permiso para modificar los créditos';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'No tienes permiso para modificar el id de la cuenta';
  END IF;
  RETURN NEW;
END;
$function$;