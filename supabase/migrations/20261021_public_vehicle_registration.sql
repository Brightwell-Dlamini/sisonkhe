-- =============================================================================
-- Phase 5 — Public vehicle registration source
-- =============================================================================
-- Public /register/vehicle creates asset-only rows with no operator link.
-- The prior CHECK (vehicles_operator_required) and the ops.vehicle_without_operator
-- invariant both assume "non-archived => has operator", which was true before
-- public enrolment existed. We add a source marker so the two legitimate
-- states can be distinguished:
--
--   registration_source = 'staff'  -> created by staff, must have operator
--   registration_source = 'public' -> self-enrolled, operator linked later
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Add the source column
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS registration_source text NOT NULL DEFAULT 'staff';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_registration_source_check'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_registration_source_check
      CHECK (registration_source IN ('public', 'staff'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Relax the operator-required check
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_operator_required;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_operator_required
  CHECK (
    status = 'Archived'
    OR owner_operator_id IS NOT NULL
    OR registration_source = 'public'
  );

-- ---------------------------------------------------------------------------
-- 3. Adjust the operational integrity check
--    Public rows without an operator are work items, not violations. They
--    surface in the admin queue via the VehiclesList "unassigned" filter,
--    not via invariant_violations.
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
    jsonb_build_object('marshals', jsonb_agg(m.id ORDER BY m.id))
  FROM public.marshals m
  WHERE m.is_active = true
    AND m.assigned_route_id IS NOT NULL
  GROUP BY m.assigned_route_id
  HAVING count(*) > 1

  UNION ALL

  -- 4c. Driver <-> Vehicle mutual inconsistency (vehicle side)
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

  -- 4d. Driver <-> Vehicle mutual inconsistency (driver side)
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

  -- 4e. Non-archived STAFF vehicles with no operator.
  --     Public self-registrations are exempt — staff link them later.
  SELECT
    'ops.vehicle_without_operator'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object(
      'owner_operator_id', v.owner_operator_id,
      'owner_name', v.owner_name,
      'status', v.status,
      'registration_source', v.registration_source
    )
  FROM public.vehicles v
  WHERE v.owner_operator_id IS NULL
    AND v.status <> 'Archived'
    AND v.registration_source <> 'public'

  UNION ALL

  -- 4f. Dangling vehicle.driver_id
  SELECT
    'ops.vehicle_driver_dangling'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object('driver_id', v.driver_id)
  FROM public.vehicles v
  WHERE v.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = v.driver_id)

  UNION ALL

  -- 4g. vehicle permit_status drifts from the active permit
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
    AND v.permit_expiry_date >= current_date;
$$;

GRANT EXECUTE ON FUNCTION public.check_operational_integrity() TO service_role;

COMMIT;
