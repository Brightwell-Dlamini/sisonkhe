-- =============================================================================
-- Fix: usernames.auth_user_id is TEXT; auth.users.id is UUID
-- ERROR 42883: operator does not exist: uuid = text
-- Safe to re-run. Replaces check_identity_chain entirely.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_identity_chain()
RETURNS TABLE (
  invariant    text,
  entity_type  text,
  entity_id    text,
  detail       jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'identity.claimed_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object(
      'region', m.region,
      'claimed_at', m.claimed_at
    )
  FROM public.marshals m
  WHERE m.claimed_at IS NOT NULL
    AND m.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.claimed_driver_without_auth'::text,
    'driver'::text,
    d.id,
    jsonb_build_object(
      'full_name', d.full_name,
      'phone', d.phone,
      'claimed_at', d.claimed_at
    )
  FROM public.drivers d
  WHERE d.claimed_at IS NOT NULL
    AND d.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.staff_without_auth'::text,
    'staff'::text,
    s.id,
    jsonb_build_object('email', s.email, 'role', s.role)
  FROM public.staff s
  WHERE s.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.claimed_operator_without_auth'::text,
    'operator'::text,
    o.id,
    jsonb_build_object(
      'name', o.name,
      'company_name', o.company_name,
      'claimed_at', o.claimed_at
    )
  FROM public.fleet_operators o
  WHERE o.claimed_at IS NOT NULL
    AND o.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.auth_user_multi_role'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object(
      'email', u.email,
      'in_staff',     EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = u.id),
      'in_marshals',  EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = u.id),
      'in_drivers',   EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = u.id),
      'in_operators', EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id)
    )
  FROM auth.users u
  WHERE (
    (CASE WHEN EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = u.id) THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = u.id) THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = u.id) THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id) THEN 1 ELSE 0 END)
  ) > 1

  UNION ALL

  SELECT
    'identity.auth_user_orphan'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object('email', u.email, 'created_at', u.created_at)
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id)

  UNION ALL

  SELECT
    'identity.auth_user_app_metadata_missing'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object(
      'email', u.email,
      'user_metadata_role', u.raw_user_meta_data->>'role'
    )
  FROM auth.users u
  WHERE coalesce(u.raw_app_meta_data->>'role', '') = ''
    AND (
      EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id)
    )

  UNION ALL

  SELECT
    'identity.auth_user_metadata_role_mismatch'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object(
      'email', u.email,
      'app_role', u.raw_app_meta_data->>'role',
      'expected_role',
        CASE
          WHEN EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id) THEN
            (SELECT s.role FROM public.staff s WHERE s.auth_user_id = u.id LIMIT 1)
          WHEN EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id) THEN 'marshal'
          WHEN EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id) THEN 'driver'
          WHEN EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id) THEN 'operator'
          ELSE NULL
        END
    )
  FROM auth.users u
  WHERE u.raw_app_meta_data->>'role' IS NOT NULL
    AND u.raw_app_meta_data->>'role' <> (
      CASE
        WHEN EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id) THEN
          (SELECT s.role FROM public.staff s WHERE s.auth_user_id = u.id LIMIT 1)
        WHEN EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id) THEN 'marshal'
        WHEN EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id) THEN 'driver'
        WHEN EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id) THEN 'operator'
        ELSE NULL
      END
    )

  UNION ALL

  -- CRITICAL: cast uuid → text. Never compare uuid = text.
  SELECT
    'identity.username_orphan'::text,
    'username'::text,
    un.username,
    jsonb_build_object('auth_user_id', un.auth_user_id, 'role', un.role)
  FROM public.usernames un
  WHERE un.auth_user_id IS NOT NULL
    AND btrim(un.auth_user_id) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id::text = un.auth_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_identity_chain() TO service_role;

COMMIT;
