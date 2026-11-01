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
| **Super-admin** | `/admin/super` | National config, security, invariants |
| **Public / Kiosk** | `/kiosk` | Region routes and assignments |

## Architecture

```
Next.js 15 (App Router)
  ├── Permission-aware nav + role shells
  ├── Intelligence + ops command centre
  ├── en / ss (siSwati) field chrome
  ├── Event-log sync (preferred)  ←  legacy fleet blob (deprecated)
  ├── Rate limits (opt-in) + /api/health
  ├── Ed25519 signed QR (v2) + live registry verify
  └── Supabase Postgres + Auth + RLS authority lattice
```

## QR verification

| Token | Algorithm | Status |
|-------|-----------|--------|
| `v2.…` | Ed25519 | Preferred for new prints |
| `v1.…` | HMAC-SHA256 | Still verified (legacy paper) |

Printed QRs encode a verify URL with the token in the **hash** (`/verify#t=…`) so access logs do not store credentials. Signature authenticity and live permit status are separate checks.

**Required env for new issues:** `QR_ED25519_PRIVATE_KEY`, `NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY` (see `.env.example`). Keep `QR_HMAC_SECRET` so existing v1 stickers still verify. Without Ed25519 keys, issue falls back to v1 HMAC.

## Ops readiness

| Endpoint / control | Purpose |
|--------------------|---------|
| `GET /api/health` | Liveness + DB probe (200 healthy / 503 degraded) |
| `RATE_LIMIT_ENABLED=1` | Sliding-window limits (auth + payment intents) |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Shared Redis; else in-memory per instance |
| `RATE_LIMIT_FAIL_CLOSED=1` | Reject when Redis missing (default fail-open) |

## Localisation

`src/lib/i18n/messages.ts` — English + siSwati for marshal, driver, operator field chrome.

## Permissions & finance

See `src/lib/auth/permissions.ts`. Journal + exception queue on `/admin/payments`.

## Roadmap status

| Phase | Status |
|-------|--------|
| 1–4 Foundation → permissions | **Complete** |
| 5 UX / localisation | **Complete** |
| 6 Ops readiness | **Complete** |
| QR crypto hardening (Ed25519, revision, offline) | **Complete** |

## License

Apache-2.0 (see file headers).
