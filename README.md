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
  ├── en / ss (siSwati) UI strings for field roles
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth + RLS authority lattice
```

## Localisation (Phase 5)

- `src/lib/i18n/messages.ts` — English + siSwati catalogs for offline, marshal, driver, common chrome
- `useLocale()` — preference in `localStorage` (`sisonkhe.locale`)
- `LocaleSwitcher` in the app topbar
- Offline banner respects the active locale

Expand message keys as more marshal/driver screens are wired to `t()`.

## Permissions

Capability matrix: `src/lib/auth/permissions.ts`. Nav items declare optional `permission` and are filtered by `navForRole()`.

## Financial integrity

- Journal posts on card top-ups and rank fees.
- Unified exception queue: `GET /api/admin/ops/exceptions` (also surfaced on `/admin/payments`).
- Regional pressure: `GET /api/admin/ops/regional-summary` (national only).

## Improvement roadmap

| Phase | Status |
|-------|--------|
| 1 Foundation | **Complete** |
| 2 Financial & ledger | **Complete** |
| 3 Intelligence | **Complete** |
| 4 Permissions & governance | **Complete** |
| 5 UX / localisation | **In progress** — i18n foundation, command-centre consequences, payments exception panel |

## License

Apache-2.0 (see file headers).
