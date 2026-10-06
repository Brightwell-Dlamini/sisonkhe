-- Multiple terminals per region (beyond the 4 seeded region configs)
CREATE TABLE IF NOT EXISTS terminals (
  id TEXT PRIMARY KEY,
  region_code TEXT NOT NULL REFERENCES regions(code),
  name TEXT NOT NULL,
  emergency_number TEXT,
  announcement TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS terminals_region_idx ON terminals (region_code);
