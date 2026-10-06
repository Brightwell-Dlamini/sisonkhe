-- =============================================================================
-- Phase 0 — Invariant observation infrastructure
-- =============================================================================
-- Creates:
--   * public.invariant_violations        — the log
--   * public.check_money_chain()         — reconciliation query 1
--   * public.check_identity_chain()      — reconciliation query 2
--   * public.check_operational_integrity() — reconciliation query 3
--   * public.run_all_invariant_checks()  — the runner (writes to the log)
--
-- Phase 0 NEVER fixes anything. It only observes and records.
-- Safe to re-run. Idempotent.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invariant_violations (
  id              text        PRIMARY KEY,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  invariant       text        NOT NULL,
  entity_type     text,
  entity_id       text,
  detail          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  resolved_at     timestamptz,
  resolution_note text
);

CREATE INDEX IF NOT EXISTS invariant_violations_detected_idx
  ON public.invariant_violations (detected_at DESC);

CREATE INDEX IF NOT EXISTS invariant_violations_invariant_idx
  ON public.invariant_violations (invariant);

CREATE INDEX IF NOT EXISTS invariant_violations_unresolved_idx
  ON public.invariant_violations (invariant)
  WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Money chain check
-- ---------------------------------------------------------------------------
-- Trip → Rank Fee → Payment.
-- A "Departed" trip should have a corresponding marshal_transaction within
-- 60 seconds. A marshal_transaction should have a corresponding trip within
-- 60 seconds. A "completed" payment_intent should have exactly one credit.
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

  -- 2c. Completed intents with ≠ 1 credit
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
    AND (SELECT count(*) FROM public.payment_credits pc WHERE pc.intent_id = pi.id) <> 1;
$$;

-- ---------------------------------------------------------------------------
-- 3. Identity chain check
-- ---------------------------------------------------------------------------
-- Every auth user maps to exactly one role table.
-- Every role-entity row that is active must have an auth user.
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
  -- 3a. Active marshals without an auth user
  SELECT
    'identity.active_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object('staff_number', m.staff_number, 'region', m.region)
  FROM public.marshals m
  WHERE m.is_active = true
    AND m.auth_user_id IS NULL

  UNION ALL

  -- 3b. Drivers without an auth user
  SELECT
    'identity.driver_without_auth'::text,
    'driver'::text,
    d.id,
    jsonb_build_object('full_name', d.full_name, 'phone', d.phone)
  FROM public.drivers d
  WHERE d.auth_user_id IS NULL

  UNION ALL

  -- 3c. Staff without an auth user (structurally impossible, but check anyway)
  SELECT
    'identity.staff_without_auth'::text,
    'staff'::text,
    s.id,
    jsonb_build_object('email', s.email, 'role', s.role)
  FROM public.staff s
  WHERE s.auth_user_id IS NULL

  UNION ALL

  -- 3d. Operators without an auth user
  SELECT
    'identity.operator_without_auth'::text,
    'operator'::text,
    o.id,
    jsonb_build_object('name', o.name, 'company_name', o.company_name)
  FROM public.fleet_operators o
  WHERE o.auth_user_id IS NULL

  UNION ALL

  -- 3e. Auth users claimed by more than one role table
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

  -- 3f. Auth users claimed by no role table at all
  SELECT
    'identity.auth_user_orphan'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object('email', u.email, 'created_at', u.created_at)
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id);
$$;

-- ---------------------------------------------------------------------------
-- 4. Operational integrity check
-- ---------------------------------------------------------------------------
-- Queue positions unique per route.
-- One active marshal per route (once that invariant exists — for now, report
-- duplicates if they exist).
-- Driver ↔ Vehicle mutual consistency (report disagreements).
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
  -- 4a. Queue position collisions within a route
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
  GROUP BY v.route_assignment_id, v.current_queue_position
  HAVING count(*) > 1

  UNION ALL

  -- 4b. More than one active marshal on the same route
  SELECT
    'ops.multiple_active_marshals_on_route'::text,
    'route'::text,
    m.assigned_route_id,
    jsonb_build_object(
      'marshals', jsonb_agg(m.id ORDER BY m.id)
    )
  FROM public.marshals m
  WHERE m.is_active = true
    AND m.assigned_route_id IS NOT NULL
  GROUP BY m.assigned_route_id
  HAVING count(*) > 1

  UNION ALL

  -- 4c. Driver ↔ Vehicle mutual inconsistency
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

  -- 4d. Driver has assigned_vehicle_reg pointing at a vehicle that doesn't
  --     point back at them
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

  -- 4e. Vehicles with no operator (Phase 2 will make this NOT NULL; Phase 0
  --     only reports)
  SELECT
    'ops.vehicle_without_operator'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'owner_operator_id', v.owner_operator_id,
      'owner_name', v.owner_name,
      'status', v.status
    )
  FROM public.vehicles v
  WHERE v.owner_operator_id IS NULL

  UNION ALL

  -- 4f. Trips with driver_id = 'unassigned' (the app-level bug the model doc
  --     identified)
  SELECT
    'ops.trip_unassigned_driver'::text,
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

-- ---------------------------------------------------------------------------
-- 5. The runner
-- ---------------------------------------------------------------------------
-- Calls all three checks, inserts every returned row into the log.
-- Returns a summary. NEVER fixes anything. NEVER deletes anything.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.run_all_invariant_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id    text;
  v_money     int := 0;
  v_identity  int := 0;
  v_ops       int := 0;
  v_total     int := 0;
BEGIN
  v_run_id := 'inv_' || replace(gen_random_uuid()::text, '-', '');

  -- Money chain
  WITH rows AS (
    SELECT * FROM public.check_money_chain()
  ), ins AS (
    INSERT INTO public.invariant_violations
      (id, invariant, entity_type, entity_id, detail)
    SELECT
      v_run_id || '_m_' || row_number() OVER (),
      invariant, entity_type, entity_id, detail
    FROM rows
    RETURNING 1
  )
  SELECT count(*) INTO v_money FROM ins;

  -- Identity chain
  WITH rows AS (
    SELECT * FROM public.check_identity_chain()
  ), ins AS (
    INSERT INTO public.invariant_violations
      (id, invariant, entity_type, entity_id, detail)
    SELECT
      v_run_id || '_i_' || row_number() OVER (),
      invariant, entity_type, entity_id, detail
    FROM rows
    RETURNING 1
  )
  SELECT count(*) INTO v_identity FROM ins;

  -- Operational integrity
  WITH rows AS (
    SELECT * FROM public.check_operational_integrity()
  ), ins AS (
    INSERT INTO public.invariant_violations
      (id, invariant, entity_type, entity_id, detail)
    SELECT
      v_run_id || '_o_' || row_number() OVER (),
      invariant, entity_type, entity_id, detail
    FROM rows
    RETURNING 1
  )
  SELECT count(*) INTO v_ops FROM ins;

  v_total := v_money + v_identity + v_ops;

  RETURN jsonb_build_object(
    'run_id',     v_run_id,
    'ran_at',     now(),
    'money',      v_money,
    'identity',   v_identity,
    'operational', v_ops,
    'total',      v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_money_chain()           TO service_role;
GRANT EXECUTE ON FUNCTION public.check_identity_chain()        TO service_role;
GRANT EXECUTE ON FUNCTION public.check_operational_integrity() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_all_invariant_checks()    TO service_role;

COMMIT;
