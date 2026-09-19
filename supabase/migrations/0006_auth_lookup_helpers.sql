-- =============================================================================
-- Auth lookup helpers
-- =============================================================================
-- These functions allow our sign-in API to resolve an identifier to an
-- auth.users.id without listing users (which paginates at 50).
-- =============================================================================

BEGIN;

-- Find auth user id by username (stored in user_metadata.username)
CREATE OR REPLACE FUNCTION public.find_auth_user_by_username(p_username text)
RETURNS TABLE (auth_user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id, email
  FROM auth.users
  WHERE lower(coalesce(raw_user_meta_data->>'username', '')) = lower(p_username)
  LIMIT 1;
$$;

-- Find auth user id by email
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(p_email text)
RETURNS TABLE (auth_user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id, email
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;
$$;

-- Find auth user id by national ID (checks marshals + drivers)
CREATE OR REPLACE FUNCTION public.find_auth_user_by_national_id(p_national_id text)
RETURNS TABLE (auth_user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id IN (
    SELECT auth_user_id FROM public.marshals
    WHERE trim(id_number) = trim(p_national_id) AND auth_user_id IS NOT NULL
    UNION
    SELECT auth_user_id FROM public.drivers
    WHERE trim(national_id) = trim(p_national_id) AND auth_user_id IS NOT NULL
  )
  LIMIT 1;
$$;

-- Find auth user id by phone (checks marshals + drivers)
-- Note: LANGUAGE plpgsql because it uses a local variable.
CREATE OR REPLACE FUNCTION public.find_auth_user_by_phone(p_phone text)
RETURNS TABLE (auth_user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_phone text;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '\s+', '', 'g');

  RETURN QUERY
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id IN (
    SELECT auth_user_id FROM public.marshals
    WHERE auth_user_id IS NOT NULL
      AND (
        regexp_replace(coalesce(cell_no, ''), '\s+', '', 'g') = v_clean_phone
        OR regexp_replace(coalesce(whatsapp_no, ''), '\s+', '', 'g') = v_clean_phone
      )
    UNION
    SELECT auth_user_id FROM public.drivers
    WHERE auth_user_id IS NOT NULL
      AND regexp_replace(coalesce(phone, ''), '\s+', '', 'g') = v_clean_phone
  )
  LIMIT 1;
END;
$$;

-- Grant execute to anon + authenticated (signin API calls these pre-auth)
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_national_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_phone(text) TO anon, authenticated;

COMMIT;
