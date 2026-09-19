-- =============================================================================
-- Sisonkhe In Transit — Initial Schema Migration
-- =============================================================================
-- This migration adds all NEW tables for the Sisonkhe In Transit application.
-- It does NOT modify the existing `marshals` or `sync_logs` tables.
--
-- Prerequisites:
--   - The Supabase project already has `public.marshals` and `public.sync_logs`
--   - `marshals.assigned_route_id` has been altered to text (already done)
--
-- To apply:
--   1. Open Supabase SQL Editor
--   2. Paste this file
--   3. Review the SQL one more time
--   4. Run
--
-- This migration is idempotent — running it twice is safe.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Sequences
-- -----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.sync_events_seq_seq START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- Reference data
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.regions (
  code text PRIMARY KEY,
  name text NOT NULL,
  terminal_name text NOT NULL,
  emergency_number text,
  announcement text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routes (
  id text PRIMARY KEY,
  region_code text NOT NULL REFERENCES public.regions(code),
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km numeric NOT NULL CHECK (distance_km > 0),
  base_fare_e numeric NOT NULL CHECK (base_fare_e >= 0),
  is_popular boolean NOT NULL DEFAULT false,
  start_time text,
  default_bay text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routes_region ON public.routes(region_code);

-- -----------------------------------------------------------------------------
-- Fleet
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicles (
  registration_number text PRIMARY KEY,
  vic text UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  seating_capacity integer NOT NULL CHECK (seating_capacity > 0),
  classification text NOT NULL CHECK (classification IN ('kombi', 'midbus', 'bus')),
  route_assignment_id text REFERENCES public.routes(id),
  loading_bay text,
  owner_name text,
  owner_phone text,
  owner_operator_id text,
  driver_id text,
  status text NOT NULL DEFAULT 'Waiting',
  current_queue_position integer NOT NULL DEFAULT 0,
  permit_number text,
  permit_status text CHECK (permit_status IN ('Active', 'Expired', 'Suspended') OR permit_status IS NULL),
  permit_issue_date date,
  permit_expiry_date date,
  cof_number text,
  cof_issue_date date,
  cof_expiry_date date,
  last_inspection_date date,
  association text,
  insurance_expiry date,
  roadworthiness_expiry date,
  is_mid_month_addition boolean NOT NULL DEFAULT false,
  registration_date date,
  month_registered text,
  mid_month_join_day integer,
  monthly_sequence_base_index integer,
  monthly_first_turn_history text[] DEFAULT ARRAY[]::text[],
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_route ON public.vehicles(route_assignment_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_queue ON public.vehicles(route_assignment_id, current_queue_position);

CREATE TABLE IF NOT EXISTS public.drivers (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  national_id text UNIQUE,
  phone text NOT NULL,
  residential_address text,
  date_of_birth date,
  gender text,
  license_number text UNIQUE,
  license_class text,
  pdp_number text,
  pdp_issue_date date,
  pdp_expiry_date date,
  pdp_issuing_authority text,
  pdp_status text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  assigned_vehicle_reg text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  avatar_seed text,
  profile_picture_url text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'On Leave', 'Off-Duty')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle ON public.drivers(assigned_vehicle_reg);

-- -----------------------------------------------------------------------------
-- Staff
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff (
  id text PRIMARY KEY,
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL CHECK (role IN ('super-admin', 'admin', 'fleet-manager', 'inspector')),
  region text,
  terminal_id text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Operations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trips (
  id text PRIMARY KEY,
  date date NOT NULL,
  departure_time text NOT NULL,
  arrival_time text,
  route_id text NOT NULL REFERENCES public.routes(id),
  vehicle_reg text NOT NULL,
  driver_id text NOT NULL,
  passenger_count integer NOT NULL CHECK (passenger_count > 0),
  trip_duration_minutes integer,
  delay_reason text,
  status text NOT NULL DEFAULT 'InProgress' CHECK (status IN ('InProgress', 'Completed', 'Cancelled')),
  revenue_szl numeric NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_route_date ON public.trips(route_id, date);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_date ON public.trips(vehicle_reg, date);

CREATE TABLE IF NOT EXISTS public.marshal_transactions (
  id text PRIMARY KEY,
  marshal_id text NOT NULL,
  timestamp timestamptz NOT NULL,
  date date NOT NULL,
  month text NOT NULL,
  vehicle_reg text NOT NULL,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  trigger_source text NOT NULL CHECK (trigger_source IN ('Full Cabin Button', 'Depart Button')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtx_marshal_date ON public.marshal_transactions(marshal_id, date);
CREATE INDEX IF NOT EXISTS idx_mtx_month ON public.marshal_transactions(month);

CREATE TABLE IF NOT EXISTS public.rank_fee_payments (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL,
  vehicle_reg text NOT NULL,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  payment_method text NOT NULL,
  transaction_ref text UNIQUE,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Success', 'Pending', 'Failed', 'Reversed')),
  allocation_operational numeric NOT NULL DEFAULT 0,
  allocation_nrtc numeric NOT NULL DEFAULT 0,
  allocation_maintenance numeric NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_vehicle ON public.rank_fee_payments(vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_payments_timestamp ON public.rank_fee_payments(timestamp DESC);

-- -----------------------------------------------------------------------------
-- Communication
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('SMS', 'WhatsApp', 'Push')),
  recipient_name text,
  recipient_phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'Sent' CHECK (status IN ('Sent', 'Delivered', 'Failed')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON public.notifications(timestamp DESC);

-- -----------------------------------------------------------------------------
-- Enforcement & incidents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.incidents (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL,
  reporter_name text NOT NULL,
  reporter_phone text NOT NULL,
  reporter_type text CHECK (reporter_type IN ('Commuter', 'Driver') OR reporter_type IS NULL),
  category text NOT NULL,
  description text NOT NULL,
  vehicle_reg text,
  route_id text REFERENCES public.routes(id),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Investigating', 'Escalated', 'Resolved')),
  escalated_to text,
  image_url text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON public.incidents(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

CREATE TABLE IF NOT EXISTS public.traffic_tickets (
  id text PRIMARY KEY,
  ticket_number text UNIQUE NOT NULL,
  timestamp timestamptz NOT NULL,
  vehicle_reg text NOT NULL,
  officer_name text NOT NULL,
  officer_badge text NOT NULL,
  offense_type text NOT NULL,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  location text,
  status text NOT NULL DEFAULT 'Issued' CHECK (status IN ('Issued', 'Paid', 'Synchronized', 'Challenged')),
  notes text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_vehicle ON public.traffic_tickets(vehicle_reg);
CREATE INDEX IF NOT EXISTS idx_tickets_timestamp ON public.traffic_tickets(timestamp DESC);

-- -----------------------------------------------------------------------------
-- Permits
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permit_renewal_requests (
  id text PRIMARY KEY,
  vehicle_reg text NOT NULL,
  fleet_id text,
  current_permit_number text,
  current_expiry_date date,
  operator text,
  driver text,
  reason_for_renewal text NOT NULL,
  comments text,
  supporting_documents text[] DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'Pending Admin Approval'
    CHECK (status IN ('Pending Admin Approval', 'Approved', 'Rejected')),
  timestamp timestamptz NOT NULL,
  request_date date NOT NULL,
  new_permit_number text,
  permit_issue_date date,
  permit_expiry_date date,
  cof_number text,
  cof_issue_date date,
  cof_expiry_date date,
  inspection_date date,
  licensing_office text,
  renewal_notes text,
  approved_by text,
  approval_date date,
  operator_license_number text,
  odometer_reading integer,
  year_of_manufacture integer,
  insurance_policy text,
  concession_id text,
  paid_with_master_card boolean NOT NULL DEFAULT false,
  master_payment_ref text,
  renewal_fee_amount_szl numeric,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON public.permit_renewal_requests(status);
CREATE INDEX IF NOT EXISTS idx_renewals_vehicle ON public.permit_renewal_requests(vehicle_reg);

CREATE TABLE IF NOT EXISTS public.permit_renewal_archives (
  id text PRIMARY KEY,
  vehicle_reg text NOT NULL,
  previous_permit_number text,
  new_permit_number text NOT NULL,
  issue_date date,
  expiry_date date,
  administrator text NOT NULL,
  renewal_date date NOT NULL,
  comments text,
  supporting_documents text[] DEFAULT ARRAY[]::text[],
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_archives_vehicle ON public.permit_renewal_archives(vehicle_reg);

CREATE TABLE IF NOT EXISTS public.permit_audit_logs (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text,
  date date NOT NULL,
  time text NOT NULL,
  device text,
  action text NOT NULL,
  previous_values jsonb,
  new_values jsonb,
  approval_decision text,
  ip_address inet,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.permit_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON public.permit_audit_logs(date DESC);

-- -----------------------------------------------------------------------------
-- Financial — cards
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vehicle_virtual_cards (
  id text PRIMARY KEY,
  card_number text UNIQUE NOT NULL,
  cvv_hash text NOT NULL,
  expiry_date text NOT NULL,
  vehicle_reg text UNIQUE NOT NULL,
  vic text NOT NULL,
  cardholder_name text,
  driver_id text REFERENCES public.drivers(id) ON DELETE SET NULL,
  driver_name text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Frozen', 'Suspended')),
  balance_szl numeric NOT NULL DEFAULT 0 CHECK (balance_szl >= 0),
  registration_fee_paid boolean NOT NULL DEFAULT false,
  registration_fee_amount numeric NOT NULL DEFAULT 0,
  registration_fee_date date,
  registration_receipt_ref text,
  card_tier text NOT NULL DEFAULT 'Commercial Concession',
  daily_spend_limit_szl numeric NOT NULL DEFAULT 0,
  qr_payload text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.virtual_card_transactions (
  id text PRIMARY KEY,
  card_id text NOT NULL REFERENCES public.vehicle_virtual_cards(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  direction text NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  terminal_or_marshal text,
  receipt_number text UNIQUE,
  status text NOT NULL DEFAULT 'Completed',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vctx_card_time ON public.virtual_card_transactions(card_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.fleet_operators (
  id text PRIMARY KEY,
  name text NOT NULL,
  company_name text NOT NULL,
  phone text NOT NULL,
  email text,
  national_id text UNIQUE,
  tax_number text UNIQUE,
  association text,
  avatar_url text,
  bank_account_ref text,
  operator_license_number text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operator_master_cards (
  id text PRIMARY KEY,
  card_number text UNIQUE NOT NULL,
  cvv_hash text NOT NULL,
  expiry_date text NOT NULL,
  operator_id text UNIQUE NOT NULL REFERENCES public.fleet_operators(id) ON DELETE CASCADE,
  operator_name text NOT NULL,
  company_name text NOT NULL,
  balance_szl numeric NOT NULL DEFAULT 0 CHECK (balance_szl >= 0),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Frozen')),
  card_tier text NOT NULL DEFAULT 'Enterprise Master Concession',
  daily_transfer_limit_szl numeric NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operator_card_transactions (
  id text PRIMARY KEY,
  card_id text NOT NULL REFERENCES public.operator_master_cards(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  target_vehicle_reg text,
  target_driver_name text,
  category text,
  amount_szl numeric NOT NULL CHECK (amount_szl > 0),
  direction text NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  receipt_number text UNIQUE,
  payment_method text,
  status text NOT NULL DEFAULT 'Completed',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_octx_card_time ON public.operator_card_transactions(card_id, timestamp DESC);

-- -----------------------------------------------------------------------------
-- Advertising
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.adverts (
  id text PRIMARY KEY,
  title text NOT NULL,
  sponsor_name text NOT NULL,
  image_url text NOT NULL,
  target_regions text[] NOT NULL DEFAULT ARRAY['All']::text[],
  is_active boolean NOT NULL DEFAULT true,
  file_size_bytes bigint,
  description text,
  promo_code text,
  contact_phone text,
  website_url text,
  category text,
  budget_szl numeric,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Sync infrastructure
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sync_events (
  id text PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE NOT NULL,
  client_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  seq bigint NOT NULL DEFAULT nextval('public.sync_events_seq_seq'),
  base_version integer
);
CREATE INDEX IF NOT EXISTS idx_sync_events_seq ON public.sync_events(seq);
CREATE INDEX IF NOT EXISTS idx_sync_events_entity ON public.sync_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_applied_at ON public.sync_events(applied_at DESC);

COMMIT;

-- =============================================================================
-- Migration complete. Next: run drizzle/0001_add_marshals_version.sql
-- =============================================================================
