-- =============================================================================
-- Fix RLS issues discovered during initial testing
-- =============================================================================

BEGIN;

-- 1. Drop the broken link_marshal_auth function.
--    We now do this UPDATE directly from the API route using the service role.
DROP FUNCTION IF EXISTS public.link_marshal_auth(text, text, uuid);

-- 2. Fix the staff_self_read policy.
--    Before: `auth.uid() = auth_user_id OR is_super_admin()`
--    Problem: during initial sign-in, is_super_admin() might return NULL.
--    New: staff can read themselves; separate policy for super-admins.
DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- 3. Super-admins can read all staff
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

-- 4. Super-admins can write staff
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
