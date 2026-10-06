-- =============================================================================
-- Phase 1 — Identity chain hardening
-- =============================================================================
-- Actions:
--   1. Remove the two orphan driver auth users (confirmed half-created,
--      referenced by nothing).
--   2. Re-run the app_metadata.role backfill for any remaining users.
--   3. Extend check_identity_chain() with two new invariants:
--      - identity.auth_user_app_metadata_missing
--      - identity.auth_user_metadata_role_mismatch
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Delete the two orphan driver auth users
-- ---------------------------------------------------------------------------
-- These are the two rows from the diagnostic query. They have no role-table
-- row, no referenced row, and no last_sign_in_at older than the two logins
-- we saw. They are half-created accounts from /api/register/driver where the
-- insert failed and the rollback also failed.
--
-- We delete them by ID, not by pattern, so this migration is precise and
-- idempotent: if they are already gone, nothing happens.

DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    'dee1806b-332c-47bf-bca7-2c1c97244e3c'::uuid,
    '978da7af-a551-475c-8f0d-b32cb34ed43a'::uuid
  ];
  v_id uuid;
BEGIN
  FOREACH v_id IN ARRAY v_ids LOOP
    -- Safety: only delete if the user is claimed by no role table.
    IF NOT EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = v_id)
       AND NOT EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = v_id)
       AND NOT EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = v_id)
       AND NOT EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = v_id)
    THEN
      DELETE FROM auth.users WHERE id = v_id;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Re-run the app_metadata.role backfill
-- ---------------------------------------------------------------------------
-- This is the same update from 20261008_role_hardening.sql, but now it will
-- actually find the two orphans gone. Idempotent.

UPDATE auth.users u
SET raw_app_meta_data =
      coalesce(u.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'role',
           CASE
             WHEN EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id) THEN
               (SELECT s.role FROM public.staff s WHERE s.auth_user_id = u.id LIMIT 1)
             WHEN EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id) THEN
               'marshal'
             WHEN EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id) THEN
               'driver'
             WHEN EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id) THEN
               'operator'
             ELSE NULL
           END
         )
WHERE
  u.raw_app_meta_data->>'role' IS NULL
  AND (
    EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id)
    OR EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id)
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id)
    OR EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id)
  );

-- ---------------------------------------------------------------------------
-- 3. Extend check_identity_chain()
-- ---------------------------------------------------------------------------
-- Two new invariants:
--   identity.auth_user_app_metadata_missing
--     — a user exists in a role table but has no app_metadata.role set
--   identity.auth_user_metadata_role_mismatch
--     — a user has app_metadata.role but it disagrees with their role table
--
-- We replace the function wholesale, preserving the original six checks.

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
  -- 3a. Active marshals without an auth user
  SELECT
    'identity.active_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object('staff_number', m.staff_number, 'region', m.region)
  FROM public.marshals m
  WHERE m.is_active = true
    AND m.auth_user_id IS NULL

  UNION ALL

  -- 3b. Drivers without an auth user
  SELECT
    'identity.driver_without_auth'::text,
    'driver'::text,
    d.id,
    jsonb_build_object('full_name', d.full_name, 'phone', d.phone)
  FROM public.drivers d
  WHERE d.auth_user_id IS NULL

  UNION ALL

  -- 3c. Staff without an auth user
  SELECT
    'identity.staff_without_auth'::text,
    'staff'::text,
    s.id,
    jsonb_build_object('email', s.email, 'role', s.role)
  FROM public.staff s
  WHERE s.auth_user_id IS NULL

  UNION ALL

  -- 3d. Operators without an auth user
  SELECT
    'identity.operator_without_auth'::text,
    'operator'::text,
    o.id,
    jsonb_build_object('name', o.name, 'company_name', o.company_name)
  FROM public.fleet_operators o
  WHERE o.auth_user_id IS NULL

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

  -- 3f. Auth users claimed by no role table at all
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

  -- 3g. NEW: users in a role table but with no app_metadata.role
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

  -- 3h. NEW: users whose app_metadata.role disagrees with their role table
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
