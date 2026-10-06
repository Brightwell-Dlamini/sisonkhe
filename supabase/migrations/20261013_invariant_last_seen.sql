-- =============================================================================
-- Phase 0 — Add last_seen_at to invariant_violations
-- =============================================================================
-- detected_at records when a violation was FIRST seen. It never changes.
-- last_seen_at records when the runner last CONFIRMED the violation is still
-- present. It advances on every run for unresolved rows.
--
-- Together they answer:
--   "Is this violation still firing?"      → resolved_at IS NULL
--   "When was it first detected?"          → detected_at
--   "When was it last confirmed still on?" → last_seen_at
--
-- Also makes cron liveness observable: if last_seen_at is stale for an
-- unresolved row, the cron is not running.
--
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

-- 1. Add the column (no default — backfill below sets it correctly)
ALTER TABLE public.invariant_violations
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 2. Backfill: for any existing row, last_seen_at = detected_at
UPDATE public.invariant_violations
SET last_seen_at = detected_at
WHERE last_seen_at IS NULL;

-- 3. Index for the liveness query
CREATE INDEX IF NOT EXISTS invariant_violations_last_seen_idx
  ON public.invariant_violations (last_seen_at DESC)
  WHERE resolved_at IS NULL;

-- 4. Update the runner to touch last_seen_at for every currently-open
--    violation that is still detected on this run.
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
  v_touched         int := 0;
BEGIN
  v_run_id := 'inv_' || replace(gen_random_uuid()::text, '-', '');

  CREATE TEMP TABLE _fresh_violations ON COMMIT DROP AS
    SELECT * FROM public.check_money_chain()
    UNION ALL
    SELECT * FROM public.check_identity_chain()
    UNION ALL
    SELECT * FROM public.check_operational_integrity();

  SELECT count(*) INTO v_total_fresh FROM _fresh_violations;
  SELECT count(*) INTO v_money        FROM _fresh_violations WHERE invariant LIKE 'money.%';
  SELECT count(*) INTO v_identity     FROM _fresh_violations WHERE invariant LIKE 'identity.%';
  SELECT count(*) INTO v_ops          FROM _fresh_violations WHERE invariant LIKE 'ops.%';

  -- ---------------------------------------------------------------------
  -- Step 1: touch last_seen_at on every currently-open violation that is
  -- still detected on this run. This is what makes cron liveness observable.
  -- ---------------------------------------------------------------------
  WITH touched AS (
    UPDATE public.invariant_violations iv
    SET last_seen_at = now()
    WHERE iv.resolved_at IS NULL
      AND EXISTS (
        SELECT 1 FROM _fresh_violations f
        WHERE f.invariant   IS NOT DISTINCT FROM iv.invariant
          AND f.entity_type IS NOT DISTINCT FROM iv.entity_type
          AND f.entity_id   IS NOT DISTINCT FROM iv.entity_id
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_touched FROM touched;

  -- ---------------------------------------------------------------------
  -- Step 2: auto-resolve anything previously open but no longer detected.
  -- ---------------------------------------------------------------------
  WITH resolved AS (
    UPDATE public.invariant_violations iv
    SET resolved_at      = now(),
        resolution_note  = 'auto-resolved: not detected on run ' || v_run_id
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
  -- Step 3: insert only genuinely new violations.
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
      (id, invariant, entity_type, entity_id, detail, last_seen_at)
    SELECT
      v_run_id || '_' || row_number() OVER (),
      invariant, entity_type, entity_id, detail, now()
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
    'auto_resolved',   v_auto_resolved,
    'touched',         v_touched
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_all_invariant_checks() TO service_role;

COMMIT;
