-- =============================================================================
-- Phase 5 — Expanded invariant coverage
-- NOTE: Prefer applying 20261025_fix_username_uuid_cast.sql after this file.
-- Identity section below uses u.id::text = un.auth_user_id (TEXT column).
-- =============================================================================

BEGIN;

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
            BETWEEN (t.date::timestamptz + COALESCE(NULLIF(t.departure_time, '')::time, time '00:00') - interval '60 seconds')
                AND (t.date::timestamptz + COALESCE(NULLIF(t.departure_time, '')::time, time '00:00') + interval '60 seconds')
    )

  UNION ALL

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
            BETWEEN (t.date::timestamptz + COALESCE(NULLIF(t.departure_time, '')::time, time '00:00') - interval '60 seconds')
                AND (t.date::timestamptz + COALESCE(NULLIF(t.departure_time::time, time '00:00') + interval '60 seconds')
    )

  UNION ALL

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

  SELECT
    'money.intent_credit_count_mismatch'::text,
    'payment_intent'::text,
    pi.id,
    jsonb_build_object(
      'status', pi.status,
      'credits', (SELECT count(*) FROM public.payment_credits pc WHERE pc.intent_id = pi.id)
    )
  FROM public.payment_intents pi
  WHERE pi.status = 'completed'
    AND (SELECT count(*) FROM public.payment_credits pc WHERE pc.intent_id = pi.id) <> 1

  UNION ALL

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

-- Ops + compliance left to 20261022 original / 20261024 runner path.
-- Identity fixed here so a partial re-run of this file does not break on uuid=text.

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
  SELECT
    'identity.claimed_marshal_without_auth'::text,
    'marshal'::text,
    m.id,
    jsonb_build_object('region', m.region, 'claimed_at', m.claimed_at)
  FROM public.marshals m
  WHERE m.claimed_at IS NOT NULL
    AND m.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.claimed_driver_without_auth'::text,
    'driver'::text,
    d.id,
    jsonb_build_object('full_name', d.full_name, 'phone', d.phone, 'claimed_at', d.claimed_at)
  FROM public.drivers d
  WHERE d.claimed_at IS NOT NULL
    AND d.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.staff_without_auth'::text,
    'staff'::text,
    s.id,
    jsonb_build_object('email', s.email, 'role', s.role)
  FROM public.staff s
  WHERE s.auth_user_id IS NULL

  UNION ALL

  SELECT
    'identity.claimed_operator_without_auth'::text,
    'operator'::text,
    o.id,
    jsonb_build_object('name', o.name, 'company_name', o.company_name, 'claimed_at', o.claimed_at)
  FROM public.fleet_operators o
  WHERE o.claimed_at IS NOT NULL
    AND o.auth_user_id IS NULL

  UNION ALL

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

  SELECT
    'identity.auth_user_app_metadata_missing'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object(
      'email', u.email,
      'user_metadata_role', u.raw_user_meta_data->>'role'
    )
  FROM auth.users u
  WHERE coalesce(u.raw_app_meta_data->>'role', '') = ''
    AND (
      EXISTS (SELECT 1 FROM public.staff           s WHERE s.auth_user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.marshals        m WHERE m.auth_user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.drivers         d WHERE d.auth_user_id = u.id)
      OR EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id)
    )

  UNION ALL

  SELECT
    'identity.auth_user_metadata_role_mismatch'::text,
    'auth_user'::text,
    u.id::text,
    jsonb_build_object(
      'email', u.email,
      'app_role', u.raw_app_meta_data->>'role',
      'expected_role',
        CASE
          WHEN EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id) THEN
            (SELECT s.role FROM public.staff s WHERE s.auth_user_id = u.id LIMIT 1)
          WHEN EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id) THEN 'marshal'
          WHEN EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id) THEN 'driver'
          WHEN EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id) THEN 'operator'
          ELSE NULL
        END
    )
  FROM auth.users u
  WHERE u.raw_app_meta_data->>'role' IS NOT NULL
    AND u.raw_app_meta_data->>'role' <> (
      CASE
        WHEN EXISTS (SELECT 1 FROM public.staff s WHERE s.auth_user_id = u.id) THEN
          (SELECT s.role FROM public.staff s WHERE s.auth_user_id = u.id LIMIT 1)
        WHEN EXISTS (SELECT 1 FROM public.marshals m WHERE m.auth_user_id = u.id) THEN 'marshal'
        WHEN EXISTS (SELECT 1 FROM public.drivers d WHERE d.auth_user_id = u.id) THEN 'driver'
        WHEN EXISTS (SELECT 1 FROM public.fleet_operators o WHERE o.auth_user_id = u.id) THEN 'operator'
        ELSE NULL
      END
    )

  UNION ALL

  SELECT
    'identity.username_orphan'::text,
    'username'::text,
    un.username,
    jsonb_build_object('auth_user_id', un.auth_user_id, 'role', un.role)
  FROM public.usernames un
  WHERE un.auth_user_id IS NOT NULL
    AND btrim(un.auth_user_id) <> ''
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id::text = un.auth_user_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_identity_chain() TO service_role;

COMMIT;
