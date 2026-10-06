-- =============================================================================
-- Phase 0 — RLS on invariant_violations
-- =============================================================================
-- Rules:
--   * super-admin: read all
--   * everyone else: no access
--   * writes: service_role only (bypasses RLS)
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

ALTER TABLE public.invariant_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invariant_violations_super_admin_read"
  ON public.invariant_violations;

CREATE POLICY "invariant_violations_super_admin_read"
  ON public.invariant_violations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.auth_user_id = auth.uid()
        AND s.role = 'super-admin'
        AND s.is_active = true
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated.
-- Only the service_role (which bypasses RLS) writes to this table.

COMMIT;
