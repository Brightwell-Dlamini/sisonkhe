-- =============================================================================
-- Sisonkhe In Transit — Event-log sync + queue hardening
-- Migration: 20261005_event_sync_and_queue
-- Safe to re-run (idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Sequence for sync_events.seq
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.sync_events_seq_seq
  AS bigint
  INCREMENT BY 1
  MINVALUE 1
  START WITH 1
  CACHE 1;

-- ---------------------------------------------------------------------------
-- 2. sync_events table (event-log protocol)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sync_events (
  id               text PRIMARY KEY,
  entity_type      text NOT NULL,
  entity_id        text NOT NULL,
  operation        text NOT NULL
                   CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key  text NOT NULL UNIQUE,
  client_id        text NOT NULL,
  occurred_at      timestamptz NOT NULL,
  applied_at       timestamptz NOT NULL DEFAULT now(),
  seq              bigint NOT NULL DEFAULT nextval('public.sync_events_seq_seq'::regclass),
  base_version     integer
);

CREATE INDEX IF NOT EXISTS sync_events_seq_idx
  ON public.sync_events (seq);

CREATE INDEX IF NOT EXISTS sync_events_entity_idx
  ON public.sync_events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS sync_events_occurred_idx
  ON public.sync_events (occurred_at DESC);

-- Ensure sequence ownership (for drops / dumps)
ALTER SEQUENCE public.sync_events_seq_seq
  OWNED BY public.sync_events.seq;

-- ---------------------------------------------------------------------------
-- 3. version + updated_at on operational tables (if missing)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'vehicles',
    'drivers',
    'marshals',
    'routes',
    'regions',
    'trips',
    'incidents',
    'notifications',
    'staff',
    'fleet_operators',
    'adverts',
    'marshal_transactions',
    'rank_fee_payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1',
        t
      );
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()',
        t
      );
      -- created_at only if table does not already use a different type for it
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'created_at'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()',
          t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Helpful indexes for marshal queue
CREATE INDEX IF NOT EXISTS vehicles_status_idx
  ON public.vehicles (status);

CREATE INDEX IF NOT EXISTS vehicles_route_queue_idx
  ON public.vehicles (route_assignment_id, current_queue_position)
  WHERE current_queue_position > 0;

-- ---------------------------------------------------------------------------
-- 4. shift_queue_forward — close gap after a vehicle leaves the queue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.shift_queue_forward(
  p_route_id text,
  p_from_position integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_route_id IS NULL OR p_from_position IS NULL OR p_from_position < 1 THEN
    RETURN;
  END IF;

  UPDATE public.vehicles
  SET
    current_queue_position = current_queue_position - 1,
    version = COALESCE(version, 1) + 1,
    updated_at = now()
  WHERE route_assignment_id = p_route_id
    AND current_queue_position > p_from_position;
END;
$$;

COMMENT ON FUNCTION public.shift_queue_forward(text, integer) IS
  'After a vehicle departs or is removed from position N, decrement positions > N on the same route.';

-- ---------------------------------------------------------------------------
-- 5. Optional: grant service role usage (Supabase service_role already bypasses RLS)
--    Enable RLS on sync_events if you want clients blocked from direct writes.
-- ---------------------------------------------------------------------------
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies so re-runs stay clean
DROP POLICY IF EXISTS "sync_events_service_all" ON public.sync_events;
DROP POLICY IF EXISTS "sync_events_authenticated_read" ON public.sync_events;

-- Authenticated users may read events (for pull); writes go through server with service role
CREATE POLICY "sync_events_authenticated_read"
  ON public.sync_events
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy for authenticated → only service_role can write

-- ---------------------------------------------------------------------------
-- Done
-- ---------------------------------------------------------------------------
