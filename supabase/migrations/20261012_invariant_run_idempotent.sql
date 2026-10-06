-- =============================================================================
-- Phase 0 — Make run_all_invariant_checks() idempotent
-- =============================================================================
-- Before: every run appended a new row per violation. The log grew without
-- bound and the same unresolved violation appeared N times.
--
-- After:
--   1. Snapshot the currently-unresolved violations, keyed by
--      (invariant, entity_type, entity_id).
--   2. Run all three checks.
--   3. Auto-resolve any unresolved row whose key is NOT in the fresh set.
--   4. Insert only fresh violations whose key is NOT already unresolved.
--
-- The table now reflects CURRENT state. History is preserved via
-- resolved_at / resolution_note.
--
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.run_all_invariant_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id          text;
  v_money           int := 0;
  v_identity        int := 0;
  v_ops             int := 0;
  v_total_fresh     int := 0;
  v_auto_resolved   int := 0;
  v_newly_inserted  int := 0;
BEGIN
  v_run_id := 'inv_' || replace(gen_random_uuid()::text, '-', '');

  -- Stage the fresh violation set in a temp table so we can reference it
  -- for both the auto-resolve and the insert steps.
  CREATE TEMP TABLE _fresh_violations ON COMMIT DROP AS
    SELECT * FROM public.check_money_chain()
    UNION ALL
    SELECT * FROM public.check_identity_chain()
    UNION ALL
    SELECT * FROM public.check_operational_integrity();

  SELECT count(*) INTO v_total_fresh FROM _fresh_violations;

  -- Snapshot counts per chain for the summary.
  SELECT count(*) INTO v_money      FROM _fresh_violations WHERE invariant LIKE 'money.%';
  SELECT count(*) INTO v_identity   FROM _fresh_violations WHERE invariant LIKE 'identity.%';
  SELECT count(*) INTO v_ops        FROM _fresh_violations WHERE invariant LIKE 'ops.%';

  -- ---------------------------------------------------------------------
  -- Step 1: auto-resolve anything that was previously open but is no
  -- longer detected on this run.
  -- ---------------------------------------------------------------------
  WITH resolved AS (
    UPDATE public.invariant_violations iv
    SET resolved_at = now(),
        resolution_note = 'auto-resolved: not detected on run ' || v_run_id
    WHERE iv.resolved_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM _fresh_violations f
        WHERE f.invariant   IS NOT DISTINCT FROM iv.invariant
          AND f.entity_type IS NOT DISTINCT FROM iv.entity_type
          AND f.entity_id   IS NOT DISTINCT FROM iv.entity_id
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_auto_resolved FROM resolved;

  -- ---------------------------------------------------------------------
  -- Step 2: insert only genuinely new violations — i.e. those whose
  -- (invariant, entity_type, entity_id) is not already unresolved.
  -- ---------------------------------------------------------------------
  WITH to_insert AS (
    SELECT f.*
    FROM _fresh_violations f
    WHERE NOT EXISTS (
      SELECT 1 FROM public.invariant_violations iv
      WHERE iv.resolved_at IS NULL
        AND iv.invariant   IS NOT DISTINCT FROM f.invariant
        AND iv.entity_type IS NOT DISTINCT FROM f.entity_type
        AND iv.entity_id   IS NOT DISTINCT FROM f.entity_id
    )
  ), ins AS (
    INSERT INTO public.invariant_violations
      (id, invariant, entity_type, entity_id, detail)
    SELECT
      v_run_id || '_' || row_number() OVER (),
      invariant, entity_type, entity_id, detail
    FROM to_insert
    RETURNING 1
  )
  SELECT count(*) INTO v_newly_inserted FROM ins;

  RETURN jsonb_build_object(
    'run_id',          v_run_id,
    'ran_at',          now(),
    'money',           v_money,
    'identity',        v_identity,
    'operational',     v_ops,
    'total',           v_total_fresh,
    'newly_inserted',  v_newly_inserted,
    'auto_resolved',   v_auto_resolved
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_all_invariant_checks() TO service_role;

COMMIT;
