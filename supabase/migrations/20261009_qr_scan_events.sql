-- QR verification audit trail (public + staff scans)
CREATE TABLE IF NOT EXISTS public.qr_scan_events (
  id text PRIMARY KEY,
  valid boolean NOT NULL,
  reason text,
  entity_type text,
  entity_key text,
  source text NOT NULL DEFAULT 'unknown',
  actor_user_id uuid,
  actor_role text,
  user_agent text,
  ip_hint text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_scan_events_scanned_at_idx
  ON public.qr_scan_events (scanned_at DESC);

CREATE INDEX IF NOT EXISTS qr_scan_events_entity_idx
  ON public.qr_scan_events (entity_type, entity_key);

CREATE INDEX IF NOT EXISTS qr_scan_events_valid_idx
  ON public.qr_scan_events (valid);

ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;

-- Service role inserts from the API; no public read/write via anon key.
