# Sisonkhe In Transit

**National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini**

Real-time departure boards, Driver Virtual Passes, Vehicle Owner Operator Master Cards, permit management, and multi-role dashboards for ranks across Hhohho, Manzini, Lubombo, and Shiselweni.

## Architecture (current direction)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5.7 (App Router) |
| UI | React 19 · Tailwind CSS 4 · Lucide · Motion · Recharts |
| Auth | Supabase Auth + role resolution |
| Primary store | Supabase Postgres (Drizzle schema in `src/db/schema.ts`) |
| Sync | Event-log protocol (`/api/sync/*`) — replaces whole-state blob |
| Offline | IndexedDB via Dexie + outbox worker |
| Cache / rate-limit | Upstash Redis |
| Deploy | Vercel |

> **Note:** The legacy blob store (`/api/fleet/sync`) remains for compatibility and is marked deprecated. New writes should use the event-log protocol.

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill Supabase + QR_HMAC_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key API surfaces

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/sync/push` | POST | Push SyncEvent batch |
| `/api/sync/pull` | GET | Pull events since watermark |
| `/api/sync/watermark` | GET | Latest sequence number |
| `/api/fleet/sync` | GET/POST | **Legacy** whole-state blob (deprecated) |
| `/api/qr/verify` | POST | Verify HMAC-signed vehicle QR |

## Roles

- Super Admin Control Centre
- Rank Administrator
- Fleet / Concession Manager
- Operator (Vehicle Owner)
- Driver
- Public Kiosk / Departure Board

## Production status

- [x] Next.js 15 App Router
- [x] HMAC-SHA256 QR signing
- [x] Supabase Auth + role resolution
- [x] Build-error suppression **removed**
- [x] Event-log sync protocol (server + client)
- [x] Dexie offline foundation + outbox
- [ ] Full migration of all writes off the blob store
- [ ] Complete operational UI parity
- [ ] Load testing & pilot hardening

## License

Apache-2.0
