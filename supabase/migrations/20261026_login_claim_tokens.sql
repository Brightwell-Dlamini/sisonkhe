-- One-time claim links for admin-issued logins.
-- Raw token is shown once; only SHA-256 hash is stored.

CREATE TABLE IF NOT EXISTS public.login_claim_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL UNIQUE,
  auth_user_id  uuid NOT NULL,
  username      text NOT NULL,
  role          text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     text,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_claim_tokens_auth_user_idx
  ON public.login_claim_tokens (auth_user_id);

CREATE INDEX IF NOT EXISTS login_claim_tokens_expires_idx
  ON public.login_claim_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.login_claim_tokens ENABLE ROW LEVEL SECURITY;

-- Service role only (no public policies). App uses admin client.
