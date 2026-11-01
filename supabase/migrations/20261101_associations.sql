-- Associations foundation (Phase 0)
-- First-class transport associations + memberships for Eswatini ranks.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.associations (
  id text PRIMARY KEY,
  name text NOT NULL,
  short_name text,
  registration_number text,
  region_code text NOT NULL REFERENCES public.regions(code),
  status text NOT NULL DEFAULT 'Active'
    CHECK (status = ANY (ARRAY['Active'::text, 'Suspended'::text, 'Pending Registration'::text, 'Dissolved'::text])),
  chair_name text,
  contact_phone text,
  contact_email text,
  physical_address text,
  notes text,
  queue_priority_weight integer NOT NULL DEFAULT 0
    CHECK (queue_priority_weight >= 0 AND queue_priority_weight <= 100),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS associations_region_idx
  ON public.associations (region_code);

CREATE INDEX IF NOT EXISTS associations_status_idx
  ON public.associations (status);

CREATE TABLE IF NOT EXISTS public.association_memberships (
  id text PRIMARY KEY,
  association_id text NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  member_entity_type text NOT NULL
    CHECK (member_entity_type = ANY (ARRAY['operator'::text, 'driver'::text])),
  member_entity_id text NOT NULL,
  role text NOT NULL DEFAULT 'Member'
    CHECK (role = ANY (ARRAY['Member'::text, 'Committee'::text, 'Chair'::text, 'Secretary'::text, 'Treasurer'::text])),
  status text NOT NULL DEFAULT 'Active'
    CHECK (status = ANY (ARRAY['Active'::text, 'Suspended'::text, 'Pending'::text, 'Resigned'::text, 'Expelled'::text])),
  joined_at timestamptz,
  left_at timestamptz,
  dues_paid_until date,
  notes text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assoc_memberships_assoc_idx
  ON public.association_memberships (association_id);

CREATE INDEX IF NOT EXISTS assoc_memberships_member_idx
  ON public.association_memberships (member_entity_type, member_entity_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_memberships ENABLE ROW LEVEL SECURITY;

-- Service role (API / admin client) can do everything.
-- Region-scoped policies will be refined once staff region helpers are confirmed
-- against the live authority lattice. For now we allow authenticated staff
-- with the association permissions to read; writes go through service role.

CREATE POLICY associations_service_all
  ON public.associations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY association_memberships_service_all
  ON public.association_memberships
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated read for users who have association access (enforced at app layer).
-- Tight region scoping will be added in the authority lattice follow-up.
CREATE POLICY associations_authenticated_read
  ON public.associations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY association_memberships_authenticated_read
  ON public.association_memberships
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.associations IS
  'First-class transport associations (Phase 0). Region-scoped. Used for membership, representation and future queue preference rules.';

COMMENT ON TABLE public.association_memberships IS
  'Links operators or drivers to an association with role and status.';
