
CREATE OR REPLACE FUNCTION public.prevent_account_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

DROP TRIGGER IF EXISTS prevent_account_privilege_escalation_trg ON public.accounts;
CREATE TRIGGER prevent_account_privilege_escalation_trg
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_account_privilege_escalation();
