-- =============================================================================
-- Ensure marshals can be linked to Supabase Auth users during claim.
-- Safe to run multiple times.
-- =============================================================================

BEGIN;

-- 1) Column the claim flow writes (portal may not have had this yet)
ALTER TABLE public.marshals
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_marshals_auth_user
  ON public.marshals (auth_user_id);

-- Optional login timestamp (only if you want it; claim no longer requires it)
ALTER TABLE public.marshals
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 2) Drop any prior overloads so we have one clear API
DROP FUNCTION IF EXISTS public.link_marshal_auth(text, text, uuid);
DROP FUNCTION IF EXISTS public.link_marshal_auth(text, uuid);

-- 3) Identity-based linker (preferred)
CREATE OR REPLACE FUNCTION public.link_marshal_auth(
  p_id_number text,
  p_phone text,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_id_number IS NULL OR p_phone IS NULL OR p_auth_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.marshals
  SET auth_user_id = p_auth_user_id
  WHERE trim(id_number) = trim(p_id_number)
    AND (
      trim(regexp_replace(coalesce(cell_no, ''), '\s+', '', 'g'))
        = trim(regexp_replace(p_phone, '\s+', '', 'g'))
      OR trim(regexp_replace(coalesce(whatsapp_no, ''), '\s+', '', 'g'))
        = trim(regexp_replace(p_phone, '\s+', '', 'g'))
    )
    AND coalesce(is_active, true) = true
    AND auth_user_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Idempotent: already linked to this same user counts as success
  IF v_updated = 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM public.marshals
      WHERE trim(id_number) = trim(p_id_number)
        AND auth_user_id = p_auth_user_id
    );
  END IF;

  RETURN true;
END;
$$;

-- 4) ID-based linker (fallback)
CREATE OR REPLACE FUNCTION public.link_marshal_auth(
  p_marshal_id text,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  IF p_marshal_id IS NULL OR p_auth_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.marshals
  SET auth_user_id = p_auth_user_id
  WHERE id = p_marshal_id
    AND auth_user_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM public.marshals
      WHERE id = p_marshal_id AND auth_user_id = p_auth_user_id
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.link_marshal_auth(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_marshal_auth(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_marshal_auth(text, text, uuid) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.link_marshal_auth(text, uuid) TO service_role, authenticated, anon;

COMMIT;
