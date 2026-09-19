# Schema Review Checklist

**Status:** Awaiting input from Product Owner
**Blocks:** Phase 2 (Supabase schema design)

Before I design the full Sisonkhe In Transit schema, I need to understand the
existing Supabase project. Please fill in the answers below.

---

## Existing Supabase Project

### Project details

- **Project URL:** `https://[redacted].supabase.co`
- **Region:** (e.g. `eu-west-2`, `af-south-1`)
- **Tier:** (Free / Pro / Team)
- **Created:** (approximate date)

### Existing tables

1. **Marshal registrations table**
   - Table name: ?
   - Row count: ?
   - Columns (name + type): ?
   - Primary key: ?
   - Unique constraints: ?
   - Foreign keys: ?
   - Indexes: ?
   - RLS policies enabled? Y/N
   - Sample row (PII redacted): ?

2. **Sync logs table**
   - Table name: ?
   - Row count: ?
   - Columns (name + type): ?
   - What entities does it log? (marshals only? other?)
   - Log format: (JSONB? columns? both?)
   - Retention policy: (forever? 90 days?)
   - Is it append-only? Y/N
   - Sample row: ?

### Registration portal

- **URL:** ?
- **Framework:** (Next.js? SvelteKit? something else?)
- **Repo:** (link if separate)
- **Auth method:** (email + password? phone + OTP? magic link?)
- **How does it write to Supabase?** (client SDK? edge functions? API routes?)
- **Does it use Supabase Auth?** Y/N
- **Offline storage on client:** (IndexedDB? localStorage? something else?)
- **Sync trigger:** (on every change? batched? on reconnect?)
- **Conflict resolution:** (how does it handle concurrent writes?)

### Data ownership questions

Answer these as best you can:

1. **Are marshals expected to log in to Sisonkhe In Transit using the same
   credentials they created in the registration portal?**
   (This decides whether we share Supabase Auth users or maintain two systems.)

2. **If a marshal changes their phone number in the registration portal,
   should Sisonkhe In Transit reflect that change within minutes, hours,
   or the next day?**

3. **Can a marshal be deleted from the system? Or only deactivated?**

4. **What happens to a marshal's historical rank fee transactions if their
   account is deactivated?**

5. **Are there any other tables planned for the portal that I should know
   about before I design the shared schema?**

---

## Recommended Approach (once we have answers)

Assuming the existing marshal table is well-structured:

1. **Adopt it as the canonical marshal table.** Do not create a new one.
2. **Extend it** with additional columns needed for Sisonkhe In Transit
   (e.g. `assigned_route_id`, `card_number`, `card_balance_szl`), using
   `ALTER TABLE ADD COLUMN` — no destructive changes.
3. **Extend `sync_logs`** to cover all Sisonkhe entities, not just marshals,
   OR create a parallel `fleet_sync_log` table that shares the same envelope
   format. Recommendation: one unified table, since the portal and app share
   the same offline-first model.
4. **Do not duplicate auth.** Use Supabase Auth for both systems. The portal
   and app become two frontends over one Supabase project.
5. **Migrate the portal to consume the same sync protocol** as Sisonkhe In
   Transit (Phase 3 work). Until then, both systems can write to the same
   tables using different mechanisms — but the schema is shared.

If the existing table is NOT well-structured, we discuss migration options
before proceeding.

---

## Please Paste

Into your next message, please paste:

1. The `CREATE TABLE` statement for the marshal table (`\d marshals` output
   from Supabase SQL editor)
2. The `CREATE TABLE` statement for `sync_logs`
3. One sample row from each (PII redacted)
4. A link to the registration portal (or its repo, if private)
5. Your answers to the 5 ownership questions above

Once I have these, Phase 2 proceeds immediately.
