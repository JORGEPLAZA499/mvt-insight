DROP TRIGGER IF EXISTS prevent_account_privilege_escalation_trg ON public.accounts;
CREATE TRIGGER prevent_account_privilege_escalation_trg
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_account_privilege_escalation();