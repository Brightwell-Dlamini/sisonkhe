# Sisonkhe In Transit

**National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini**

Real-time departure boards, Driver Virtual Passes, Vehicle Owner Operator Master Cards, permit management, and multi-role dashboards for ranks across Hhohho, Manzini, Lubombo, and Shiselweni.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 · Tailwind CSS 4 · Lucide · Motion · Recharts |
| State | Client localStorage + `/api/fleet/sync` |
| Deploy | Vercel |

## Getting Started

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/fleet/status` | GET | Lightweight `lastUpdated` poll |
| `/api/fleet/sync` | GET / POST | Full fleet state read/write |

Optional write protection: set `FLEET_SYNC_SECRET` and send it as `X-Fleet-Sync-Secret` (or `Authorization: Bearer …`) on POST.

## Production checklist

- [x] Next.js 15 App Router migration
- [x] Vercel project linked (framework = nextjs)
- [x] API route handlers with CORS, validation, size limits
- [x] `.env.example` and optional sync secret
- [ ] **Durable store** — replace in-memory `fleetStore` with Vercel KV / Upstash Redis / Postgres
- [ ] **Auth** — replace client-only login with Auth.js (or similar) before public launch
- [ ] Set `FLEET_SYNC_SECRET` in Vercel project env (Production + Preview)
- [ ] Custom domain + SSL
- [ ] Split oversized components (`SuperAdminControlCentre`, `FleetManagerTab`) for maintainability
- [ ] Error boundaries and structured logging

### Upgrading the fleet store

1. `npm install @vercel/kv`
2. Create a KV store in the Vercel dashboard and link it to the project
3. Implement `StorageAdapter` in `src/lib/fleetStore.ts` using `kv.get` / `kv.set`
4. Redeploy

## Roles

- Super Admin Control Centre
- Rank Administrator
- Fleet / Concession Manager
- Operator (Vehicle Owner)
- Driver
- Public Kiosk / Departure Board

## License

Apache-2.0 (see source headers)
