-- Sequences, config, and operational audit for 4000iq domain enforcement

CREATE TABLE IF NOT EXISTS system_sequences (
  name TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION next_system_sequence(p_name TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v BIGINT;
BEGIN
  INSERT INTO system_sequences (name, value, updated_at)
  VALUES (p_name, 1, NOW())
  ON CONFLICT (name) DO UPDATE
    SET value = system_sequences.value + 1,
        updated_at = NOW()
  RETURNING value INTO v;
  RETURN v;
END;
$$;

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (key, value_json)
VALUES (
  'rank_fee',
  '{"rankFee": 25, "splitOperational": 20, "splitNRTC": 3.5, "splitMaintenance": 1.5}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS operational_audit (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  actor_name TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  meta_json JSONB
);

CREATE INDEX IF NOT EXISTS operational_audit_ts_idx
  ON operational_audit (timestamp DESC);
CREATE INDEX IF NOT EXISTS operational_audit_entity_idx
  ON operational_audit (entity_type, entity_id);

-- Canonical plate key for fast inspector lookup (optional generated column pattern)
-- Application still normalizes on write; this index helps equality on normalized form.
CREATE INDEX IF NOT EXISTS vehicles_reg_compact_idx
  ON vehicles (upper(replace(registration_number, ' ', '')));

CREATE INDEX IF NOT EXISTS vehicles_vic_upper_idx
  ON vehicles (upper(vic));
