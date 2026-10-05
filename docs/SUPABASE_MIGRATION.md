# Supabase migration — event-log sync & queue

This guide applies the SQL required by the current `main` branch:

- `sync_events` table + sequence (event-log protocol)
- `version` / `updated_at` columns on core tables (where missing)
- `shift_queue_forward` RPC used after depart / remove from queue
- Indexes for queue and status lookups
- RLS on `sync_events` (read for authenticated; writes via service role only)

**File:** [`supabase/migrations/20261005_event_sync_and_queue.sql`](../supabase/migrations/20261005_event_sync_and_queue.sql)

The script is **idempotent** — safe to run more than once.

---

## Prerequisites

1. A Supabase project with the existing Sisonkhe tables (`vehicles`, `routes`, etc.).
2. Dashboard access (or `psql` / Supabase CLI) with a role that can create tables and functions.
3. App env vars already set (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (optional; only if using Drizzle Kit locally)

---

## Option A — Supabase Dashboard (recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Paste the full contents of:

   ```
   supabase/migrations/20261005_event_sync_and_queue.sql
   ```

4. Click **Run**.
5. Confirm success (no red errors). Warnings about “already exists” are fine if you re-run.

### Quick verification

Run in SQL Editor:

```sql
-- Table exists
SELECT COUNT(*) AS sync_events_count FROM public.sync_events;

-- Sequence works
SELECT nextval('public.sync_events_seq_seq');

-- Function exists
SELECT proname FROM pg_proc WHERE proname = 'shift_queue_forward';

-- Vehicles have version
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicles'
  AND column_name IN ('version', 'updated_at', 'current_queue_position');
```

---

## Option B — Supabase CLI

```bash
# From repo root (link project once if needed)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply this migration file
npx supabase db push
# or run a single file:
psql "$DATABASE_URL" -f supabase/migrations/20261005_event_sync_and_queue.sql
```

Use the **connection string** from: Project Settings → Database → Connection string (URI).
Prefer the **session** mode URI for one-off migrations.

---

## Option C — Drizzle Kit (optional)

The repo includes `drizzle.config.ts` and `src/db/schema.ts`. Those define the *intended* shape; they do not replace the migration above for an already-populated database.

```bash
export DATABASE_URL="postgresql://postgres:...@db.PROJECT.supabase.co:5432/postgres"
npx drizzle-kit generate   # only if you change schema.ts further
npx drizzle-kit migrate    # only after reviewing generated SQL
```

For this release, **prefer Option A or B** with the checked-in SQL file.

---

## What the app expects after migration

| Feature | Depends on |
|--------|------------|
| `POST /api/sync/push`, `/api/sync/replay` | `sync_events` + sequence |
| `GET /api/sync/pull`, `/api/sync/watermark` | `sync_events.seq` |
| Marshal dispatch / reorder / add-to-queue | `vehicles.version`, `vehicles.updated_at`, `sync_events` inserts |
| Depart closes queue gap | `shift_queue_forward(p_route_id, p_from_position)` |

Legacy **`/api/fleet/sync`** (blob store) does **not** require this SQL; it uses Vercel KV / memory.

---

## Rollback (optional)

Only if you must undo this migration:

```sql
DROP FUNCTION IF EXISTS public.shift_queue_forward(text, integer);
DROP TABLE IF EXISTS public.sync_events;
DROP SEQUENCE IF EXISTS public.sync_events_seq_seq;
-- Do not drop version/updated_at columns if other code depends on them.
```

---

## Troubleshooting

| Symptom | Check |
|--------|--------|
| `relation "sync_events" does not exist` | Migration not applied; run Option A again. |
| `function shift_queue_forward does not exist` | Same; re-run the SQL file. |
| Inserts to `sync_events` fail with RLS | App must use **service role** on the server (`SUPABASE_SERVICE_ROLE_KEY`). |
| `seq` null / duplicate | Sequence missing; re-run section 1–2 of the SQL. |
| Queue reorder 500 | Confirm `vehicles.version` and `updated_at` exist. |

---

## After applying

1. Redeploy or restart the Next.js app so server code picks up any env changes.
2. Smoke-test:
   - Marshal: Add vehicle to queue → reorder up/down → Load → Depart.
   - Confirm a row appears: `SELECT * FROM sync_events ORDER BY seq DESC LIMIT 5;`
3. Optional: set `FLEET_SYNC_REQUIRE_SECRET=true` once no clients depend on the legacy blob path.
