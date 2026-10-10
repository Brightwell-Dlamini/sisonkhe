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

## Architecture

```
Next.js 15 (App Router)
  ├── Permission-aware nav + role shells
  ├── Intelligence + ops command centre
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth + RLS authority lattice
```

## Permissions (Phase 4)

Capability matrix: `src/lib/auth/permissions.ts`. Nav items declare optional `permission` and are filtered by `navForRole()`.

| Permission | Gates |
|------------|-------|
| `admin.ops.view` | exceptions, card-ledger, reconciliation, webhooks, rank-fee GET |
| `admin.payments.manage` | retry-credit |
| `admin.command_centre` | command-center snapshot |
| `admin.config` | rank-fee PATCH, system config |
| `admin.national` | cross-region data (super-admin) |

DB policies: `supabase/migrations/20261018_authority_lattice.sql` (+ follow-ups).

## Financial integrity

- Journal posts on card top-ups and rank fees.
- Unified exception queue: `GET /api/admin/ops/exceptions`.
- Regional pressure: `GET /api/admin/ops/regional-summary` (national only).

## Improvement roadmap

| Phase | Status |
|-------|--------|
| 1 Foundation | **Complete** |
| 2 Financial & ledger | **Complete** |
| 3 Intelligence | **Complete** |
| 4 Permissions & governance | **Complete** |
| 5+ UX / localisation | Not started |

## License

Apache-2.0 (see file headers).
