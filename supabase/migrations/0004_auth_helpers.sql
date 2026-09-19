-- =============================================================================
-- Auth helper functions
-- =============================================================================
-- These functions allow the claim flow to verify marshal/driver/operator
-- identity by national ID + phone WITHOUT exposing the rows to anonymous users.
--
-- They run as SECURITY DEFINER so they can bypass RLS, but they return only
-- minimal information (id + full_name) and only when identity matches exactly.
-- =============================================================================

BEGIN;

-- Verify a marshal by national ID + phone. Returns minimal info if matched.
CREATE OR REPLACE FUNCTION public.verify_marshal_identity(
  p_id_number text,
  p_phone text
)
RETURNS TABLE (
  marshal_id text,
  full_name text,
  already_claimed boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id AS marshal_id,
    (m.first_name || ' ' || m.surname) AS full_name,
    (m.auth_user_id IS NOT NULL) AS already_claimed
  FROM public.marshals m
  WHERE
    trim(m.id_number) = trim(p_id_number)
    AND (
      trim(regexp_replace(m.cell_no, '\s+', '', 'g')) = trim(regexp_replace(p_phone, '\s+', '', 'g'))
      OR trim(regexp_replace(coalesce(m.whatsapp_no, ''), '\s+', '', 'g')) = trim(regexp_replace(p_phone, '\s+', '', 'g'))
    )
    AND coalesce(m.is_active, true) = true
  LIMIT 1;
$$;

-- Link an auth user to a marshal record. Idempotent.
-- Only succeeds if the marshal exists, matches identity, and is not already claimed.
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
  v_marshal_id text;
  v_already_claimed boolean;
BEGIN
  SELECT id, (auth_user_id IS NOT NULL)
  INTO v_marshal_id, v_already_claimed
  FROM public.marshals
  WHERE
    trim(id_number) = trim(p_id_number)
    AND (
      trim(regexp_replace(cell_no, '\s+', '', 'g')) = trim(regexp_replace(p_phone, '\s+', '', 'g'))
      OR trim(regexp_replace(coalesce(whatsapp_no, ''), '\s+', '', 'g')) = trim(regexp_replace(p_phone, '\s+', '', 'g'))
    )
    AND coalesce(is_active, true) = true
  LIMIT 1;

  IF v_marshal_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_already_claimed THEN
    -- Only allow re-link if the same user is claiming (idempotent retries)
    RETURN EXISTS (
      SELECT 1 FROM public.marshals
      WHERE id = v_marshal_id AND auth_user_id = p_auth_user_id
    );
  END IF;

  UPDATE public.marshals
  SET auth_user_id = p_auth_user_id,
      last_login_at = now(),
      updated_at = extract(epoch from now()) * 1000,
      version = version + 1
  WHERE id = v_marshal_id;

  RETURN true;
END;
$$;

-- Grant execute to anon so unauthenticated users can call these during claim.
-- They are safe: they reveal nothing unless identity matches exactly.
GRANT EXECUTE ON FUNCTION public.verify_marshal_identity(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_marshal_auth(text, text, uuid) TO anon, authenticated;

COMMIT;
