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
  ├── Intelligence snapshot (ranked work queue)
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth
        + Upstash Redis (rate limits)
        + Dexie (client offline outbox)
```

**Preferred data path:** relational tables + `/api/sync/{push,pull,replay}` event protocol.  
**Legacy path:** `/api/fleet/sync` blob store — retained only for older clients; disabled when `FLEET_SYNC_REQUIRE_SECRET=true` and no secret is presented.

## Key modules

| Path | Purpose |
|------|---------|
| `src/lib/intelligence/` | Command-centre KPIs, ranked work items, deep links |
| `src/lib/sync/` | Event-log apply/pull with idempotency + optimistic concurrency |
| `src/lib/marshal/` | Dispatch, roster, queue queries |
| `src/lib/payments/` | Payment intents and provider webhooks |
| `src/lib/notifications/` | In-app notifications (staff, drivers, operators, marshals) |
| `src/lib/invariants/` | Nightly money/identity/ops integrity checks |
| `src/lib/compliance/` | Proactive expiry digests and operator alerts |
| `src/lib/queue/` | Dispatch suggestion / fairness helpers |
| `src/lib/payments/reconciliation.ts` | Intent ↔ ledger matching helpers |
| `src/lib/pagination.ts` | Shared cursor/limit helpers for list APIs |

## Environment

Copy `.env.example` → `.env.local`. Required groups:

- Supabase URL + anon + service role + `DATABASE_URL`
- `AUTH_SECRET`, `AUTH_URL`
- `QR_HMAC_SECRET`
- Upstash Redis (rate limits)
- `CRON_SECRET` (Vercel cron auth)
- Optional: payment provider keys, `FLEET_SYNC_*` legacy flags

Feature flag: `NEXT_PUBLIC_USE_EVENT_SYNC=true` prefers the event-log path on clients.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Crons (Vercel)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/super/invariants/cron` | `0 2 * * *` | Nightly invariant run + staff alerts |
| `/api/cron/compliance-digest` | `0 6 * * *` | Daily permit/COF/PDP expiry notifications |
| `/api/cron/payment-reconcile` | `30 3 * * *` | Flag unmatched intents / rank fees |

All cron routes require `Authorization: Bearer $CRON_SECRET`.

## Offline

Marshals and drivers can work offline via Dexie outbox. On reconnect, clients push events to `/api/sync/push` and pull from `/api/sync/pull`. Version conflicts are returned in the push response for client-side resolution.

## Security notes

- Role gates live in `src/lib/auth/` and middleware.
- Money and permit mutations should always write audit-friendly rows (permit_audit_logs, card transactions).
- Never commit `.env.local` or service-role keys.

## License

Apache-2.0 (see file headers).
