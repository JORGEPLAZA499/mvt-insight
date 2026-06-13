
ALTER FUNCTION public.legal_acceptances_no_mutate() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_legal_acceptance(uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.legal_acceptances_no_mutate() FROM PUBLIC, anon;
