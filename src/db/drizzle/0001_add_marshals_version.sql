-- =============================================================================
-- Extend the existing `marshals` table with a version column.
-- =============================================================================
-- This is the ONLY change we make to the marshals table. It enables
-- optimistic concurrency when Sisonkhe In Transit updates marshal records
-- (e.g., assigning a route or terminal).
--
-- The registration portal is unaffected — it doesn't send `version`, and the
-- default of 1 applies automatically.
-- =============================================================================

ALTER TABLE public.marshals
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Optional: index for frequent lookups by auth_user_id
CREATE INDEX IF NOT EXISTS idx_marshals_auth_user ON public.marshals(auth_user_id);

-- Optional: index for region filtering
CREATE INDEX IF NOT EXISTS idx_marshals_region ON public.marshals(region);

COMMENT ON COLUMN public.marshals.version IS
  'Optimistic concurrency version. Incremented on every update by Sisonkhe In Transit.';
