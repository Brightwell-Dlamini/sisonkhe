# Sisonkhe In Transit — Production Roadmap

**Status:** Pre-production stabilization
**Target:** Mbabane Main Rank pilot in 12 weeks
**Owner:** Lead Engineer (AI) + Product Owner (Human)
**Last updated:** Week 0

---

## Operating Principles

1. **No fake crypto. Ever.**
2. **No `ignoreBuildErrors`. Ever.**
3. **Every phase ships with tests.**
4. **Offline-first is a requirement, not a feature.**
5. **Money writes are transactional and idempotent.**
6. **If the network dies, marshals keep working.**
7. **Nothing disappears silently.**

---

## Phase Overview

| Week | Phase | Status | Exit Criteria |
|------|-------|--------|---------------|
| 1 | 0 — Stabilize foundation | 🚧 In progress | `typecheck` clean, tests pass, unified store |
| 2 | 1 — Real security | ⏳ Pending | HMAC QR, Auth.js, rate limits, audit logs |
| 3 | 2a — Supabase schema | ⏳ Pending | Drizzle schema, migrations, seed script |
| 4 | 2b — Sync protocol | ⏳ Pending | SSE endpoint, outbox, watermark sync |
| 5 | 3a — Offline shell | ⏳ Pending | Dexie, service worker, offline indicator |
| 6 | 3b — Offline sync | ⏳ Pending | Conflict resolution, replay-on-reconnect |
| 7 | 4a — Settlement ledger | ⏳ Pending | Manual reconciliation dashboard |
| 8 | 4b — MoMo integration | ⏳ Pending | Webhooks, cron, reconciliation |
| 9 | 5a — Domain PWAs | ⏳ Pending | Inspector PWA, commuter PWA, i18n |
| 10 | 5b — Domain polish | ⏳ Pending | Print templates, hours-of-service |
| 11 | 6a — Load & chaos | ⏳ Pending | 200 concurrent kiosks, DR drill |
| 12 | 6b — Mbabane pilot | ⏳ Pending | Live marshal, real vehicles |

---

## Phase 0 — Stabilize Foundation (Week 1)

### Tasks

- [x] **P0-01** Remove `ignoreBuildErrors` from `next.config.ts`
- [x] **P0-02** Add security headers to `next.config.ts`
- [ ] **P0-03** Run `npm run typecheck`, catalog every error
- [ ] **P0-04** Fix all typecheck errors (est. 50–100)
- [ ] **P0-05** Delete duplicate `types.ts`
- [ ] **P0-06** Consolidate `types/` into one canonical file
- [ ] **P0-07** Reconcile `fleet_state.json` with `mockData.INITIAL_*`
- [ ] **P0-08** Remove URL `systemState` publishing (deprecate)
- [ ] **P0-09** Build unified `src/store/useFleetStore.ts`
- [ ] **P0-10** Migrate `App.tsx` to use unified store
- [ ] **P0-11** Fix `baseMonthsTotal` in `queueSequence.ts`
- [ ] **P0-12** Add Vitest + first test suites
- [ ] **P0-13** Set up `CHANGELOG.md`
- [ ] **P0-14** Set up `.env.example`
- [ ] **P0-15** Add `DECISIONS.md` with first 5 ADRs

### Exit Criteria
- `npm run typecheck` exits 0
- `npm test` passes with ≥ 30 tests
- No `ignore*` flags in build config
- Store consolidation complete

---

## Phase 1 — Real Security (Week 2)

### Tasks

- [ ] **P1-01** Replace XOR+rolling-hash QR with HMAC-SHA256 (server-signed)
- [ ] **P1-02** Fix QR validation to reject unknown vehicles & suspended permits
- [ ] **P1-03** Add Auth.js v5 (NextAuth)
- [ ] **P1-04** Migrate passwords to bcrypt (server-side only)
- [ ] **P1-05** Remove default-Super-Admin fallback
- [ ] **P1-06** Add rate limiting to `/api/fleet/*`
- [ ] **P1-07** Add CSRF protection to mutating endpoints
- [ ] **P1-08** Server-side audit logging for all mutations
- [ ] **P1-09** Penetration test (self-review + fix)
- [ ] **P1-10** Session timeout + concurrent session limits

### Exit Criteria
- Independent QR forgery attempt fails
- Login bypass attempt fails
- Rate limits enforced
- Audit log covers 100% of mutating endpoints

---

## Phase 2 — Schema (Week 3) — IN PROGRESS

### Deliverables
- [x] Design full schema with conflict-free conventions
- [x] `src/db/schema.ts` Drizzle schema
- [x] `drizzle/0000_initial.sql` full migration
- [x] `drizzle/0001_add_marshals_version.sql` one-column change
- [x] `drizzle/0002_rls_policies.sql` RLS
- [x] `drizzle/0003_seed_reference_data.sql` regions + routes
- [x] `scripts/seed.ts` operators, drivers, vehicles
- [x] `SCHEMA-DECISIONS.md` rationale
- [ ] **You apply migrations in Supabase SQL Editor** ← next step
- [ ] **You seed via `npx tsx scripts/seed.ts`** (uses service role key)

### Exit Criteria
- All tables created in Supabase
- RLS enabled and tested
- `marshals` query still works from the portal
- Reference data present

Phase 2b — Sync Protocol (Week 4)

Event Envelope
interface SyncEvent {
  id: string;              // UUID v7 (client-generated)
  entityType: string;      // "vehicle", "rank_fee", ...
  entityId: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  idempotencyKey: string;  // UUID v7
  clientId: string;
  occurredAt: string;      // ISO 8601
  baseVersion?: number;    // for optimistic concurrency
}
Endpoints
Endpoint	Method	Purpose
/api/sync/push	POST	Batch of events from client
/api/sync/pull	GET	Events since watermark
/api/sync/stream	GET	SSE — realtime push to client
/api/sync/watermark	GET	Lightweight — just the latest sequence

Phase 3 — Offline (Weeks 5–6)
Client Storage Schema (Dexie)
class SisonkheDB extends Dexie {
  vehicles!: Table<Vehicle>;
  drivers!: Table<Driver>;
  queueEvents!: Table<QueueEvent>;
  rankFees!: Table<RankFee>;
  outbox!: Table<SyncEvent>;
  watermarks!: Table<{ table: string; seq: number }>;

  constructor() {
    super("sisonkhe");
    this.version(1).stores({
      vehicles: "registrationNumber, vic, status, updatedAt",
      drivers: "id, assignedVehicleReg",
      queueEvents: "id, vehicleReg, occurredAt",
      rankFees: "id, vehicleReg, occurredAt",
      outbox: "id, entityType, occurredAt",
      watermarks: "table",
    });
  }
}
Phase 4 — Payments (Weeks 7–8)
Blocked on: MTN MoMo business account application (start now).
Phase 5 — Domain (Weeks 9–10)
Blocked on: NRTC sample permits (request now).
Phase 6 — Pilot (Weeks 11–12)
Blocked on: Mbabane rank marshal availability.
Dependencies External To Engineering


Item	Owner	Needed By	Status
MTN MoMo business account	Product Owner	Week 7	⏳
e-Mlangeni merchant account	Product Owner	Week 8	⏳
NRTC permit samples	Product Owner	Week 10	⏳
Supabase Pro upgrade	Product Owner	Week 11	⏳
Vercel Pro upgrade	Product Owner	Week 4	⏳
Mbabane pilot MOU	Product Owner	Week 10	⏳


---

## 3. `DECISIONS.md` — Architecture Decision Records

```markdown
# Architecture Decision Records

## ADR-001: Single-Tenant National Instance

**Status:** Accepted
**Date:** Week 0
**Context:** Sisonkhe In Transit serves one country (Eswatini), one authority (NRTC), and multiple ranks. The question is whether to model this as a multi-tenant SaaS or a single-tenant national system.

**Decision:** Single-tenant.

**Rationale:**
- One country, one authority, one regulator — no tenant isolation required
- Multi-tenancy adds complexity (RLS, per-tenant config, tenant switching) that provides no value here
- Ranks are branches, not tenants. Region/rank is a column, not a boundary.
- If expansion to a second country happens, add a `country_code` column

**Consequences:**
- Simpler auth (no tenant context in sessions)
- Simpler queries (no tenant filter)
- Simpler backup/restore
- Migration to multi-tenant (if ever needed) requires adding `tenant_id` to all tables + RLS policies

---

## ADR-002: Supabase Postgres + Upstash Redis

**Status:** Accepted
**Date:** Week 0
**Context:** Need durable storage + fast cache for real-time kiosks.

**Decision:** Supabase Postgres (primary store) + Upstash Redis (hot reads, rate limits).

**Rationale:**
- Supabase: managed Postgres, generous free tier, row-level security, storage buckets, auth (which we may adopt in Phase 1)
- Upstash: serverless Redis, per-request pricing, works over HTTP (no connection pooling needed on Vercel Edge)
- Both have clear upgrade paths to production tiers

**Alternatives considered:**
- **Vercel KV:** KV-only, no relational queries. Insufficient for our join-heavy domain.
- **PlanetScale:** MySQL, no foreign keys. Would fight us.
- **Neon:** Excellent Postgres, but Supabase has auth + storage bundled which we'll need.
- **Self-hosted Postgres:** Ops burden we don't want. Reconsider at 10x scale.

**Consequences:**
- Free tiers will be outgrown in ~6 months; budget ~$50/mo at that point
- Supabase free tier pauses after 7 days inactivity — acceptable in dev, not in prod
- Upstash rate limits: 10k commands/day free — migrate to Pay-as-you-go at 8k/day

---

## ADR-003: Event-Log Sync Over State Sync

**Status:** Accepted
**Date:** Week 0
**Context:** Current system pushes entire arrays (vehicles, drivers) to the server. This causes last-write-wins clobbering and high bandwidth.

**Decision:** Replace with event-log sync. Client pushes *events*, not *state*.

**Rationale:**
- Events are idempotent (UUID + operation)
- Events are additive (no clobbering)
- Events carry intent (semantic meaning, not just data)
- Events are naturally auditable
- Bandwidth scales with activity, not dataset size

**Alternatives considered:**
- **State sync with versioning:** Still clobbers under concurrent writes
- **CRDTs (Yjs, Automerge):** Overkill; our conflicts are simple
- **Server-authoritative with client polling:** Breaks offline-first

**Consequences:**
- Server must maintain an event log (adds `sync_events` table)
- Client must maintain an outbox (adds IndexedDB table)
- Conflicts are resolved server-side (needs a policy per entity type)
- Sync becomes append-only, which is more efficient and more debuggable

---

## ADR-004: Server-Sent Events Over WebSockets

**Status:** Accepted
**Date:** Week 0
**Context:** Need realtime updates for kiosks and marshals.

**Decision:** SSE, with polling fallback.

**Rationale:**
- SSE is one-way (server → client) which matches our realtime needs
- Client → server is outbox-driven (not realtime critical)
- SSE survives flaky networks better than WS (auto-reconnect built-in)
- SSE works through all proxies; WS sometimes doesn't
- SSE is simpler to load-balance

**Consequences:**
- One-way only — if we ever need low-latency bidirectional (e.g., live typing), we'll need WS
- HTTP/1.1 limits to 6 concurrent SSE connections per browser — fine for our use case
- Needs a heartbeat every 15s to keep proxies from closing idle connections

---

## ADR-005: IndexedDB via Dexie, Not localStorage

**Status:** Accepted
**Date:** Week 0
**Context:** Current app uses localStorage for everything. This breaks down: 5MB cap, synchronous API (blocks main thread), no indexing, no transactions.

**Decision:** IndexedDB via Dexie.js for all client storage. localStorage only for trivial preferences (dark mode, active region).

**Rationale:**
- IndexedDB: 50MB+ quota, async, indexed, transactional
- Dexie: ergonomic API, TypeScript-friendly, good migration story
- localStorage's synchronous API causes jank on larger datasets
- localStorage has no query capability — we filter arrays in memory

**Consequences:**
- Slightly more code (Dexie schema + migration)
- Need to handle IndexedDB disabled/blocked in private browsing (fallback to in-memory)
- Migration from localStorage → IndexedDB needed on first load
