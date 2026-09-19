# Changelog

All notable changes to Sisonkhe In Transit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- Phase 1: Real HMAC-SHA256 QR codes, Auth.js, rate limiting
- Phase 2: Supabase Postgres schema, Drizzle migrations, sync protocol
- Phase 3: Offline-first via IndexedDB + service worker
- Phase 4: MTN MoMo integration, settlement ledger
- Phase 5: Inspector PWA, commuter PWA, siSwati i18n
- Phase 6: Mbabane pilot

---

## [0.1.0] — 2026-09-19 — Phase 0 Kickoff

### Added
- `ROADMAP.md` — full 12-week plan
- `DECISIONS.md` — first 5 architecture decision records (ADRs)
- `src/store/useFleetStore.ts` — unified Zustand-based store (replaces 4-way sync)
- `src/store/sync/protocol.ts` — sync event envelope types
- `src/utils/queueSequence.test.ts` — 20 tests for rotation math
- `src/utils/virtualCards.test.ts` — 10 tests for card ledger
- `src/utils/helper.test.ts` — 9 tests for VIC, route codes, sync
- Security headers in `next.config.ts` (HSTS, CSP-ish, X-Frame-Options)
- `CHANGELOG.md` (this file)

### Changed
- `next.config.ts`: `ignoreBuildErrors` and `ignoreDuringBuilds` **disabled**
- `next.config.ts`: `bodySizeLimit` reduced 5mb → 2mb
- `package.json`: version `1.0.1` → `0.1.0` (reset to reflect pre-production status)
- `package.json`: added zustand, vitest, drizzle, dexie, next-auth, zod, upstash

### Fixed
- **queueSequence.ts**: `baseMonthsTotal` is now derived from `new Date()`, not hardcoded to September 2026. Previously, rotation offsets became stale every month.

### Security
- Removed `ignoreBuildErrors` — type errors now fail the build
- Removed `ignoreDuringBuilds` for ESLint
- Added HSTS with preload directive
- Added X-Frame-Options: DENY (clickjacking protection)
- Added Permissions-Policy restricting camera/microphone/geolocation

### Deprecated
- URL `systemState` param publishing (to be removed in Phase 0b)
- `localStorage` for fleet state (to be replaced with IndexedDB in Phase 3)

### Removed
- Nothing yet

### Known Issues
- ~50-100 TypeScript errors remain (P0-03 tracking)
- QR cryptographic seal is still fake XOR+rolling-hash (Phase 1 will fix)
- Auth still client-only (Phase 1 will fix)
- `fleet_state.json` is out of sync with `mockData` (P0-07 tracking)

---

## Pre-release History

Before 0.1.0, this project existed as an experimental prototype with no formal
changelog. Significant pre-0.1.0 features include: the departure board, kiosk
radar, virtual transit cards, operator master cards, permit renewal workflow,
super admin control centre, and sponsored advert system.
