-- =============================================================================
-- Role hardening
-- =============================================================================
-- 1. Enforce single-table membership per auth_user_id at the DB level.
-- 2. Backfill auth.users.app_metadata.role so edge middleware can read it.
-- Safe to re-run.
-- =============================================================================

BEGIN;

-- 1. Single role table membership
CREATE OR REPLACE FUNCTION public.assert_single_role_membership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (SELECT count(*) FROM public.staff           WHERE auth_user_id = NEW.auth_user_id)
    + (SELECT count(*) FROM public.marshals      WHERE auth_user_id = NEW.auth_user_id)
    + (SELECT count(*) FROM public.drivers       WHERE auth_user_id = NEW.auth_user_id)
    + (SELECT count(*) FROM public.fleet_operators WHERE auth_user_id = NEW.auth_user_id)
  INTO v_count;

  IF v_count > 1 THEN
    RAISE EXCEPTION
      'auth_user_id % is claimed by multiple role tables', NEW.auth_user_id
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_single_role ON public.staff;
CREATE TRIGGER staff_single_role
  BEFORE INSERT OR UPDATE OF auth_user_id ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.assert_single_role_membership();

DROP TRIGGER IF EXISTS marshals_single_role ON public.marshals;
CREATE TRIGGER marshals_single_role
  BEFORE INSERT OR UPDATE OF auth_user_id ON public.marshals
  FOR EACH ROW EXECUTE FUNCTION public.assert_single_role_membership();

DROP TRIGGER IF EXISTS drivers_single_role ON public.drivers;
CREATE TRIGGER drivers_single_role
  BEFORE INSERT OR UPDATE OF auth_user_id ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.assert_single_role_membership();

DROP TRIGGER IF EXISTS operators_single_role ON public.fleet_operators;
CREATE TRIGGER operators_single_role
  BEFORE INSERT OR UPDATE OF auth_user_id ON public.fleet_operators
  FOR EACH ROW EXECUTE FUNCTION public.assert_single_role_membership();

-- 2. Backfill app_metadata.role
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
  EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id)
  OR EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id)
  OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id)
  OR EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id);

COMMIT;
