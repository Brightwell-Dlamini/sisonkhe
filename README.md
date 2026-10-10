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
  ├── en / ss (siSwati) UI for marshal + driver field chrome
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth + RLS authority lattice
```

## Localisation (Phase 5)

- `src/lib/i18n/messages.ts` — English + siSwati catalogs
- `useLocale()` + topbar / marshal settings `LocaleSwitcher`
- Wired: offline banner, marshal header + queue actions, driver cab header + status buttons
- Dispatch buttons use ≥44px touch targets (`min-h-11` / `min-h-14`) for rank phones

## Permissions

Capability matrix: `src/lib/auth/permissions.ts`. Nav items declare optional `permission`.

## Financial integrity

- Journal posts on card top-ups and rank fees
- Unified exception queue on `/admin/payments` and `GET /api/admin/ops/exceptions`

## Improvement roadmap

| Phase | Status |
|-------|--------|
| 1–4 | **Complete** |
| 5 UX / localisation | **In progress** — field i18n + touch targets; more copy + operator surfaces remain |

## License

Apache-2.0 (see file headers).
