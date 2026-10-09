-- Payment webhook delivery log for ops visibility and idempotency diagnosis.
-- Best-effort: application code never fails if this table is missing.

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id                text PRIMARY KEY,
  provider_id       text NOT NULL,
  provider_reference text,
  status            text,
  outcome           text NOT NULL,
  applied           boolean NOT NULL DEFAULT false,
  error_message     text,
  raw_payload       jsonb,
  received_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_received_at_idx
  ON payment_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS payment_webhook_events_ref_idx
  ON payment_webhook_events (provider_reference)
  WHERE provider_reference IS NOT NULL;

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role only; no public policies.
