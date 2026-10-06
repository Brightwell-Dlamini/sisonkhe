-- Driver signals: append-only intents from drivers to marshals.
-- Idempotent on signal id. Never mutates vehicles.status.

create table if not exists driver_signals (
  id            text primary key,
  driver_id     text not null,
  vehicle_reg   text not null,
  route_id      text,
  kind          text not null check (kind in (
                  'ready','loading','cabin_full','request_depart',
                  'delayed','breakdown','back_at_rank'
                )),
  note          text,
  occurred_at   timestamptz not null,
  status        text not null default 'pending'
                check (status in ('pending','consumed','expired')),
  consumed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists driver_signals_vehicle_idx
  on driver_signals (vehicle_reg, status, occurred_at desc);

create index if not exists driver_signals_route_idx
  on driver_signals (route_id, status, occurred_at desc);

-- Freeze history: no updates except status→consumed/expired transition.
create or replace function driver_signals_guard()
returns trigger language plpgsql as $$
begin
  if new.id <> old.id
     or new.driver_id <> old.driver_id
     or new.vehicle_reg <> old.vehicle_reg
     or new.kind <> old.kind
     or new.occurred_at <> old.occurred_at then
    raise exception 'driver_signals is append-only; only status may change';
  end if;
  return new;
end $$;

drop trigger if exists driver_signals_guard_trigger on driver_signals;
create trigger driver_signals_guard_trigger
  before update on driver_signals
  for each row execute function driver_signals_guard();

-- Auto-expire stale pending signals after 24h (called by a cron).
create or replace function expire_stale_driver_signals()
returns void language sql as $$
  update driver_signals
     set status = 'expired'
   where status = 'pending'
     and occurred_at < now() - interval '24 hours';
$$;
