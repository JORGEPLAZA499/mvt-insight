
CREATE TABLE public.desktop_pairing_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_desktop_pairing_codes_user ON public.desktop_pairing_codes(user_id);

GRANT SELECT ON public.desktop_pairing_codes TO authenticated;
GRANT ALL ON public.desktop_pairing_codes TO service_role;

ALTER TABLE public.desktop_pairing_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pairing codes"
  ON public.desktop_pairing_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.desktop_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Desktop',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX idx_desktop_tokens_user ON public.desktop_tokens(user_id);

GRANT SELECT, UPDATE ON public.desktop_tokens TO authenticated;
GRANT ALL ON public.desktop_tokens TO service_role;

ALTER TABLE public.desktop_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own desktop tokens"
  ON public.desktop_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users revoke own desktop tokens"
  ON public.desktop_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
