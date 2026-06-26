-- Rotate the admin password that was previously committed in plaintext in
-- migration 20260602043809. Generate a strong random value, apply it, and
-- discard it. The owner must use the "forgot password" flow to set a new one.
DO $$
DECLARE
  v_random_pw text := encode(gen_random_bytes(48), 'base64');
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(v_random_pw, gen_salt('bf')),
      updated_at = now()
  WHERE id = 'e56a6a80-3e6e-43a7-9907-052e8be73d6f';
  -- v_random_pw goes out of scope; not logged, not stored.
END $$;