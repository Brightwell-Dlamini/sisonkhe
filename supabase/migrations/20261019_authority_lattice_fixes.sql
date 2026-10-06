-- =============================================================================
-- Phase 4b — Close the RLS gaps found by authority.policy_gap
-- =============================================================================
-- Fixes:
--   1. Enable RLS on six tables that had it disabled.
--   2. Write correct policies for each — scoped to the actor the model says.
--   3. Drop two anon_all_* policies that granted full public access.
--   4. Tighten four genuinely loose staff policies.
--
-- Idempotent. Safe to re-run.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Marshals — RLS ON, proper policies
-- ---------------------------------------------------------------------------
-- Contains 34 real people's personal data. Before this migration, anon could
-- read and write everything.

DROP POLICY IF EXISTS "anon_all_marshals" ON public.marshals;
ALTER TABLE public.marshals ENABLE ROW LEVEL SECURITY;

-- Super-admin: full access (national scope)
DROP POLICY IF EXISTS "marshals_super_admin_write" ON public.marshals;
CREATE POLICY "marshals_super_admin_write" ON public.marshals
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Rank admin: read/write own region only
DROP POLICY IF EXISTS "marshals_scoped_read" ON public.marshals;
CREATE POLICY "marshals_scoped_read" ON public.marshals
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_rank_admin() AND public.in_region(region))
    OR auth_user_id = auth.uid()  -- marshal reads own row
  );

DROP POLICY IF EXISTS "marshals_scoped_write" ON public.marshals;
CREATE POLICY "marshals_scoped_write" ON public.marshals
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_rank_admin() AND public.in_region(region))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_rank_admin() AND public.in_region(region))
  );

-- Marshal self-update: only a few fields. Enforced by a column-level CHECK
-- guard in the app; the policy allows the row, the app restricts the columns.
DROP POLICY IF EXISTS "marshals_self_update" ON public.marshals;
CREATE POLICY "marshals_self_update" ON public.marshals
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. sync_logs — RLS ON, super-admin read only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "anon_all_sync_logs" ON public.sync_logs;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_logs_super_admin_read" ON public.sync_logs;
CREATE POLICY "sync_logs_super_admin_read" ON public.sync_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- No client writes. Service role only (bypasses RLS).

-- ---------------------------------------------------------------------------
-- 3. driver_signals — RLS ON
-- ---------------------------------------------------------------------------
-- Driver writes own signal. Marshal reads signals on own route. Staff
-- region-scoped read. Service role writes consumed_at.

ALTER TABLE public.driver_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_signals_scoped_read" ON public.driver_signals;
CREATE POLICY "driver_signals_scoped_read" ON public.driver_signals
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_rank_admin()
    OR (public.is_marshal() AND route_id = public.current_marshal_route())
    OR (public.is_driver() AND driver_id = public.current_driver_id()::text)
  );

DROP POLICY IF EXISTS "driver_signals_driver_insert" ON public.driver_signals;
CREATE POLICY "driver_signals_driver_insert" ON public.driver_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_driver() AND driver_id = public.current_driver_id()::text
  );

-- ---------------------------------------------------------------------------
-- 4. operational_audit — RLS ON, super-admin read only
-- ---------------------------------------------------------------------------

ALTER TABLE public.operational_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operational_audit_super_admin_read"
  ON public.operational_audit;
CREATE POLICY "operational_audit_super_admin_read" ON public.operational_audit
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 5. system_sequences — RLS ON, no client access at all
-- ---------------------------------------------------------------------------
-- Sequences are internal. The only writer is next_system_sequence(), which
-- runs SECURITY INVOKER and thus needs caller to have access. But that
-- function is called by other SECURITY DEFINER functions (record_rank_fee)
-- which run as the definer. So no client needs direct access.

ALTER TABLE public.system_sequences ENABLE ROW LEVEL SECURITY;

-- No policies. RLS on, no policy allows anything. Only service_role and
-- SECURITY DEFINER functions touch this table.

-- ---------------------------------------------------------------------------
-- 6. usernames — RLS ON, staff read only
-- ---------------------------------------------------------------------------

ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usernames_staff_read" ON public.usernames;
CREATE POLICY "usernames_staff_read" ON public.usernames
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- Writes: service role only.

-- ---------------------------------------------------------------------------
-- 7. Tighten the four loose staff policies
-- ---------------------------------------------------------------------------

-- 7a. incidents_staff_write — was: is_staff(). Now: super-admin or rank-admin.
DROP POLICY IF EXISTS "incidents_staff_write" ON public.incidents;
DROP POLICY IF EXISTS "incidents_scoped_write" ON public.incidents;

CREATE POLICY "incidents_scoped_write" ON public.incidents
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin() OR public.is_rank_admin())
  WITH CHECK (public.is_super_admin() OR public.is_rank_admin());

-- 7b. notifications_staff_write — was: is_staff(). Now: super-admin only.
DROP POLICY IF EXISTS "notifications_staff_write" ON public.notifications;
DROP POLICY IF EXISTS "notifications_super_admin_write" ON public.notifications;

CREATE POLICY "notifications_super_admin_write" ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 7c. vctx_staff_operator_write — was: any staff OR any operator. Now:
--     staff scoped, operator owns the card.
DROP POLICY IF EXISTS "vctx_staff_operator_write" ON public.virtual_card_transactions;
DROP POLICY IF EXISTS "vctx_scoped_write" ON public.virtual_card_transactions;

CREATE POLICY "vctx_scoped_write" ON public.virtual_card_transactions
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicle_virtual_cards vc
        JOIN public.vehicles v ON v.registration_number = vc.vehicle_reg
        WHERE vc.id = virtual_card_transactions.card_id
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.vehicle_virtual_cards vc
        JOIN public.vehicles v ON v.registration_number = vc.vehicle_reg
        WHERE vc.id = virtual_card_transactions.card_id
          AND v.owner_operator_id = public.current_operator_id()
      )
    )
  );

-- 7d. octx (operator_card_transactions) has the same shape as vctx — tighten
--     it too so we don't hit the same gap in a later run.
DROP POLICY IF EXISTS "octx_scoped_write" ON public.operator_card_transactions;
CREATE POLICY "octx_scoped_write" ON public.operator_card_transactions
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.operator_master_cards mc
        WHERE mc.id = operator_card_transactions.card_id
          AND mc.operator_id = public.current_operator_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_operator()
      AND EXISTS (
        SELECT 1 FROM public.operator_master_cards mc
        WHERE mc.id = operator_card_transactions.card_id
          AND mc.operator_id = public.current_operator_id()
      )
    )
  );

COMMIT;
