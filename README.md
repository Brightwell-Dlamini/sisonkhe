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
  ├── en / ss (siSwati) for marshal, driver, operator field chrome
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  └── Supabase Postgres + Auth + RLS authority lattice
```

## Localisation (Phase 5)

- `src/lib/i18n/messages.ts` — English + siSwati catalogs
- `useLocale()` + topbar / marshal settings switcher
- **Marshal:** header, queue actions, delay/breakdown modal chrome, settings
- **Driver:** cab header, status buttons
- **Operator:** master card labels, send/reload/freeze, renewals page header
- Audit preset reasons (delay/breakdown) remain English for consistent ops logs
- Touch targets ≥44px on rank and wallet actions

## Permissions & finance

See `src/lib/auth/permissions.ts`. Journal + exception queue on `/admin/payments`.

## Improvement roadmap

| Phase | Status |
|-------|--------|
| 1–4 | **Complete** |
| 5 UX / localisation | **Largely complete** — field roles wired; native-speaker copy review recommended |

## License

Apache-2.0 (see file headers).
