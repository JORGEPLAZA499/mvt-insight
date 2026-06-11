REVOKE UPDATE ON public.accounts FROM authenticated;
GRANT UPDATE (last_login_at) ON public.accounts TO authenticated;