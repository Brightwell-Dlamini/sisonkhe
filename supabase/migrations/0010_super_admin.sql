-- =============================================================================
-- Super Admin support tables
-- =============================================================================
-- 1. system_config    — key-value config (themes, cycle timer, IP lists)
-- 2. system_errors    — error tracking
-- 3. system_snapshots — manual backups/restore points
-- =============================================================================

-- 1. Config
CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_config (key, value)
VALUES
  ('theme', '"high_contrast"'::jsonb),
  ('cycle_timer_seconds', '12'::jsonb),
  ('ip_whitelist', '[]'::jsonb),
  ('ip_blacklist', '[]'::jsonb),
  ('rank_fee', '25'::jsonb),
  ('split_operational', '20'::jsonb),
  ('split_nrtc', '3.5'::jsonb),
  ('split_maintenance', '1.5'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Errors
CREATE TABLE IF NOT EXISTS public.system_errors (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  module text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
  message text NOT NULL,
  affected_user text,
  context jsonb,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Investigating', 'Resolved')),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_system_errors_timestamp ON public.system_errors(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_status ON public.system_errors(status);

-- 3. Snapshots
CREATE TABLE IF NOT EXISTS public.system_snapshots (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL DEFAULT now(),
  label text NOT NULL,
  size_kb numeric NOT NULL,
  entity_counts jsonb NOT NULL,
  snapshot_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- RLS: staff can read errors, super-admin full access
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_staff_read" ON public.system_config;
CREATE POLICY "system_config_staff_read" ON public.system_config
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "system_config_super_admin_write" ON public.system_config;
CREATE POLICY "system_config_super_admin_write" ON public.system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid()
        AND staff.role = 'super-admin'
        AND staff.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid()
        AND staff.role = 'super-admin'
        AND staff.is_active = true
    )
  );

DROP POLICY IF EXISTS "system_errors_staff_read" ON public.system_errors;
CREATE POLICY "system_errors_staff_read" ON public.system_errors
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "system_errors_super_admin_write" ON public.system_errors;
CREATE POLICY "system_errors_super_admin_write" ON public.system_errors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid()
        AND staff.role = 'super-admin'
        AND staff.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid()
        AND staff.role = 'super-admin'
        AND staff.is_active = true
    )
  );

DROP POLICY IF EXISTS "system_snapshots_super_admin_all" ON public.system_snapshots;
CREATE POLICY "system_snapshots_super_admin_all" ON public.system_snapshots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid()
        AND staff.role = 'super-admin'
        AND staff.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid()
        AND staff.role = 'super-admin'
        AND staff.is_active = true
    )
  );
