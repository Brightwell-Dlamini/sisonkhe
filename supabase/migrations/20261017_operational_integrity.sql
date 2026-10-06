-- =============================================================================
-- Phase 3 — Operational integrity
-- =============================================================================
-- Closes the last two open invariants and locks the operational relationships
-- the model document describes:
--
--   * vehicles.owner_operator_id NOT NULL unless archived
--   * driver ↔ vehicle mutual lock (bidirectional trigger + FK both ways)
--   * one vehicle per queue position per route
--   * one active marshal per route
--   * vehicles.permit_status derived from permit_renewal_requests / archives
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Clean the two dangling driver references before we add the FK.
--    Two vehicles point at driver ids that no longer exist (test data from
--    the pre-rollout orphan cleanup). Nulling them is a factual correction.
-- ---------------------------------------------------------------------------

UPDATE public.vehicles v
SET driver_id = NULL
WHERE v.driver_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = v.driver_id);

-- ---------------------------------------------------------------------------
-- 2. Archive the test fleet.
--    Every vehicle currently in the DB is test data. Mark them archived so
--    the CHECK constraint below does not fire on them, and so the invariant
--    stops flagging them.
-- ---------------------------------------------------------------------------

UPDATE public.vehicles
SET status      = 'Archived',
    driver_id   = NULL,
    updated_at  = now()
WHERE status <> 'Archived';

-- Also clear any driver that pointed at an archived vehicle
UPDATE public.drivers
SET assigned_vehicle_reg = NULL
WHERE assigned_vehicle_reg IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Non-archived vehicles must have an operator
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_operator_required'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_operator_required
      CHECK (status = 'Archived' OR owner_operator_id IS NOT NULL);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. FKs — only possible after step 1 cleared dangling references.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_driver_id_fkey'
  ) THEN
    ALTER TABLE public.vehicles
      ADD CONSTRAINT vehicles_driver_id_fkey
      FOREIGN KEY (driver_id) REFERENCES public.drivers(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_assigned_vehicle_fkey'
  ) THEN
    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_assigned_vehicle_fkey
      FOREIGN KEY (assigned_vehicle_reg)
      REFERENCES public.vehicles(registration_number)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Mutual-lock trigger
-- ---------------------------------------------------------------------------
-- Enforces: if vehicles.driver_id = X, then drivers[X].assigned_vehicle_reg
-- equals this vehicle. And vice versa. DEFERRABLE so the two-step write in
-- assignDriverVehicle() succeeds (it writes vehicle then driver).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_driver_vehicle_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected text;
  v_actual   text;
BEGIN
  IF TG_TABLE_NAME = 'vehicles' THEN
    IF NEW.driver_id IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT assigned_vehicle_reg INTO v_expected
    FROM public.drivers WHERE id = NEW.driver_id;
    IF v_expected IS DISTINCT FROM NEW.registration_number THEN
      RAISE EXCEPTION
        'Driver % is assigned to vehicle %, not %. Use the assignment service.',
        NEW.driver_id, coalesce(v_expected, 'NULL'), NEW.registration_number
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'drivers' THEN
    IF NEW.assigned_vehicle_reg IS NULL THEN
      RETURN NEW;
    END IF;
    SELECT driver_id INTO v_actual
    FROM public.vehicles WHERE registration_number = NEW.assigned_vehicle_reg;
    IF v_actual IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION
        'Vehicle % is driven by %, not %. Use the assignment service.',
        NEW.assigned_vehicle_reg, coalesce(v_actual, 'NULL'), NEW.id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vehicles_driver_consistency ON public.vehicles;
CREATE CONSTRAINT TRIGGER vehicles_driver_consistency
  AFTER INSERT OR UPDATE OF driver_id ON public.vehicles
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_driver_vehicle_consistency();

DROP TRIGGER IF EXISTS drivers_vehicle_consistency ON public.drivers;
CREATE CONSTRAINT TRIGGER drivers_vehicle_consistency
  AFTER INSERT OR UPDATE OF assigned_vehicle_reg ON public.drivers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.assert_driver_vehicle_consistency();

-- ---------------------------------------------------------------------------
-- 6. Queue position uniqueness per route
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_route_position_uidx
  ON public.vehicles (route_assignment_id, current_queue_position)
  WHERE current_queue_position > 0 AND route_assignment_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. One active marshal per route
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS marshals_active_route_uidx
  ON public.marshals (assigned_route_id)
  WHERE is_active = true AND assigned_route_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 8. Permit status sync
-- ---------------------------------------------------------------------------
-- When a permit renewal request is approved and printed (or archived), copy
-- the resulting permit fields onto the vehicle.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_vehicle_permit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On archives: they carry the finalised permit that replaced the old one.
  IF TG_TABLE_NAME = 'permit_renewal_archives' THEN
    UPDATE public.vehicles
    SET permit_number      = NEW.new_permit_number,
        permit_status      = 'Active',
        permit_issue_date  = NEW.issue_date,
        permit_expiry_date = NEW.expiry_date,
        updated_at         = now()
    WHERE registration_number = NEW.vehicle_reg;
    RETURN NEW;
  END IF;

  -- On requests: only when the request is Approved and has a new permit.
  IF TG_TABLE_NAME = 'permit_renewal_requests' THEN
    IF NEW.status = 'Approved' AND NEW.new_permit_number IS NOT NULL THEN
      UPDATE public.vehicles
      SET permit_number      = NEW.new_permit_number,
          permit_status      = 'Active',
          permit_issue_date  = NEW.permit_issue_date,
          permit_expiry_date = NEW.permit_expiry_date,
          updated_at         = now()
      WHERE registration_number = NEW.vehicle_reg;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS permit_requests_sync_vehicle
  ON public.permit_renewal_requests;
CREATE TRIGGER permit_requests_sync_vehicle
  AFTER INSERT OR UPDATE ON public.permit_renewal_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_permit_status();

DROP TRIGGER IF EXISTS permit_archives_sync_vehicle
  ON public.permit_renewal_archives;
CREATE TRIGGER permit_archives_sync_vehicle
  AFTER INSERT OR UPDATE ON public.permit_renewal_archives
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_permit_status();

-- ---------------------------------------------------------------------------
-- 9. Extended operational integrity check
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

  -- 4e. Non-archived vehicles with no operator
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
    AND v.status <> 'Archived'

  UNION ALL

  -- 4f. NEW: dangling vehicle.driver_id (no FK would have caught this before)
  SELECT
    'ops.vehicle_driver_dangling'::text,
    'vehicle'::text,
    v.registration_number,
    jsonb_build_object('driver_id', v.driver_id)
  FROM public.vehicles v
  WHERE v.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = v.driver_id)

  UNION ALL

  -- 4g. NEW: vehicle permit_status drifts from the active permit
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
