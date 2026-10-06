-- =============================================================================
-- Phase 2 — Money chain hardening
-- =============================================================================
-- Actions:
--   1. Add reversal_of / reversed_by to the four money tables.
--   2. Constraint: a reversal cannot itself be reversed.
--   3. Atomic RPC record_rank_fee() that writes marshal_transactions and
--      rank_fee_payments in one transaction. Idempotency handled inside.
--   4. Extend check_money_chain() with:
--        money.fee_without_settlement
--        money.reversal_double
--        ops.trip_unassigned_driver  (moved here — it's a money-chain fact)
--
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Reversal columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS reversal_of text,
  ADD COLUMN IF NOT EXISTS reversed_by text;

ALTER TABLE public.marshal_transactions
  ADD COLUMN IF NOT EXISTS reversal_of text,
  ADD COLUMN IF NOT EXISTS reversed_by text;

ALTER TABLE public.rank_fee_payments
  ADD COLUMN IF NOT EXISTS reversal_of text,
  ADD COLUMN IF NOT EXISTS reversed_by text;

ALTER TABLE public.payment_credits
  ADD COLUMN IF NOT EXISTS reversal_of text,
  ADD COLUMN IF NOT EXISTS reversed_by text;

-- ---------------------------------------------------------------------------
-- 2. A reversal cannot itself be reversed
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trips_no_double_reversal'
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT trips_no_double_reversal
      CHECK (reversal_of IS NULL OR reversed_by IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mtx_no_double_reversal'
  ) THEN
    ALTER TABLE public.marshal_transactions
      ADD CONSTRAINT mtx_no_double_reversal
      CHECK (reversal_of IS NULL OR reversed_by IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rfp_no_double_reversal'
  ) THEN
    ALTER TABLE public.rank_fee_payments
      ADD CONSTRAINT rfp_no_double_reversal
      CHECK (reversal_of IS NULL OR reversed_by IS NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pc_no_double_reversal'
  ) THEN
    ALTER TABLE public.payment_credits
      ADD CONSTRAINT pc_no_double_reversal
      CHECK (reversal_of IS NULL OR reversed_by IS NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Atomic rank fee writer
-- ---------------------------------------------------------------------------
-- Replaces the two-insert sequence in dispatch.ts. Generates the tx id
-- inside the function so the idempotency window is race-free.
--
-- Returns:
--   { written: true,  tx_id: <id> }              — normal case
--   { written: false, reason: 'duplicate' }      — a fee was already written
--                                                  for this vehicle in the last
--                                                  60 seconds
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_rank_fee(
  p_marshal_id               text,
  p_vehicle_reg              text,
  p_trigger_source           text,
  p_amount_szl               numeric,
  p_allocation_operational   numeric,
  p_allocation_nrtc          numeric,
  p_allocation_maintenance   numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now        timestamptz := now();
  v_date       date        := v_now::date;
  v_month      text        := to_char(v_now, 'YYYY-MM');
  v_since      timestamptz := v_now - interval '60 seconds';
  v_tx_id      text;
  v_seq        bigint;
BEGIN
  -- Idempotency: is there a marshal_transaction for this vehicle in the
  -- last 60 seconds? If yes, bail without writing anything.
  IF EXISTS (
    SELECT 1 FROM public.marshal_transactions
    WHERE vehicle_reg = p_vehicle_reg
      AND timestamp >= v_since
  ) THEN
    RETURN jsonb_build_object('written', false, 'reason', 'duplicate');
  END IF;

  -- Serial number for the transaction id. Uses the existing
  -- system_sequences table via next_system_sequence().
  v_seq := public.next_system_sequence('marshal_tx_' || p_vehicle_reg);
  v_tx_id := 'mtx_' || to_char(v_now, 'YYYYMMDD') || '_' ||
             p_vehicle_reg || '_' || lpad(v_seq::text, 6, '0');

  INSERT INTO public.marshal_transactions (
    id, marshal_id, timestamp, date, month,
    vehicle_reg, amount_szl, trigger_source
  ) VALUES (
    v_tx_id, p_marshal_id, v_now, v_date, v_month,
    p_vehicle_reg, p_amount_szl, p_trigger_source
  );

  INSERT INTO public.rank_fee_payments (
    id, timestamp, vehicle_reg, amount_szl,
    payment_method, transaction_ref, status,
    allocation_operational, allocation_nrtc, allocation_maintenance
  ) VALUES (
    'rfp_' || v_tx_id, v_now, p_vehicle_reg, p_amount_szl,
    'Rank Fee (Operational)', v_tx_id, 'Recorded',
    p_allocation_operational, p_allocation_nrtc, p_allocation_maintenance
  );

  RETURN jsonb_build_object('written', true, 'tx_id', v_tx_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_rank_fee(
  text, text, text, numeric, numeric, numeric, numeric
) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Extended check_money_chain()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_money_chain()
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
  -- 2a. Trips with no matching marshal transaction
  SELECT
    'money.trip_without_fee'::text,
    'trip'::text,
    t.id,
    jsonb_build_object(
      'vehicle_reg', t.vehicle_reg,
      'route_id', t.route_id,
      'date', t.date,
      'departure_time', t.departure_time,
      'status', t.status
    )
  FROM public.trips t
  WHERE t.status = 'Departed'
    AND NOT EXISTS (
      SELECT 1 FROM public.marshal_transactions mt
      WHERE mt.vehicle_reg = t.vehicle_reg
        AND mt.timestamp
            BETWEEN (t.date::timestamptz + t.departure_time::time - interval '60 seconds')
                AND (t.date::timestamptz + t.departure_time::time + interval '60 seconds')
    )

  UNION ALL

  -- 2b. Marshal transactions with no matching trip
  SELECT
    'money.fee_without_trip'::text,
    'marshal_transaction'::text,
    mt.id,
    jsonb_build_object(
      'vehicle_reg', mt.vehicle_reg,
      'marshal_id', mt.marshal_id,
      'timestamp', mt.timestamp,
      'amount_szl', mt.amount_szl
    )
  FROM public.marshal_transactions mt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.vehicle_reg = mt.vehicle_reg
      AND mt.timestamp
          BETWEEN (t.date::timestamptz + t.departure_time::time - interval '60 seconds')
              AND (t.date::timestamptz + t.departure_time::time + interval '60 seconds')
  )

  UNION ALL

  -- 2c. NEW: marshal_transaction with no settlement row
  --     (should be impossible after record_rank_fee(); invariant catches
  --      historical rows written before the atomic function existed)
  SELECT
    'money.fee_without_settlement'::text,
    'marshal_transaction'::text,
    mt.id,
    jsonb_build_object(
      'vehicle_reg', mt.vehicle_reg,
      'amount_szl', mt.amount_szl,
      'timestamp', mt.timestamp
    )
  FROM public.marshal_transactions mt
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rank_fee_payments rfp
    WHERE rfp.transaction_ref = mt.id
  )

  UNION ALL

  -- 2d. Completed intents with ≠ 1 credit
  SELECT
    'money.intent_credit_count_mismatch'::text,
    'payment_intent'::text,
    pi.id,
    jsonb_build_object(
      'status', pi.status,
      'credits', (
        SELECT count(*) FROM public.payment_credits pc WHERE pc.intent_id = pi.id
      )
    )
  FROM public.payment_intents pi
  WHERE pi.status = 'completed'
    AND (SELECT count(*) FROM public.payment_credits pc WHERE pc.intent_id = pi.id) <> 1

  UNION ALL

  -- 2e. NEW: a reversal row that is itself reversed
  --     (should be impossible due to CHECK constraint; invariant catches
  --      rows that predate the constraint)
  SELECT
    'money.reversal_double'::text,
    'marshal_transaction'::text,
    mt.id,
    jsonb_build_object(
      'reversal_of', mt.reversal_of,
      'reversed_by', mt.reversed_by
    )
  FROM public.marshal_transactions mt
  WHERE mt.reversal_of IS NOT NULL AND mt.reversed_by IS NOT NULL

  UNION ALL

  -- 2f. NEW: trips with driver_id = 'unassigned'
  --     (moved from operational — this is a money-chain accountability fact)
  SELECT
    'money.trip_unassigned_driver'::text,
    'trip'::text,
    t.id,
    jsonb_build_object(
      'vehicle_reg', t.vehicle_reg,
      'date', t.date,
      'departure_time', t.departure_time
    )
  FROM public.trips t
  WHERE t.driver_id = 'unassigned'

  UNION ALL

  -- 2g. NEW: rank_fee_payment with no matching marshal_transaction
  SELECT
    'money.settlement_without_fee'::text,
    'rank_fee_payment'::text,
    rfp.id,
    jsonb_build_object(
      'transaction_ref', rfp.transaction_ref,
      'vehicle_reg', rfp.vehicle_reg,
      'amount_szl', rfp.amount_szl
    )
  FROM public.rank_fee_payments rfp
  WHERE rfp.transaction_ref IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.marshal_transactions mt
      WHERE mt.id = rfp.transaction_ref
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_money_chain() TO service_role;

COMMIT;
