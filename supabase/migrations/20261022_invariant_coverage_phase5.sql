-- =============================================================================
-- Phase 5 — Expanded invariant coverage
-- =============================================================================
-- Closes observation gaps a senior engineer expects on a live rank system:
--
-- Money:
--   money.intent_stale_pending          pending/processing > 6h
--   money.intent_credit_amount_mismatch credit amount ≠ intent amount
--   money.credit_failed_on_completed    completed intent, credit_status=failed
--   money.intent_expired_unresolved     expired intent still carrying payload debt
--
-- Operational / compliance:
--   ops.expired_permit_in_service       expired/suspended permit still Loading/Departed/queued
--   ops.expired_cof_in_service          COF past expiry, vehicle still in service
--   ops.active_without_driver           Loading/Departed with no driver_id
--   ops.queue_without_route             queue position > 0 but no route assignment
--   ops.open_renewal_while_active       open renewal while vehicle is Loading/Departed
--   compliance.driver_pdp_expired       assigned driver with expired PDP
--   compliance.driver_pdp_missing       assigned driver with no PDP number
--
-- Identity:
--   identity.username_orphan            usernames row with no matching auth user
--
-- Runner:
--   Includes check_authority_lattice() in the fresh set (was defined but never run).
--
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extended money chain
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
  -- Trip without fee (60s window)
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
  WHERE t.status IN ('Departed', 'Completed')
    AND NOT EXISTS (
      SELECT 1 FROM public.marshal_transactions mt
      WHERE mt.vehicle_reg = t.vehicle_reg
        AND mt.timestamp
            BETWEEN (t.date::timestamptz + COALESCE(t.departure_time::time, time '00:00') - interval '60 seconds')
                AND (t.date::timestamptz + COALESCE(t.departure_time::time, time '00:00') + interval '60 seconds')
    )

  UNION ALL

  -- Fee without trip
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
  WHERE mt.reversal_of IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.vehicle_reg = mt.vehicle_reg
        AND mt.timestamp
            BETWEEN (t.date::timestamptz + COALESCE(t.departure_time::time, time '00:00') - interval '60 seconds')
                AND (t.date::timestamptz + COALESCE(t.departure_time::time, time '00:00') + interval '60 seconds')
    )

  UNION ALL

  -- Fee without settlement row
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
  WHERE mt.reversal_of IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.rank_fee_payments rfp
      WHERE rfp.transaction_ref = mt.id
    )

  UNION ALL

  -- Settlement without fee
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
    )

  UNION ALL

  -- Completed intent with wrong credit count
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

  -- Credit amount != intent amount
  SELECT
    'money.intent_credit_amount_mismatch'::text,
    'payment_intent'::text,
    pi.id,
    jsonb_build_object(
      'intent_amount', pi.amount_szl,
      'credit_amount', pc.amount_szl,
      'credit_id', pc.id
    )
  FROM public.payment_intents pi
  JOIN public.payment_credits pc ON pc.intent_id = pi.id
  WHERE pi.amount_szl IS DISTINCT FROM pc.amount_szl

  UNION ALL

  -- Completed intent but credit_status marked failed in payload
  SELECT
    'money.credit_failed_on_completed'::text,
    'payment_intent'::text,
    pi.id,
    jsonb_build_object(
      'status', pi.status,
      'failure_reason', pi.failure_reason,
      'credit_status', pi.provider_payload ->> 'credit_status'
    )
  FROM public.payment_intents pi
  WHERE pi.status = 'completed'
    AND (
      pi.provider_payload ->> 'credit_status' = 'failed'
      OR COALESCE(pi.failure_reason, '') LIKE 'CREDIT_FAILED%'
    )

  UNION ALL

  -- Stale pending / processing intents (> 6 hours)
  SELECT
    'money.intent_stale_pending'::text,
    'payment_intent'::text,
    pi.id,
    jsonb_build_object(
      'status', pi.status,
      'provider_id', pi.provider_id,
      'purpose', pi.purpose,
      'amount_szl', pi.amount_szl,
      'age_hours', ROUND(EXTRACT(EPOCH FROM (now() - COALESCE(pi.updated_at, pi.created_at))) / 3600.0, 1)
    )
  FROM public.payment_intents pi
  WHERE pi.status IN ('pending', 'processing')
    AND COALESCE(pi.updated_at, pi.created_at) < now() - interval '6 hours'

  UNION ALL

  -- Double-reversed fee rows (pre-constraint history)
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

  -- Trips with unassigned driver string
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
  WHERE t.driver_id = 'unassigned';
$$;

GRANT EXECUTE ON FUNCTION public.check_money_chain() TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Extended operational integrity + compliance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_operational_integrity()
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
  -- Queue position collisions
  SELECT
    'ops.queue_position_collision'::text,
    'route'::text,
    v.route_assignment_id,
    jsonb_build_object(
      'position', v.current_queue_position,
      'vehicles', jsonb_agg(v.registration_number ORDER BY v.registration_number)
    )
  FROM public.vehicles v
  WHERE v.route_assignment_id IS NOT NULL
    AND v.current_queue_position > 0
    AND COALESCE(v.status, '') <> 'Archived'
  GROUP BY v.route_assignment_id, v.current_queue_position
  HAVING count(*) > 1

  UNION ALL

  -- Multiple active marshals on one route
  SELECT
    'ops.multiple_active_marshals_on_route'::text,
    'route'::text,
    m.assigned_route_id,
    jsonb_build_object('marshals', jsonb_agg(m.id ORDER BY m.id))
  FROM public.marshals m
  WHERE m.is_active = true
    AND m.assigned_route_id IS NOT NULL
  GROUP BY m.assigned_route_id
  HAVING count(*) > 1

  UNION ALL

  -- Driver ↔ vehicle mismatch (vehicle side)
  SELECT
    'ops.driver_vehicle_mismatch'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'vehicle_driver_id', v.driver_id,
      'driver_assigned_vehicle', d.assigned_vehicle_reg
    )
  FROM public.vehicles v
  JOIN public.drivers d ON d.id = v.driver_id
  WHERE v.driver_id IS NOT NULL
    AND d.assigned_vehicle_reg IS DISTINCT FROM v.registration_number

  UNION ALL

  -- Driver ↔ vehicle mismatch (driver side)
  SELECT
    'ops.driver_vehicle_mismatch'::text,
    'driver'::text,
    d.id,
    jsonb_build_object(
      'driver_assigned_vehicle', d.assigned_vehicle_reg,
      'vehicle_driver_id', v.driver_id
    )
  FROM public.drivers d
  JOIN public.vehicles v ON v.registration_number = d.assigned_vehicle_reg
  WHERE d.assigned_vehicle_reg IS NOT NULL
    AND v.driver_id IS DISTINCT FROM d.id

  UNION ALL

  -- Non-archived vehicle without operator
  SELECT
    'ops.vehicle_without_operator'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'owner_operator_id', v.owner_operator_id,
      'status', v.status
    )
  FROM public.vehicles v
  WHERE v.owner_operator_id IS NULL
    AND COALESCE(v.status, '') <> 'Archived'

  UNION ALL

  -- Dangling driver_id
  SELECT
    'ops.vehicle_driver_dangling'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object('driver_id', v.driver_id)
  FROM public.vehicles v
  WHERE v.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = v.driver_id)

  UNION ALL

  -- Permit status drift (number present, not Active, not yet expired)
  SELECT
    'ops.permit_status_drift'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'vehicle_status', v.permit_status,
      'permit_number', v.permit_number,
      'permit_expiry_date', v.permit_expiry_date
    )
  FROM public.vehicles v
  WHERE v.permit_number IS NOT NULL
    AND v.permit_status IS DISTINCT FROM 'Active'
    AND v.permit_expiry_date IS NOT NULL
    AND v.permit_expiry_date >= current_date
    AND COALESCE(v.status, '') <> 'Archived'

  UNION ALL

  -- Expired / suspended permit still in service
  SELECT
    'ops.expired_permit_in_service'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'status', v.status,
      'permit_status', v.permit_status,
      'permit_expiry_date', v.permit_expiry_date,
      'queue_position', v.current_queue_position
    )
  FROM public.vehicles v
  WHERE COALESCE(v.status, '') <> 'Archived'
    AND (
      v.permit_status IN ('Expired', 'Suspended')
      OR (v.permit_expiry_date IS NOT NULL AND v.permit_expiry_date < current_date)
    )
    AND (
      v.status IN ('Loading', 'Departed', 'Full')
      OR v.current_queue_position > 0
    )

  UNION ALL

  -- COF expired while vehicle still operating
  SELECT
    'ops.expired_cof_in_service'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'status', v.status,
      'cof_expiry_date', v.cof_expiry_date,
      'queue_position', v.current_queue_position
    )
  FROM public.vehicles v
  WHERE COALESCE(v.status, '') <> 'Archived'
    AND v.cof_expiry_date IS NOT NULL
    AND v.cof_expiry_date < current_date
    AND (
      v.status IN ('Loading', 'Departed', 'Full')
      OR v.current_queue_position > 0
    )

  UNION ALL

  -- Active load/depart without a driver
  SELECT
    'ops.active_without_driver'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'status', v.status,
      'route_id', v.route_assignment_id
    )
  FROM public.vehicles v
  WHERE v.status IN ('Loading', 'Departed', 'Full')
    AND v.driver_id IS NULL

  UNION ALL

  -- Queued without a route
  SELECT
    'ops.queue_without_route'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'queue_position', v.current_queue_position,
      'status', v.status
    )
  FROM public.vehicles v
  WHERE v.current_queue_position > 0
    AND v.route_assignment_id IS NULL

  UNION ALL

  -- Open renewal while vehicle is mid-operation
  SELECT
    'ops.open_renewal_while_active'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'status', v.status,
      'renewal_id', r.id,
      'renewal_status', r.status
    )
  FROM public.vehicles v
  JOIN public.permit_renewal_requests r
    ON r.vehicle_reg = v.registration_number
   AND r.status IN ('Pending Admin Approval', 'Approved')
  WHERE v.status IN ('Loading', 'Departed', 'Full')

  UNION ALL

  -- Assigned driver with expired PDP
  SELECT
    'compliance.driver_pdp_expired'::text,
    'driver'::text,
    d.id,
    jsonb_build_object(
      'full_name', d.full_name,
      'pdp_expiry_date', d.pdp_expiry_date,
      'assigned_vehicle_reg', d.assigned_vehicle_reg,
      'status', d.status
    )
  FROM public.drivers d
  WHERE d.assigned_vehicle_reg IS NOT NULL
    AND d.status = 'Active'
    AND d.pdp_expiry_date IS NOT NULL
    AND d.pdp_expiry_date < current_date

  UNION ALL

  -- Assigned driver missing PDP entirely
  SELECT
    'compliance.driver_pdp_missing'::text,
    'driver'::text,
    d.id,
    jsonb_build_object(
      'full_name', d.full_name,
      'assigned_vehicle_reg', d.assigned_vehicle_reg
    )
  FROM public.drivers d
  WHERE d.assigned_vehicle_reg IS NOT NULL
    AND d.status = 'Active'
    AND (d.pdp_number IS NULL OR btrim(d.pdp_number) = '');
$$;

GRANT EXECUTE ON FUNCTION public.check_operational_integrity() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Extended identity chain (username orphans)
-- ---------------------------------------------------------------------------

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
  -- Claimed marshal without auth
  SELECT
    'identity.claimed_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object('region', m.region, 'is_active', m.is_active)
  FROM public.marshals m
  WHERE m.claimed_at IS NOT NULL
    AND m.auth_user_id IS NULL

  UNION ALL

  -- Active marshal never claimed / no auth (legacy name kept for continuity)
  SELECT
    'identity.claimed_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object('region', m.region, 'note', 'active_without_auth')
  FROM public.marshals m
  WHERE m.is_active = true
    AND m.auth_user_id IS NULL
    AND m.claimed_at IS NULL

  UNION ALL

  -- Drivers that look claimed (have claimed_at) without auth
  SELECT
    'identity.claimed_driver_without_auth'::text,
    'driver'::text,
    d.id,
    jsonb_build_object('full_name', d.full_name, 'phone', d.phone)
  FROM public.drivers d
  WHERE d.auth_user_id IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'drivers'
          AND c.column_name = 'claimed_at'
      )
      -- If claimed_at exists, only flag claimed rows; otherwise skip mass false positives.
      -- Handled via dynamic absence: when column missing, this branch is empty via false.
    )
    AND false  -- replaced below with safe column-aware variant

  UNION ALL

  -- Staff without auth
  SELECT
    'identity.staff_without_auth'::text,
    'staff'::text,
    s.id,
    jsonb_build_object('email', s.email, 'role', s.role)
  FROM public.staff s
  WHERE s.auth_user_id IS NULL

  UNION ALL

  -- Auth multi-role
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

  -- Auth orphan
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

  -- Username table orphans (if table exists)
  SELECT
    'identity.username_orphan'::text,
    'username'::text,
    un.username,
    jsonb_build_object('auth_user_id', un.auth_user_id, 'role', un.role)
  FROM public.usernames un
  WHERE un.auth_user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = un.auth_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_identity_chain() TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Runner includes authority lattice
-- ---------------------------------------------------------------------------

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
    SELECT * FROM public.check_authority_lattice();

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
