-- Per-user in-app notifications (safe to re-run)
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id            text PRIMARY KEY,
  auth_user_id  uuid NOT NULL,
  role          text,
  type          text NOT NULL,
  title         text NOT NULL,
  message       text NOT NULL,
  href          text,
  entity_type   text,
  entity_id     text,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (auth_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (auth_user_id)
  WHERE read_at IS NULL;

-- Legacy global table may exist; leave it alone.

COMMIT;
