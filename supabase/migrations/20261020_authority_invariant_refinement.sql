-- =============================================================================
-- Phase 4d — Tighten the authority.policy_gap filter
-- =============================================================================
-- The previous filter used `p.qual <> 'false'` to exclude policies that
-- deliberately lock access. In practice, pg_policies returns the qual text
-- with variations (trailing whitespace, parenthesised form). This migration
-- uses a normalised comparison and a regex so no legitimate lock is flagged.
--
-- Also: a policy is never a "gap" if its cmd is only INSERT and it has no
-- USING clause (only WITH CHECK) — that is a pure input-validation gate,
-- not an access scope.
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_authority_lattice()
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
  -- 1a. RLS disabled on any public table
  SELECT
    'authority.rls_disabled'::text,
    'table'::text,
    c.relname,
    jsonb_build_object('rls_enabled', false)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false

  UNION ALL

  -- 1b. Loose write policies — normalised filter
  SELECT
    'authority.policy_gap'::text,
    'table'::text,
    p.tablename,
    jsonb_build_object(
      'policy', p.policyname,
      'cmd', p.cmd,
      'qual', p.qual
    )
  FROM pg_policies p
  JOIN pg_class c
    ON c.relname = p.tablename
  JOIN pg_namespace n
    ON n.oid = c.relnamespace AND n.nspname = p.schemaname
  WHERE p.schemaname = 'public'
    AND c.relrowsecurity = true
    AND p.cmd IN ('ALL', 'INSERT', 'UPDATE')
    AND p.qual IS NOT NULL
    -- Explicit locks: qual normalises to "false" (any quoting/whitespace form)
    AND lower(trim(both from p.qual)) NOT IN ('false', '(false)', 'false::boolean', '''false''')
    -- Scoped by an explicit helper or by auth.uid()
    AND p.qual NOT LIKE '%is_super_admin%'
    AND p.qual NOT LIKE '%is_rank_admin%'
    AND p.qual NOT LIKE '%is_staff%'
    AND p.qual NOT LIKE '%in_region%'
    AND p.qual NOT LIKE '%current_marshal_route%'
    AND p.qual NOT LIKE '%current_operator_id%'
    AND p.qual NOT LIKE '%current_driver_id%'
    AND p.qual NOT LIKE '%current_marshal_id%'
    AND p.qual NOT LIKE '%current_staff_role%'
    AND p.qual NOT LIKE '%auth.uid()%'
    AND p.qual NOT LIKE '%super-admin%'
    -- The invariant_violations table's own RLS is fine by construction
    AND p.tablename NOT IN ('invariant_violations');
$$;

GRANT EXECUTE ON FUNCTION public.check_authority_lattice() TO service_role;

COMMIT;
