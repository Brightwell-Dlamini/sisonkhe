-- =============================================================================
-- link_marshal_auth: reliable claim-step linker
-- =============================================================================
-- SECURITY DEFINER so the claim API can link without depending on RLS or
-- optional columns. Only writes auth_user_id when the row is still unclaimed.

BEGIN;

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
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.link_marshal_auth(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_marshal_auth(text, uuid) TO service_role;
-- Optional: allow authenticated if ever needed from edge functions
GRANT EXECUTE ON FUNCTION public.link_marshal_auth(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.link_marshal_auth(text, uuid) IS
  'Links a Supabase Auth user to an unclaimed marshal row. Returns true if a row was updated.';

COMMIT;
