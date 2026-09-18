# Sisonkhe In Transit

**National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini**

Real-time departure boards, Driver Virtual Passes, Vehicle Owner Operator Master Cards, permit management, and multi-role dashboards for ranks across Hhohho, Manzini, Lubombo, and Shiselweni.

## Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS 4 + Lucide icons + Motion + Recharts
- **State**: Client-side localStorage + server sync API (`/api/fleet/sync`)
- **Deployment**: Vercel-ready

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Notes

- The fleet sync API currently uses an in-memory store (suitable for single-instance / preview). For multi-region production, migrate the store to Vercel KV, Upstash Redis, or Postgres.
- Authentication is currently a lightweight client-side model. Harden with NextAuth / Auth.js or similar before public launch.
- Camera permission is requested for QR scanning features.

## Roles

- Super Admin Control Centre
- Rank Administrator
- Fleet / Concession Manager
- Operator (Vehicle Owner)
- Driver
- Public Kiosk / Departure Board

## License

Apache-2.0 (see source headers)
