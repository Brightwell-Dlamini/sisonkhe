-- =============================================================================
-- Payment intents
-- =============================================================================
-- Every payment initiated through a provider (MoMo, e-Mlangeni, manual)
-- creates a row here. Webhooks and polling update the status.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id text PRIMARY KEY,
  provider_id text NOT NULL,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  currency text NOT NULL DEFAULT 'SZL',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
  purpose text NOT NULL
    CHECK (purpose IN ('master_card_topup', 'vehicle_card_topup', 'rank_fee', 'renewal_fee')),
  target_entity_id text NOT NULL,
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_reference text UNIQUE NOT NULL,
  provider_reference text UNIQUE,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  redirect_url text,
  instructions text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user ON public.payment_intents(initiated_by);
CREATE INDEX IF NOT EXISTS idx_payment_intents_provider_ref ON public.payment_intents(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON public.payment_intents(created_at DESC);

-- =============================================================================
-- Payment credits
-- =============================================================================
-- A credit is written exactly once per successful intent.
-- Its presence proves the target entity has already been credited.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_credits (
  id text PRIMARY KEY,
  intent_id text NOT NULL UNIQUE REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own intents
DROP POLICY IF EXISTS "payment_intents_self_read" ON public.payment_intents;
CREATE POLICY "payment_intents_self_read" ON public.payment_intents
  FOR SELECT USING (auth.uid() = initiated_by);

-- Staff can read all intents
DROP POLICY IF EXISTS "payment_intents_staff_read" ON public.payment_intents;
CREATE POLICY "payment_intents_staff_read" ON public.payment_intents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid() AND staff.is_active = true
    )
  );

-- Writes go through the service role only (server-side). No client writes.

DROP POLICY IF EXISTS "payment_credits_staff_read" ON public.payment_credits;
CREATE POLICY "payment_credits_staff_read" ON public.payment_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.auth_user_id = auth.uid() AND staff.is_active = true
    )
  );
