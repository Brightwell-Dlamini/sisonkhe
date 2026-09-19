-- =============================================================================
-- Row Level Security Policies
-- =============================================================================
--
-- ⚠️  CRITICAL: This file assumes the following:
--
--   1. The `staff` table is populated with at least one super-admin.
--      If it's empty, no one can write to protected tables until you either
--      add a super-admin OR use the Supabase Service Role Key.
--
--   2. Your application server uses the SERVICE ROLE KEY for writes that
--      bypass RLS (sync_events ingestion, admin operations, etc.). This key
--      MUST stay server-side only. Never expose it to the client.
--
--   3. The client uses the ANON KEY which is subject to these RLS policies.
--
-- To disable RLS temporarily during development:
--   ALTER TABLE public.<table_name> DISABLE ROW LEVEL SECURITY;
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

-- Returns the role of the current authenticated user, or NULL if not staff.
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.staff
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Returns true if the current user is any authenticated staff member.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE auth_user_id = auth.uid() AND is_active = true
  );
$$;

-- Returns true if the current user is a marshal.
CREATE OR REPLACE FUNCTION public.is_marshal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marshals
    WHERE auth_user_id = auth.uid() AND is_active = true
  );
$$;

-- Returns true if the current user is a driver.
CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drivers
    WHERE auth_user_id = auth.uid()
  );
$$;

-- Returns true if the current user is a fleet operator.
CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fleet_operators
    WHERE auth_user_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on all new tables
-- -----------------------------------------------------------------------------

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_renewal_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_virtual_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_master_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adverts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Reference data: public read, staff-only write
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "regions_public_read" ON public.regions;
CREATE POLICY "regions_public_read" ON public.regions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "regions_staff_write" ON public.regions;
CREATE POLICY "regions_staff_write" ON public.regions
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "routes_public_read" ON public.routes;
CREATE POLICY "routes_public_read" ON public.routes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "routes_staff_write" ON public.routes;
CREATE POLICY "routes_staff_write" ON public.routes
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- Vehicles: authenticated read, staff/marshal write
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "vehicles_authenticated_read" ON public.vehicles;
CREATE POLICY "vehicles_authenticated_read" ON public.vehicles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "vehicles_staff_marshal_write" ON public.vehicles;
CREATE POLICY "vehicles_staff_marshal_write" ON public.vehicles
  FOR ALL
  USING (public.is_staff() OR public.is_marshal() OR public.is_operator())
  WITH CHECK (public.is_staff() OR public.is_marshal() OR public.is_operator());

-- -----------------------------------------------------------------------------
-- Drivers: own read/write, staff read
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "drivers_self_read" ON public.drivers;
CREATE POLICY "drivers_self_read" ON public.drivers
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "drivers_self_update" ON public.drivers;
CREATE POLICY "drivers_self_update" ON public.drivers
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR public.is_staff()
  ) WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_staff()
  );

-- -----------------------------------------------------------------------------
-- Staff: own read, super-admin all
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR public.current_staff_role() = 'super-admin'
  );

DROP POLICY IF EXISTS "staff_super_admin_write" ON public.staff;
CREATE POLICY "staff_super_admin_write" ON public.staff
  FOR ALL USING (public.current_staff_role() = 'super-admin')
  WITH CHECK (public.current_staff_role() = 'super-admin');

-- -----------------------------------------------------------------------------
-- Trips: public read for stats, staff/marshal/driver write
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "trips_public_read" ON public.trips;
CREATE POLICY "trips_public_read" ON public.trips
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "trips_staff_write" ON public.trips;
CREATE POLICY "trips_staff_write" ON public.trips
  FOR ALL
  USING (public.is_staff() OR public.is_marshal())
  WITH CHECK (public.is_staff() OR public.is_marshal());

-- -----------------------------------------------------------------------------
-- Marshal transactions: marshal own, staff all
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "mtx_marshal_read" ON public.marshal_transactions;
CREATE POLICY "mtx_marshal_read" ON public.marshal_transactions
  FOR SELECT USING (
    public.is_staff()
    OR marshal_id IN (SELECT id FROM public.marshals WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "mtx_marshal_insert" ON public.marshal_transactions;
CREATE POLICY "mtx_marshal_insert" ON public.marshal_transactions
  FOR INSERT WITH CHECK (
    public.is_staff()
    OR marshal_id IN (SELECT id FROM public.marshals WHERE auth_user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Rank fee payments: staff read/write, authenticated read own vehicle
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "payments_authenticated_read" ON public.rank_fee_payments;
CREATE POLICY "payments_authenticated_read" ON public.rank_fee_payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "payments_staff_marshal_write" ON public.rank_fee_payments;
CREATE POLICY "payments_staff_marshal_write" ON public.rank_fee_payments
  FOR ALL USING (public.is_staff() OR public.is_marshal())
  WITH CHECK (public.is_staff() OR public.is_marshal());

-- -----------------------------------------------------------------------------
-- Notifications: authenticated read, staff write
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "notifications_authenticated_read" ON public.notifications;
CREATE POLICY "notifications_authenticated_read" ON public.notifications
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "notifications_staff_write" ON public.notifications;
CREATE POLICY "notifications_staff_write" ON public.notifications
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- Incidents: authenticated read (own), staff all
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "incidents_authenticated_read" ON public.incidents;
CREATE POLICY "incidents_authenticated_read" ON public.incidents
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "incidents_insert_anyone" ON public.incidents;
CREATE POLICY "incidents_insert_anyone" ON public.incidents
  FOR INSERT WITH CHECK (true);  -- Commuters can report incidents anonymously

DROP POLICY IF EXISTS "incidents_staff_write" ON public.incidents;
CREATE POLICY "incidents_staff_write" ON public.incidents
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- Traffic tickets: inspector + staff only
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "tickets_staff_read" ON public.traffic_tickets;
CREATE POLICY "tickets_staff_read" ON public.traffic_tickets
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "tickets_inspector_write" ON public.traffic_tickets;
CREATE POLICY "tickets_inspector_write" ON public.traffic_tickets
  FOR ALL USING (
    public.current_staff_role() IN ('super-admin', 'inspector')
  ) WITH CHECK (
    public.current_staff_role() IN ('super-admin', 'inspector')
  );

-- -----------------------------------------------------------------------------
-- Permits: staff + operator (own vehicle) read/write
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "renewals_staff_operator_read" ON public.permit_renewal_requests;
CREATE POLICY "renewals_staff_operator_read" ON public.permit_renewal_requests
  FOR SELECT USING (
    public.is_staff()
    OR public.is_operator()
  );

DROP POLICY IF EXISTS "renewals_staff_operator_write" ON public.permit_renewal_requests;
CREATE POLICY "renewals_staff_operator_write" ON public.permit_renewal_requests
  FOR ALL USING (
    public.is_staff()
    OR public.is_operator()
  ) WITH CHECK (
    public.is_staff()
    OR public.is_operator()
  );

DROP POLICY IF EXISTS "archives_staff_read" ON public.permit_renewal_archives;
CREATE POLICY "archives_staff_read" ON public.permit_renewal_archives
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "archives_staff_write" ON public.permit_renewal_archives;
CREATE POLICY "archives_staff_write" ON public.permit_renewal_archives
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "audit_staff_read" ON public.permit_audit_logs;
CREATE POLICY "audit_staff_read" ON public.permit_audit_logs
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "audit_staff_insert" ON public.permit_audit_logs;
CREATE POLICY "audit_staff_insert" ON public.permit_audit_logs
  FOR INSERT WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- Cards: staff + operator (own) + driver (own vehicle)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "vcards_staff_operator_read" ON public.vehicle_virtual_cards;
CREATE POLICY "vcards_staff_operator_read" ON public.vehicle_virtual_cards
  FOR SELECT USING (
    public.is_staff()
    OR public.is_operator()
    OR public.is_marshal()
  );

DROP POLICY IF EXISTS "vcards_staff_operator_write" ON public.vehicle_virtual_cards;
CREATE POLICY "vcards_staff_operator_write" ON public.vehicle_virtual_cards
  FOR ALL USING (
    public.is_staff()
    OR public.is_operator()
  ) WITH CHECK (
    public.is_staff()
    OR public.is_operator()
  );

DROP POLICY IF EXISTS "vctx_staff_operator_read" ON public.virtual_card_transactions;
CREATE POLICY "vctx_staff_operator_read" ON public.virtual_card_transactions
  FOR SELECT USING (public.is_staff() OR public.is_operator());

DROP POLICY IF EXISTS "vctx_staff_operator_write" ON public.virtual_card_transactions;
CREATE POLICY "vctx_staff_operator_write" ON public.virtual_card_transactions
  FOR ALL USING (public.is_staff() OR public.is_operator())
  WITH CHECK (public.is_staff() OR public.is_operator());

DROP POLICY IF EXISTS "operators_staff_read" ON public.fleet_operators;
CREATE POLICY "operators_staff_read" ON public.fleet_operators
  FOR SELECT USING (public.is_staff() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "operators_self_update" ON public.fleet_operators;
CREATE POLICY "operators_self_update" ON public.fleet_operators
  FOR UPDATE USING (public.is_staff() OR auth_user_id = auth.uid())
  WITH CHECK (public.is_staff() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "omcards_staff_self_read" ON public.operator_master_cards;
CREATE POLICY "omcards_staff_self_read" ON public.operator_master_cards
  FOR SELECT USING (
    public.is_staff()
    OR operator_id IN (SELECT id FROM public.fleet_operators WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "omcards_staff_write" ON public.operator_master_cards;
CREATE POLICY "omcards_staff_write" ON public.operator_master_cards
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "octx_staff_self_read" ON public.operator_card_transactions;
CREATE POLICY "octx_staff_self_read" ON public.operator_card_transactions
  FOR SELECT USING (
    public.is_staff()
    OR card_id IN (
      SELECT id FROM public.operator_master_cards
      WHERE operator_id IN (SELECT id FROM public.fleet_operators WHERE auth_user_id = auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- Adverts: public read (active only), staff write
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "adverts_public_read" ON public.adverts;
CREATE POLICY "adverts_public_read" ON public.adverts
  FOR SELECT USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS "adverts_staff_write" ON public.adverts;
CREATE POLICY "adverts_staff_write" ON public.adverts
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- Sync events: no client access. Server-only via service role.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "sync_events_no_client_access" ON public.sync_events;
CREATE POLICY "sync_events_no_client_access" ON public.sync_events
  FOR ALL USING (false) WITH CHECK (false);
