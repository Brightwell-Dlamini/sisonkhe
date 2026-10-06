-- Canonical plate key for uniqueness (HSD101BM == HSD 101 BM)
-- Application already normalizes on write; this backs it at DB level where possible.

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS plate_key TEXT
  GENERATED ALWAYS AS (upper(replace(registration_number, ' ', ''))) STORED;

-- Unique on plate_key (may fail if existing duplicates — clean first)
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_key_uidx
  ON vehicles (plate_key)
  WHERE plate_key IS NOT NULL AND plate_key <> '';

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vic_uidx
  ON vehicles (upper(vic))
  WHERE vic IS NOT NULL AND vic <> '';
