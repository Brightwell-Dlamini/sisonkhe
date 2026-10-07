-- =============================================================================
-- Card ledger balance drift invariants
-- =============================================================================
-- Reconstructs balance from completed CREDIT/DEBIT rows and compares to
-- stored balance_szl. Observation only.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_card_ledger()
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
  -- Vehicle virtual cards
  SELECT
    'money.card_balance_drift'::text,
    'vehicle_virtual_card'::text,
    c.id,
    jsonb_build_object(
      'vehicle_reg', c.vehicle_reg,
      'stored_balance', c.balance_szl,
      'reconstructed',
        COALESCE((
          SELECT ROUND(
            SUM(
              CASE
                WHEN t.direction = 'CREDIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                  THEN t.amount_szl
                WHEN t.direction = 'DEBIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                  THEN -t.amount_szl
                ELSE 0
              END
            )::numeric,
            2
          )
          FROM public.virtual_card_transactions t
          WHERE t.card_id = c.id
        ), 0),
      'delta',
        ROUND(
          (
            c.balance_szl - COALESCE((
              SELECT SUM(
                CASE
                  WHEN t.direction = 'CREDIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                    THEN t.amount_szl
                  WHEN t.direction = 'DEBIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                    THEN -t.amount_szl
                  ELSE 0
                END
              )
              FROM public.virtual_card_transactions t
              WHERE t.card_id = c.id
            ), 0)
          )::numeric,
          2
        )
    )
  FROM public.vehicle_virtual_cards c
  WHERE ABS(
    c.balance_szl - COALESCE((
      SELECT SUM(
        CASE
          WHEN t.direction = 'CREDIT' AND COALESCE(t.status, 'Completed') = 'Completed'
            THEN t.amount_szl
          WHEN t.direction = 'DEBIT' AND COALESCE(t.status, 'Completed') = 'Completed'
            THEN -t.amount_szl
          ELSE 0
        END
      )
      FROM public.virtual_card_transactions t
      WHERE t.card_id = c.id
    ), 0)
  ) > 0.01

  UNION ALL

  -- Operator master cards
  SELECT
    'money.card_balance_drift'::text,
    'operator_master_card'::text,
    c.id,
    jsonb_build_object(
      'operator_id', c.operator_id,
      'stored_balance', c.balance_szl,
      'reconstructed',
        COALESCE((
          SELECT ROUND(
            SUM(
              CASE
                WHEN t.direction = 'CREDIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                  THEN t.amount_szl
                WHEN t.direction = 'DEBIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                  THEN -t.amount_szl
                ELSE 0
              END
            )::numeric,
            2
          )
          FROM public.operator_card_transactions t
          WHERE t.card_id = c.id
        ), 0),
      'delta',
        ROUND(
          (
            c.balance_szl - COALESCE((
              SELECT SUM(
                CASE
                  WHEN t.direction = 'CREDIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                    THEN t.amount_szl
                  WHEN t.direction = 'DEBIT' AND COALESCE(t.status, 'Completed') = 'Completed'
                    THEN -t.amount_szl
                  ELSE 0
                END
              )
              FROM public.operator_card_transactions t
              WHERE t.card_id = c.id
            ), 0)
          )::numeric,
          2
        )
    )
  FROM public.operator_master_cards c
  WHERE ABS(
    c.balance_szl - COALESCE((
      SELECT SUM(
        CASE
          WHEN t.direction = 'CREDIT' AND COALESCE(t.status, 'Completed') = 'Completed'
            THEN t.amount_szl
          WHEN t.direction = 'DEBIT' AND COALESCE(t.status, 'Completed') = 'Completed'
            THEN -t.amount_szl
          ELSE 0
        END
      )
      FROM public.operator_card_transactions t
      WHERE t.card_id = c.id
    ), 0)
  ) > 0.01;
$$;

GRANT EXECUTE ON FUNCTION public.check_card_ledger() TO service_role;

-- Fold into the nightly runner
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
  v_authority       int := 0;
  v_compliance      int := 0;
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
    SELECT * FROM public.check_operational_integrity()
    UNION ALL
    SELECT * FROM public.check_authority_lattice()
    UNION ALL
    SELECT * FROM public.check_card_ledger();

  SELECT count(*) INTO v_total_fresh FROM _fresh_violations;
  SELECT count(*) INTO v_money        FROM _fresh_violations WHERE invariant LIKE 'money.%';
  SELECT count(*) INTO v_identity     FROM _fresh_violations WHERE invariant LIKE 'identity.%';
  SELECT count(*) INTO v_ops          FROM _fresh_violations WHERE invariant LIKE 'ops.%';
  SELECT count(*) INTO v_authority    FROM _fresh_violations WHERE invariant LIKE 'authority.%';
  SELECT count(*) INTO v_compliance   FROM _fresh_violations WHERE invariant LIKE 'compliance.%';

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
    'authority',       v_authority,
    'compliance',      v_compliance,
    'total',           v_total_fresh,
    'newly_inserted',  v_newly_inserted,
    'auto_resolved',   v_auto_resolved,
    'touched',         v_touched
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_all_invariant_checks() TO service_role;

COMMIT;
