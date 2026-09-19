-- =============================================================================
-- trg_marshals_updated_at calls set_updated_at(), which used now() (timestamptz)
-- while marshals.updated_at is BIGINT epoch-ms. That blocked every claim UPDATE.
-- =============================================================================

BEGIN;

-- Generic helper: set updated_at safely whether the column is bigint or timestamptz.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_udt text;
BEGIN
  SELECT a.atttypid::regtype::text
  INTO v_udt
  FROM pg_attribute a
  WHERE a.attrelid = TG_RELID
    AND a.attname = 'updated_at'
    AND NOT a.attisdropped;

  IF v_udt IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_udt IN ('bigint', 'integer', 'numeric') THEN
    NEW.updated_at := (EXTRACT(EPOCH FROM now()) * 1000)::bigint;
  ELSE
    -- timestamptz / timestamp
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists (idempotent)
DROP TRIGGER IF EXISTS trg_marshals_updated_at ON public.marshals;
CREATE TRIGGER trg_marshals_updated_at
  BEFORE UPDATE ON public.marshals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMIT;
