-- =============================================================================
-- Phase 2 cleanup — remove ops.trip_unassigned_driver
-- =============================================================================
-- The same fact is now reported by money.trip_unassigned_driver in
-- check_money_chain(). Removing it from the operational check avoids
-- double-logging when the invariant fires.
--
-- Safe to re-run. Idempotent.
-- =============================================================================

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

  -- 4c. Driver ↔ Vehicle mutual inconsistency (vehicle side)
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

  -- 4d. Driver ↔ Vehicle mutual inconsistency (driver side)
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

  -- 4e. Vehicles with no operator (Phase 3 will make this NOT NULL)
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
  WHERE v.owner_operator_id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.check_operational_integrity() TO service_role;
