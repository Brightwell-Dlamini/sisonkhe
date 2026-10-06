-- Operator region for rank-admin scoping
ALTER TABLE fleet_operators
  ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS fleet_operators_region_idx
  ON fleet_operators (region);

-- Ticket enforcement extras (safe if already applied)
ALTER TABLE traffic_tickets
  ADD COLUMN IF NOT EXISTS officer_user_id TEXT;

ALTER TABLE traffic_tickets
  ADD COLUMN IF NOT EXISTS compliance_snapshot JSONB;
