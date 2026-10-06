-- =============================================================================
-- Atomic driver ↔ vehicle assignment
-- =============================================================================
-- Problem: bidirectional triggers required BOTH sides already match before either
-- side could be written — making new assignments impossible.
--
-- Fix:
--   1. Session flag app.assignment_service = 'on' skips guards
--   2. SECURITY DEFINER RPCs set the flag and write both sides in one transaction
--   3. App layer calls the RPCs exclusively for link/unlink
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Guard functions (replace any prior versions)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_drivers_assignment_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id text;
BEGIN
  -- Skip when assignment service RPC is in progress
  IF coalesce(current_setting('app.assignment_service', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  -- Clearing is always allowed from direct writes that are unlinking
  IF NEW.assigned_vehicle_reg IS NULL THEN
    RETURN NEW;
  END IF;

  -- Setting plate: vehicle must already point at this driver
  SELECT driver_id INTO v_driver_id
  FROM public.vehicles
  WHERE registration_number = NEW.assigned_vehicle_reg;

  IF v_driver_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION
      'Could not update driver: Vehicle % is driven by %, not %. Use the assignment service.',
      NEW.assigned_vehicle_reg,
      coalesce(v_driver_id, 'NULL'),
      NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_vehicles_assignment_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plate text;
BEGIN
  IF coalesce(current_setting('app.assignment_service', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT assigned_vehicle_reg INTO v_plate
  FROM public.drivers
  WHERE id = NEW.driver_id;

  IF v_plate IS DISTINCT FROM NEW.registration_number THEN
    RAISE EXCEPTION
      'Could not update vehicle: Driver % is assigned to vehicle %, not %. Use the assignment service.',
      NEW.driver_id,
      coalesce(v_plate, 'NULL'),
      NEW.registration_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drivers_assignment_guard ON public.drivers;
DROP TRIGGER IF EXISTS trg_vehicles_assignment_guard ON public.vehicles;
-- common alternate names from earlier experiments
DROP TRIGGER IF EXISTS enforce_driver_vehicle_consistency ON public.drivers;
DROP TRIGGER IF EXISTS enforce_vehicle_driver_consistency ON public.vehicles;
DROP TRIGGER IF EXISTS drivers_assignment_guard ON public.drivers;
DROP TRIGGER IF EXISTS vehicles_assignment_guard ON public.vehicles;

CREATE TRIGGER trg_drivers_assignment_guard
  BEFORE UPDATE OF assigned_vehicle_reg ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_drivers_assignment_guard();

CREATE TRIGGER trg_vehicles_assignment_guard
  BEFORE UPDATE OF driver_id ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vehicles_assignment_guard();

-- ---------------------------------------------------------------------------
-- Atomic assign
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_driver_vehicle_atomic(
  p_driver_id   text,
  p_vehicle_reg text,
  p_force       boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver        record;
  v_vehicle       record;
  v_prev_reg      text;
  v_prev_driver   text;
  v_released_drv  text := NULL;
  v_released_reg  text := NULL;
  v_plate         text;
BEGIN
  v_plate := upper(trim(regexp_replace(coalesce(p_vehicle_reg, ''), '\s+', ' ', 'g')));

  IF p_driver_id IS NULL OR length(trim(p_driver_id)) = 0 THEN
    RAISE EXCEPTION 'Driver ID is required';
  END IF;
  IF length(v_plate) = 0 THEN
    RAISE EXCEPTION 'Vehicle registration is required';
  END IF;

  SELECT id, full_name, national_id, assigned_vehicle_reg, status, pdp_status, pdp_expiry_date
  INTO v_driver
  FROM public.drivers
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver % not found', p_driver_id;
  END IF;

  SELECT registration_number, make, model, vic, driver_id, status
  INTO v_vehicle
  FROM public.vehicles
  WHERE registration_number = v_plate
     OR replace(upper(registration_number), ' ', '') = replace(v_plate, ' ', '')
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle % not found', v_plate;
  END IF;

  v_plate := v_vehicle.registration_number;
  v_prev_reg := v_driver.assigned_vehicle_reg;
  v_prev_driver := v_vehicle.driver_id;

  -- Soft status blocks (hard — not overridable)
  IF coalesce(v_driver.status, 'Active') IN ('Suspended', 'On Leave', 'Off-Duty') THEN
    RAISE EXCEPTION 'Driver % is % and cannot be assigned', v_driver.full_name, v_driver.status;
  END IF;

  IF NOT p_force THEN
    IF v_prev_reg IS NOT NULL
       AND replace(upper(v_prev_reg), ' ', '') <> replace(upper(v_plate), ' ', '') THEN
      RAISE EXCEPTION 'Driver is already on %. Unlink or force transfer.', v_prev_reg;
    END IF;
    IF v_prev_driver IS NOT NULL AND v_prev_driver <> p_driver_id THEN
      RAISE EXCEPTION 'Vehicle % already has a driver. Unlink or force transfer.', v_plate;
    END IF;
  END IF;

  -- Enable skip for guards (transaction-local)
  PERFORM set_config('app.assignment_service', 'on', true);

  -- Release previous occupant of this vehicle
  IF v_prev_driver IS NOT NULL AND v_prev_driver <> p_driver_id THEN
    UPDATE public.drivers
    SET assigned_vehicle_reg = NULL
    WHERE id = v_prev_driver;
    v_released_drv := v_prev_driver;
  END IF;

  -- Release previous vehicle of this driver
  IF v_prev_reg IS NOT NULL
     AND replace(upper(v_prev_reg), ' ', '') <> replace(upper(v_plate), ' ', '') THEN
    UPDATE public.vehicles
    SET driver_id = NULL
    WHERE registration_number = v_prev_reg
       OR replace(upper(registration_number), ' ', '') = replace(upper(v_prev_reg), ' ', '');
    v_released_reg := upper(trim(v_prev_reg));
  END IF;

  -- Write both sides (guards skipped)
  UPDATE public.drivers
  SET assigned_vehicle_reg = v_plate
  WHERE id = p_driver_id;

  UPDATE public.vehicles
  SET driver_id = p_driver_id
  WHERE registration_number = v_plate;

  -- Split-brain cleanup: any other vehicle still pointing at this driver
  UPDATE public.vehicles
  SET driver_id = NULL
  WHERE driver_id = p_driver_id
    AND registration_number <> v_plate;

  PERFORM set_config('app.assignment_service', 'off', true);

  RETURN jsonb_build_object(
    'driverId', p_driver_id,
    'driverName', v_driver.full_name,
    'nationalId', v_driver.national_id,
    'vehicleReg', v_plate,
    'vehicleMake', v_vehicle.make,
    'vehicleModel', v_vehicle.model,
    'vic', v_vehicle.vic,
    'releasedDriverId', v_released_drv,
    'releasedVehicleReg', v_released_reg
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Atomic unassign
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.unassign_driver_vehicle_atomic(
  p_driver_id   text DEFAULT NULL,
  p_vehicle_reg text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id text := p_driver_id;
  v_plate     text;
BEGIN
  IF p_vehicle_reg IS NOT NULL AND length(trim(p_vehicle_reg)) > 0 THEN
    v_plate := upper(trim(regexp_replace(p_vehicle_reg, '\s+', ' ', 'g')));
    IF v_driver_id IS NULL THEN
      SELECT driver_id INTO v_driver_id
      FROM public.vehicles
      WHERE registration_number = v_plate
         OR replace(upper(registration_number), ' ', '') = replace(v_plate, ' ', '')
      LIMIT 1;
    END IF;
    SELECT registration_number INTO v_plate
    FROM public.vehicles
    WHERE registration_number = v_plate
       OR replace(upper(registration_number), ' ', '') = replace(v_plate, ' ', '')
    LIMIT 1;
  END IF;

  IF v_driver_id IS NOT NULL AND v_plate IS NULL THEN
    SELECT assigned_vehicle_reg INTO v_plate
    FROM public.drivers WHERE id = v_driver_id;
  END IF;

  IF v_driver_id IS NULL AND v_plate IS NULL THEN
    RAISE EXCEPTION 'Nothing to unlink';
  END IF;

  PERFORM set_config('app.assignment_service', 'on', true);

  IF v_plate IS NOT NULL THEN
    UPDATE public.vehicles SET driver_id = NULL WHERE registration_number = v_plate;
  END IF;

  IF v_driver_id IS NOT NULL THEN
    UPDATE public.drivers SET assigned_vehicle_reg = NULL WHERE id = v_driver_id;
    UPDATE public.vehicles SET driver_id = NULL WHERE driver_id = v_driver_id;
  END IF;

  PERFORM set_config('app.assignment_service', 'off', true);

  RETURN jsonb_build_object(
    'driverId', v_driver_id,
    'vehicleReg', v_plate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_driver_vehicle_atomic(text, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.unassign_driver_vehicle_atomic(text, text) TO service_role;

COMMIT;
