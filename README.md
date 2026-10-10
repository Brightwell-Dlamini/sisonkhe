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
  ├── en / ss (siSwati) field chrome
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  ├── Rate limits (opt-in) + /api/health
  └── Supabase Postgres + Auth + RLS authority lattice
```

## Ops readiness (Phase 6)

| Endpoint / control | Purpose |
|--------------------|---------|
| `GET /api/health` | Liveness + DB probe (200 healthy / 503 degraded) |
| `RATE_LIMIT_ENABLED=1` | Turn on sliding-window limits (auth + payment intents) |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Shared Redis backend; else in-memory per instance |
| `RATE_LIMIT_FAIL_CLOSED=1` | Reject when Redis missing (default is fail-open) |
| `logEvent()` / existing observability log | JSON telemetry for log drains |

Sign-in: 30 attempts / IP / 15 min and 10 / identifier / 15 min when enabled.  
Payment intents: 20 / user / minute when enabled.

## Localisation (Phase 5)

`src/lib/i18n/messages.ts` — English + siSwati for marshal, driver, operator field chrome.

## Permissions & finance

See `src/lib/auth/permissions.ts`. Journal + exception queue on `/admin/payments`.

## Improvement roadmap

| Phase | Status |
|-------|--------|
| 1–4 Foundation → permissions | **Complete** |
| 5 UX / localisation | **Largely complete** |
| 6 Ops readiness (rate limit, health, telemetry) | **In progress** |

## License

Apache-2.0 (see file headers).
