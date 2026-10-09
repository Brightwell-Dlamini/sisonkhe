# Sisonkhe In Transit

Multi-role commercial transport rank management platform for Eswatini.

Sisonkhe coordinates vehicle registries, driver compliance (permit / COF / PDP), rank queue dispatch, operator virtual cards, rank-fee and renewal payments (MoMo / eMlangeni), offline-first sync, and a regional/national command centre.

## Roles

| Role | Primary surface | Responsibility |
|------|-----------------|----------------|
| **Marshal** | `/marshal` | Queue order, load/depart, rank activity |
| **Driver** | `/driver` | Status, virtual card, roster, signals |
| **Operator** | `/operator` | Master card, fleet, permit renewals |
| **Inspector** | `/inspector` | Scan vehicles, issue tickets |
| **Admin / Fleet Manager** | `/admin` | Registry, permits, ledger, intelligence |
| **Super-admin** | `/admin/super` | National config, security, invariants, telemetry |
| **Public / Kiosk** | `/kiosk` | Region routes and assignments |

## Architecture (high level)

```
Next.js 15 (App Router)
  ├── Role shells + dashboards (React 19)
  ├── API routes (auth-scoped)
  ├── Intelligence snapshot (ranked work queue + consequences)
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth
        + Upstash Redis (rate limits)
        + Dexie (client offline outbox)
```

**Preferred data path:** relational tables + `/api/sync/{push,pull,replay}` event protocol.  
**Legacy path:** `/api/fleet/sync` blob store — retained only for older clients. Every access is logged as `fleet.legacy.used`. Planned removal after 2026-11-01 (or earlier once usage reaches zero).

## Key modules

| Path | Purpose |
|------|---------|
| `src/lib/intelligence/` | Command-centre KPIs, ranked work items, consequences, deep links |
| `src/lib/sync/` | Event-log apply/pull with idempotency + optimistic concurrency |
| `src/lib/marshal/` | Dispatch, roster, queue queries, rank-fee on depart |
| `src/lib/payments/` | Payment intents, webhooks, reconciliation, exception queue |
| `src/lib/ledger/` | Trip/settlement queries + double-entry journal helper |
| `src/lib/queue/` | Dispatch suggestion / fairness scoring |
| `src/lib/notifications/` | In-app notifications |
| `src/lib/invariants/` | Nightly money/identity/ops integrity checks |
| `src/lib/compliance/` | Proactive expiry digests |
| `src/lib/observability/` | Structured logging |
| `src/lib/offline/` | Dexie outbox, network heartbeat, background sync |

## Environment

Copy `.env.example` → `.env.local`. Required: Supabase, `AUTH_SECRET`, `QR_HMAC_SECRET`, Upstash Redis, `CRON_SECRET`. Optional: payment provider keys, `FLEET_SYNC_*`.

Feature flag: `NEXT_PUBLIC_USE_EVENT_SYNC=true` prefers the event-log path.

## Crons (Vercel)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/daily` | `0 2 * * *` | Daily maintenance |
| `/api/super/invariants/cron` | `0 2 * * *` | Nightly invariant run + staff alerts |
| `/api/cron/compliance-digest` | `0 6 * * *` | Permit/COF/PDP expiry notifications |
| `/api/cron/payment-reconcile` | `30 3 * * *` | Unmatched intents / rank fees |

All cron routes require `Authorization: Bearer $CRON_SECRET`.

## Financial integrity

- Payment intents use cryptographic ids and optimistic card-balance updates.
- Successful card top-ups and rank fees post balanced journal entries (`ledger.journal.post`).
- `GET /api/admin/ops/exceptions` returns a unified exception queue (reconciliation + card-ledger drifts).
- Rank fee on depart writes `payment.rank_fee.recorded` audit + journal lines for operational/NRTC/maintenance splits.

## Improvement roadmap

**Phase 1 (foundation) — complete**  
Legacy deprecation telemetry, event-log hardening, offline outbox resilience, invariants/payment crons, structured observability.

**Phase 2 (financial & ledger) — complete**  
Double-entry journal helper, money audit actions, exception queue API, journals on top-ups and rank fees, card-ledger drift telemetry.

**Phase 3 (intelligence) — in progress**  
Work-item consequence lines, financial exceptions on the intelligence risk radar, existing fairness-aware queue suggestions retained.

## License

Apache-2.0 (see file headers).
