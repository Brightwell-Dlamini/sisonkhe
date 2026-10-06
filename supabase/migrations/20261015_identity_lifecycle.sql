-- =============================================================================
-- Phase 1b — Identity lifecycle: claimed_at on pre-registrable role tables
-- =============================================================================
-- The system supports a "collect first, claim later" pattern:
--   Phase A (pre-rollout): rows exist with no auth_user_id.
--   Phase B (rollout):     the person claims their row; we create the auth
--                          user and set claimed_at.
--
-- The invariant `identity.*_without_auth` now fires only when a row has
-- been claimed (claimed_at IS NOT NULL) but the link is missing.
-- Pre-rollout rows with claimed_at IS NULL are exempt.
--
-- Preserves the exact real bodies of link_marshal_auth, adding claimed_at.
--
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add claimed_at to the three pre-registrable role tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.marshals
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

ALTER TABLE public.fleet_operators
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Backfill: any row that already has an auth_user_id is already claimed.
--    Each table uses its own timestamp columns — marshals has legacy bigint
--    created_at/updated_at plus server_created_at/server_updated_at (tz).
-- ---------------------------------------------------------------------------

UPDATE public.marshals
SET claimed_at = coalesce(server_updated_at, server_created_at, now())
WHERE auth_user_id IS NOT NULL AND claimed_at IS NULL;

UPDATE public.drivers
SET claimed_at = coalesce(updated_at, created_at, now())
WHERE auth_user_id IS NOT NULL AND claimed_at IS NULL;

UPDATE public.fleet_operators
SET claimed_at = coalesce(updated_at, created_at, now())
WHERE auth_user_id IS NOT NULL AND claimed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. link_marshal_auth — preserve real bodies, add claimed_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.link_marshal_auth(
  p_marshal_id text,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int;
BEGIN
  IF p_marshal_id IS NULL OR p_auth_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.marshals
  SET auth_user_id = p_auth_user_id,
      claimed_at   = now()
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
$function$;

CREATE OR REPLACE FUNCTION public.link_marshal_auth(
  p_id_number text,
  p_phone text,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated int;
BEGIN
  IF p_id_number IS NULL OR p_phone IS NULL OR p_auth_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.marshals
  SET auth_user_id = p_auth_user_id,
      claimed_at   = now()
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

  IF v_updated = 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM public.marshals
      WHERE trim(id_number) = trim(p_id_number)
        AND auth_user_id = p_auth_user_id
    );
  END IF;

  RETURN true;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. check_identity_chain() — exempt pre-rollout rows
-- ---------------------------------------------------------------------------

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
  -- 3a. Marshals claimed but not linked
  SELECT
    'identity.claimed_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object(
      'staff_number', m.staff_number,
      'region', m.region,
      'claimed_at', m.claimed_at
    )
  FROM public.marshals m
  WHERE m.claimed_at IS NOT NULL
    AND m.auth_user_id IS NULL

  UNION ALL

  -- 3b. Drivers claimed but not linked
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

  -- 3c. Staff without an auth user — always a violation
  SELECT
    'identity.staff_without_auth'::text,
    'staff'::text,
    s.id,
    jsonb_build_object('email', s.email, 'role', s.role)
  FROM public.staff s
  WHERE s.auth_user_id IS NULL

  UNION ALL

  -- 3d. Operators claimed but not linked
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

  -- 3e. Auth users claimed by more than one role table
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

  -- 3f. Orphan auth users
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

  -- 3g. app_metadata.role missing
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

  -- 3h. app_metadata.role mismatch
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
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_identity_chain() TO service_role;

COMMIT;
