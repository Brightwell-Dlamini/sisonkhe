-- =============================================================================
-- Atomic system sequences for tickets, receipts, marshal tx, virtual cards
-- =============================================================================
-- Replaces racey read-modify-write in app code with a single-row UPDATE RETURNING.
-- Safe to re-run.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_sequences (
  name        text PRIMARY KEY,
  value       bigint NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.next_system_sequence(p_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'sequence name required';
  END IF;

  INSERT INTO public.system_sequences (name, value, updated_at)
  VALUES (p_name, 1, now())
  ON CONFLICT (name) DO UPDATE
    SET value = public.system_sequences.value + 1,
        updated_at = now()
  RETURNING value INTO v_next;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_system_sequence(text) TO service_role;

-- Optional: printed_at on renewals for rank-load gate hygiene
ALTER TABLE public.permit_renewal_requests
  ADD COLUMN IF NOT EXISTS printed_at timestamptz;

COMMIT;
