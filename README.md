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
  ├── API routes (permission-scoped)
  ├── Intelligence snapshot (ranked work + consequences)
  ├── Ops command centre + regional pressure summary
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth + RLS authority lattice
        + Upstash Redis (rate limits)
        + Dexie (client offline outbox)
```

**Preferred data path:** relational tables + `/api/sync/{push,pull,replay}` event protocol.  
**Legacy path:** `/api/fleet/sync` — logged as `fleet.legacy.used`; planned removal after 2026-11-01.

## Key modules

| Path | Purpose |
|------|---------|
| `src/lib/intelligence/` | KPIs, ranked work items, consequences, deep links |
| `src/lib/ops/` | Command centre snapshot, regional pressure summary |
| `src/lib/sync/` | Event-log apply/pull with idempotency |
| `src/lib/marshal/` | Dispatch, roster, rank-fee on depart |
| `src/lib/payments/` | Intents, webhooks, reconciliation, exception queue |
| `src/lib/ledger/` | Settlements + double-entry journal helper |
| `src/lib/queue/` | Fairness-aware dispatch suggestions |
| `src/lib/auth/` | Role resolution, permission matrix, session gates |
| `src/lib/observability/` | Structured logging |
| `src/lib/offline/` | Dexie outbox, reconnect replay |

## Financial integrity

- Optimistic card balances; cryptographic intent ids.
- Top-ups and rank fees post balanced journal entries (`ledger.journal.post`).
- `GET /api/admin/ops/exceptions` — unified recon + card-drift queue (`admin.ops.view`).
- `GET /api/admin/ops/regional-summary` — national heat-map pressure (national scope only).

## Permissions (Phase 4)

Capability matrix in `src/lib/auth/permissions.ts`. Notable ops permissions:

| Permission | Who | Gates |
|------------|-----|-------|
| `admin.ops.view` | admin, fleet-manager, super-admin | exceptions, card-ledger, reconciliation, regional-summary |
| `admin.payments.manage` | same | payment repair flows |
| `admin.command_centre` | same | command-center snapshot |
| `admin.national` | super-admin | cross-region data |

DB RLS policies live under `supabase/migrations/20261018_authority_lattice.sql` (+ follow-ups).

## Improvement roadmap

**Phase 1 (foundation) — complete**  
**Phase 2 (financial & ledger) — complete**  
**Phase 3 (intelligence) — complete** — work-item consequences, financial risks on radar, regional pressure summary, command-centre exception links.  
**Phase 4 (permissions & governance) — in progress** — `admin.ops.view` / `admin.payments.manage`, permission-gated ops APIs, existing authority lattice migrations.  
**Phase 5+** — UX, localisation, further invariant coverage.

## License

Apache-2.0 (see file headers).
