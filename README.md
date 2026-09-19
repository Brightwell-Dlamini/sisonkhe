# Sisonkhe In Transit

**National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini**

Real-time departure boards, Driver Virtual Passes, Vehicle Owner Operator Master Cards, permit management, and multi-role dashboards for ranks across Hhohho, Manzini, Lubombo, and Shiselweni.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5.7 (App Router) |
| UI | React 19 · Tailwind CSS 4 · Lucide · Motion · Recharts |
| State | Client localStorage + `/api/fleet/sync` |
| Durable store | Vercel KV (optional) · in-memory fallback |
| Deploy | [Vercel](https://sisonkhe-brightwelldlaminis-projects.vercel.app) |

## Getting Started

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production URL

- App: https://sisonkhe-brightwelldlaminis-projects.vercel.app
- Health: https://sisonkhe-brightwelldlaminis-projects.vercel.app/api/health

## API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check (includes active store backend) |
| `/api/fleet/status` | GET | Lightweight `lastUpdated` poll |
| `/api/fleet/sync` | GET / POST | Full fleet state read/write |

## Enable durable multi-device sync (Vercel KV)

Without KV, fleet state is held in memory per serverless instance and will not reliably sync across regions/instances.

1. Open [Vercel Dashboard](https://vercel.com) → project **sisonkhe** → **Storage**
2. **Create** a KV database and **connect** it to this project
3. Redeploy (or push a commit) — `KV_REST_API_URL` / `KV_REST_API_TOKEN` are injected automatically
4. Confirm via `/api/health` → `"store": "vercel-kv"`

## Production checklist

- [x] Next.js 15 App Router migration
- [x] Vercel project linked (framework = nextjs)
- [x] CVE-2025-66478 patched (Next.js ≥ 15.5.7)
- [x] API route handlers with CORS, validation, size limits
- [x] Deployment protection relaxed for public kiosk access
- [x] KV-ready fleet store (auto-selects when env present)
- [ ] **Create & link Vercel KV** (see above)
- [ ] **Auth** — replace client-only login with Auth.js before public launch
- [ ] Set `FLEET_SYNC_SECRET` + enable `FLEET_SYNC_REQUIRE_SECRET` after client update
- [ ] Custom domain + SSL
- [ ] Remove `typescript.ignoreBuildErrors` after prop-type cleanup
- [ ] Split oversized components for maintainability

## Roles

- Super Admin Control Centre
- Rank Administrator
- Fleet / Concession Manager
- Operator (Vehicle Owner)
- Driver
- Public Kiosk / Departure Board

## License

Apache-2.0 (see source headers)
