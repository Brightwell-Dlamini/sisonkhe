-- =============================================================================
-- Fix RLS issues discovered during initial testing
-- =============================================================================

BEGIN;

-- 1. Drop the broken link_marshal_auth function.
--    We now do this UPDATE directly from the API route using the service role.
DROP FUNCTION IF EXISTS public.link_marshal_auth(text, text, uuid);

-- 2. Ensure the service role can bypass RLS.
--    In Supabase, the `service_role` role should already have BYPASSRLS,
--    but let's be explicit for safety.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'ALTER ROLE service_role BYPASSRLS';
  END IF;
END $$;

-- 3. Fix the staff_self_read policy.
--    Before: `auth.uid() = auth_user_id OR is_super_admin()`
--    Problem: during initial sign-in, `is_super_admin()` might return NULL,
--    and the row isn't found. Also breaks the very first staff member.
--    New: staff can read themselves; super-admins can read all.
DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 4. Super-admins can read all staff
DROP POLICY IF EXISTS "staff_super_admin_read_all" ON public.staff;
CREATE POLICY "staff_super_admin_read_all" ON public.staff
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s2
      WHERE s2.auth_user_id = auth.uid()
        AND s2.role = 'super-admin'
        AND s2.is_active = true
    )
  );

-- 5. Super-admins can write staff
DROP POLICY IF EXISTS "staff_super_admin_write" ON public.staff;
CREATE POLICY "staff_super_admin_write" ON public.staff
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s2
      WHERE s2.auth_user_id = auth.uid()
        AND s2.role = 'super-admin'
        AND s2.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s2
      WHERE s2.auth_user_id = auth.uid()
        AND s2.role = 'super-admin'
        AND s2.is_active = true
    )
  );

COMMIT;