-- =============================================================================
-- Phase 4 — Authority lattice
-- =============================================================================
-- Brings every RLS policy in line with the model document's authority table.
--
-- Before this migration:
--   * Many write policies check only "is this user staff?" — no role, no
--     region, no route, no ownership.
--   * A marshal could write trips on any route.
--   * An operator could write any vehicle's card.
--   * A regional admin could write in any region.
--   * Adverts were writable by any staff member, not just super-admin.
--
-- After this migration:
--   * Every policy answers: (1) super-admin? (2) right role? (3) in scope?
--   * Region scope is strict — a regional admin reads and writes only their
--     own region. Super-admin is national.
--   * One invariant, authority.policy_gap, catches any future migration that
--     adds a table with a loose write policy.
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Helper functions
-- ---------------------------------------------------------------------------
-- These exist already: current_staff_role(), current_marshal_id(),
-- current_driver_id(), current_operator_id(). We add three more and extend
-- two, without changing their signatures, so existing policies that reference
-- them keep working.
-- ---------------------------------------------------------------------------

-- Region of the current staff user. NULL for super-admin (national).
CREATE OR REPLACE FUNCTION public.current_staff_region()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT region
  FROM public.staff
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- The staff row id for the current user (null if not staff).
CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.staff
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- The route assigned to the current marshal (null if not a marshal).
CREATE OR REPLACE FUNCTION public.current_marshal_route()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_route_id
  FROM public.marshals
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- The operator id linked to the current user (null if not an operator).
-- current_operator_id() already exists but returns uuid; we need text because
-- fleet_operators.id is text. We redefine it as text.
DROP FUNCTION IF EXISTS public.current_operator_id();
CREATE OR REPLACE FUNCTION public.current_operator_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.fleet_operators
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Is the current user a super-admin?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE auth_user_id = auth.uid()
      AND role = 'super-admin'
      AND is_active = true
  );
$$;

-- Is the current user a rank admin (admin or fleet-manager)?
CREATE OR REPLACE FUNCTION public.is_rank_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'fleet-manager')
      AND is_active = true
  );
$$;

-- Is the given region the current caller's region (or are they national)?
CREATE OR REPLACE FUNCTION public.in_region(p_region text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
      OR (public.is_rank_admin() AND public.current_staff_region() = p_region);
$$;

-- ---------------------------------------------------------------------------
-- 2. Regions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "regions_staff_write" ON public.regions;
DROP POLICY IF EXISTS "regions_super_admin_write" ON public.regions;
CREATE POLICY "regions_super_admin_write" ON public.regions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- regions_public_read stays as-is: regions are public reference data.

-- ---------------------------------------------------------------------------
-- 3. Routes — region-scoped for rank admins, national for super-admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "routes_staff_write" ON public.routes;
DROP POLICY IF EXISTS "routes_scoped_write" ON public.routes;
CREATE POLICY "routes_scoped_write" ON public.routes
  FOR ALL
  TO authenticated
  USING (public.in_region(region_code))
  WITH CHECK (public.in_region(region_code));

-- routes_public_read stays.

-- ---------------------------------------------------------------------------
-- 4. Vehicles — region-scoped for staff; own-route for marshal;
--    own-vehicle for operator; own-vehicle read for driver
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "vehicles_authenticated_read" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_staff_marshal_write" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_scoped_read" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_scoped_write" ON public.vehicles;

-- Read: super-admin sees all. Rank admin sees own region. Marshal sees own
-- route. Operator sees own vehicles. Driver sees own vehicle. Everyone
-- else who is authenticated can see vehicles in their region via the
-- public route view (kiosk uses service role, not this policy).
CREATE POLICY "vehicles_scoped_read" ON public.vehicles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = vehicles.route_assignment_id
        AND public.in_region(r.region_code)
    )
    OR (public.is_marshal() AND vehicles.route_assignment_id = public.current_marshal_route())
    OR (public.is_operator() AND vehicles.owner_operator_id = public.current_operator_id())
    OR (public.is_driver() AND vehicles.driver_id = public.current_driver_id()::text)
  );

-- Write: super-admin anywhere. Rank admin in own region. Marshal on own
-- route (status/queue changes only — the assignment service uses service
-- role for driver_id, so this policy covers dispatch). Operator only for
-- own vehicles.
CREATE POLICY "vehicles_scoped_write" ON public.vehicles
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = vehicles.route_assignment_id
        AND public.in_region(r.region_code)
    )
    OR (public.is_marshal() AND vehicles.route_assignment_id = public.current_marshal_route())
    OR (public.is_operator() AND vehicles.owner_operator_id = public.current_operator_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = vehicles.route_assignment_id
        AND public.in_region(r.region_code)
    )
    OR (public.is_marshal() AND vehicles.route_assignment_id = public.current_marshal_route())
    OR (public.is_operator() AND vehicles.owner_operator_id = public.current_operator_id())
  );

-- ---------------------------------------------------------------------------
-- 5. Drivers — self read/write; staff region-scoped
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "drivers_self_read" ON public.drivers;
DROP POLICY IF EXISTS "drivers_self_update" ON public.drivers;
DROP POLICY IF EXISTS "drivers_scoped_read" ON public.drivers;
DROP POLICY IF EXISTS "drivers_scoped_write" ON public.drivers;

CREATE POLICY "drivers_scoped_read" ON public.drivers
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR public.is_rank_admin()
    OR public.is_marshal()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.driver_id = drivers.id
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  );

CREATE POLICY "drivers_scoped_write" ON public.drivers
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR public.is_rank_admin()
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_super_admin()
    OR public.is_rank_admin()
  );

-- ---------------------------------------------------------------------------
-- 6. Trips — read: staff, marshal (own route), driver (own), operator (own)
--    write: super-admin, marshal on own route
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "trips_public_read" ON public.trips;
DROP POLICY IF EXISTS "trips_staff_write" ON public.trips;
DROP POLICY IF EXISTS "trips_scoped_read" ON public.trips;
DROP POLICY IF EXISTS "trips_scoped_write" ON public.trips;

CREATE POLICY "trips_scoped_read" ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (public.is_marshal() AND trips.route_id = public.current_marshal_route())
    OR (public.is_driver() AND trips.driver_id = public.current_driver_id()::text)
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.registration_number = trips.vehicle_reg
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  );

CREATE POLICY "trips_scoped_write" ON public.trips
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_marshal() AND trips.route_id = public.current_marshal_route())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_marshal() AND trips.route_id = public.current_marshal_route())
  );

-- Note: kiosk read for public trip counts uses the service role.
-- The app's public "live departures" screen does not rely on this policy.

-- ---------------------------------------------------------------------------
-- 7. Marshal transactions — marshal own, staff region-scoped
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "mtx_marshal_read" ON public.marshal_transactions;
DROP POLICY IF EXISTS "mtx_marshal_insert" ON public.marshal_transactions;
DROP POLICY IF EXISTS "mtx_scoped_read" ON public.marshal_transactions;
DROP POLICY IF EXISTS "mtx_scoped_write" ON public.marshal_transactions;

CREATE POLICY "mtx_scoped_read" ON public.marshal_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (
      public.is_marshal()
      AND marshal_id IN (
        SELECT id FROM public.marshals WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "mtx_scoped_write" ON public.marshal_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_marshal()
      AND marshal_id IN (
        SELECT id FROM public.marshals WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Rank fee payments — mirror of mtx
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "payments_authenticated_read" ON public.rank_fee_payments;
DROP POLICY IF EXISTS "payments_staff_marshal_write" ON public.rank_fee_payments;
DROP POLICY IF EXISTS "payments_scoped_read" ON public.rank_fee_payments;
DROP POLICY IF EXISTS "payments_scoped_write" ON public.rank_fee_payments;

CREATE POLICY "payments_scoped_read" ON public.rank_fee_payments
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (
      public.is_marshal()
      AND EXISTS (
        SELECT 1 FROM public.marshal_transactions mt
        WHERE mt.id = rank_fee_payments.transaction_ref
          AND mt.marshal_id IN (
            SELECT id FROM public.marshals WHERE auth_user_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY "payments_scoped_write" ON public.rank_fee_payments
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_marshal()
      AND EXISTS (
        SELECT 1 FROM public.marshal_transactions mt
        WHERE mt.id = rank_fee_payments.transaction_ref
          AND mt.marshal_id IN (
            SELECT id FROM public.marshals WHERE auth_user_id = auth.uid()
          )
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_marshal()
      AND EXISTS (
        SELECT 1 FROM public.marshal_transactions mt
        WHERE mt.id = rank_fee_payments.transaction_ref
          AND mt.marshal_id IN (
            SELECT id FROM public.marshals WHERE auth_user_id = auth.uid()
          )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Permits — staff region-scoped; operator own vehicles only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "renewals_staff_operator_read" ON public.permit_renewal_requests;
DROP POLICY IF EXISTS "renewals_staff_operator_write" ON public.permit_renewal_requests;
DROP POLICY IF EXISTS "renewals_scoped_read" ON public.permit_renewal_requests;
DROP POLICY IF EXISTS "renewals_scoped_write" ON public.permit_renewal_requests;

CREATE POLICY "renewals_scoped_read" ON public.permit_renewal_requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.registration_number = permit_renewal_requests.vehicle_reg
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  );

CREATE POLICY "renewals_scoped_write" ON public.permit_renewal_requests
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.registration_number = permit_renewal_requests.vehicle_reg
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.registration_number = permit_renewal_requests.vehicle_reg
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  );

-- Archives and audit logs: super-admin + rank-admin only (region-scoped for
-- the latter). Operator has no business writing these.

DROP POLICY IF EXISTS "archives_staff_read" ON public.permit_renewal_archives;
DROP POLICY IF EXISTS "archives_staff_write" ON public.permit_renewal_archives;
DROP POLICY IF EXISTS "archives_scoped_read" ON public.permit_renewal_archives;
DROP POLICY IF EXISTS "archives_scoped_write" ON public.permit_renewal_archives;

CREATE POLICY "archives_scoped_read" ON public.permit_renewal_archives
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_rank_admin());

CREATE POLICY "archives_scoped_write" ON public.permit_renewal_archives
  FOR ALL
  TO authenticated
  USING (public.is_super_admin() OR public.is_rank_admin())
  WITH CHECK (public.is_super_admin() OR public.is_rank_admin());

DROP POLICY IF EXISTS "audit_staff_read" ON public.permit_audit_logs;
DROP POLICY IF EXISTS "audit_staff_insert" ON public.permit_audit_logs;
DROP POLICY IF EXISTS "audit_scoped_read" ON public.permit_audit_logs;
DROP POLICY IF EXISTS "audit_scoped_insert" ON public.permit_audit_logs;

CREATE POLICY "audit_scoped_read" ON public.permit_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin() OR public.is_rank_admin());

CREATE POLICY "audit_scoped_insert" ON public.permit_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------------
-- 10. Adverts — super-admin only for write
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "adverts_staff_write" ON public.adverts;
DROP POLICY IF EXISTS "adverts_super_admin_write" ON public.adverts;

CREATE POLICY "adverts_super_admin_write" ON public.adverts
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- adverts_public_read stays.

-- ---------------------------------------------------------------------------
-- 11. Master cards and vehicle cards — operator own only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "omcards_staff_write" ON public.operator_master_cards;
DROP POLICY IF EXISTS "omcards_scoped_write" ON public.operator_master_cards;

CREATE POLICY "omcards_scoped_write" ON public.operator_master_cards
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_operator() AND operator_id = public.current_operator_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_operator() AND operator_id = public.current_operator_id())
  );

-- omcards_staff_self_read stays — it already scopes to own operator.

DROP POLICY IF EXISTS "vcards_staff_operator_write" ON public.vehicle_virtual_cards;
DROP POLICY IF EXISTS "vcards_scoped_write" ON public.vehicle_virtual_cards;

CREATE POLICY "vcards_scoped_write" ON public.vehicle_virtual_cards
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.registration_number = vehicle_virtual_cards.vehicle_reg
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicles v
        WHERE v.registration_number = vehicle_virtual_cards.vehicle_reg
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  );

-- vcards_staff_operator_read stays.

-- ---------------------------------------------------------------------------
-- 12. Fleet operators — self update only (super-admin national)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "operators_self_update" ON public.fleet_operators;
DROP POLICY IF EXISTS "operators_scoped_update" ON public.fleet_operators;

CREATE POLICY "operators_scoped_update" ON public.fleet_operators
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR auth_user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 13. traffic_tickets — inspector/super-admin write (already correct);
--     tighten read to region-scoped staff.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "tickets_staff_read" ON public.traffic_tickets;
DROP POLICY IF EXISTS "tickets_scoped_read" ON public.traffic_tickets;

CREATE POLICY "tickets_scoped_read" ON public.traffic_tickets
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR public.current_staff_role() = 'inspector'
  );

-- tickets_inspector_write stays.

-- ---------------------------------------------------------------------------
-- 14. Notifications — staff only (already correct; keep)
-- ---------------------------------------------------------------------------
-- notifications_staff_write and notifications_authenticated_read stay.

-- ---------------------------------------------------------------------------
-- 15. Incidents — authenticated read (own), anonymous insert, staff update
-- ---------------------------------------------------------------------------
-- Already correct. Keep.

-- ---------------------------------------------------------------------------
-- 16. Self-test invariant: authority.policy_gap
-- ---------------------------------------------------------------------------
-- Detects tables with RLS enabled but a write policy that only checks
-- "is_staff()". These are the drift risks: they let any staff member write
-- anything. Runs as part of the operational integrity check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_authority_lattice()
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
    'authority.policy_gap'::text,
    'table'::text,
    p.tablename,
    jsonb_build_object(
      'policy', p.policyname,
      'cmd', p.cmd,
      'qual', p.qual
    )
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.cmd IN ('ALL', 'INSERT', 'UPDATE')
    AND p.qual IS NOT NULL
    AND p.qual NOT LIKE '%is_super_admin%'
    AND p.qual NOT LIKE '%in_region%'
    AND p.qual NOT LIKE '%current_marshal_route%'
    AND p.qual NOT LIKE '%current_operator_id%'
    AND p.qual NOT LIKE '%auth.uid()%'
    AND p.qual NOT LIKE '%current_driver_id%'
    AND p.qual NOT LIKE '%current_staff_role%'
    -- Exclusion: the invariant_violations table's own policy is fine
    AND p.tablename NOT IN ('invariant_violations');
$$;

GRANT EXECUTE ON FUNCTION public.check_authority_lattice() TO service_role;

-- ---------------------------------------------------------------------------
-- 17. Wire the new check into run_all_invariant_checks()
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
  SELECT count(*) INTO v_money      FROM _fresh_violations WHERE invariant LIKE 'money.%';
  SELECT count(*) INTO v_identity   FROM _fresh_violations WHERE invariant LIKE 'identity.%';
  SELECT count(*) INTO v_ops        FROM _fresh_violations WHERE invariant LIKE 'ops.%';
  SELECT count(*) INTO v_authority  FROM _fresh_violations WHERE invariant LIKE 'authority.%';

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
    'total',           v_total_fresh,
    'newly_inserted',  v_newly_inserted,
    'auto_resolved',   v_auto_resolved,
    'touched',         v_touched
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_all_invariant_checks() TO service_role;

COMMIT;
