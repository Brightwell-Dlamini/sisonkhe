# PARITY.md — Legacy vs New System

**Purpose:** Track every feature from the legacy app and its status in the new system.

**Rule:** No feature marked ❌ may be dropped without explicit product-owner approval.

**Last updated:** Phase 7.0 (start of restoration)

---

## Legend

- ✅ — Feature exists in new system, verified working
- ⚠️ — Feature exists but incomplete / degraded
- ❌ — Feature missing, restoration required
- 🚫 — Explicitly dropped by product owner (with date + reason)

---

## 1. Departures Board (Kiosk)

| # | Feature | Legacy | New | Notes |
|---|---------|--------|-----|-------|
| 1.1 | Live departures list | ✅ | ✅ | In Transit mode |
| 1.2 | Status badges (color-coded) | ✅ | ✅ | |
| 1.3 | Queue positions | ✅ | ✅ | |
| 1.4 | Loading bay display | ✅ | ✅ | |
| 1.5 | **Loading time windows** | ✅ | ❌ | Restore in 7.1 |
| 1.6 | **Search across routes/vehicles** | ✅ | ❌ | Restore in 7.1 |
| 1.7 | **Card/List view toggle** | ✅ | ❌ | Restore in 7.1 |
| 1.8 | **Voice announcements (TTS)** | ✅ | ❌ | Restore in 7.1 |
| 1.9 | **Voice ON/OFF toggle** | ✅ | ❌ | Restore in 7.1 |
| 1.10 | **Auto-cycling displays (10 items/12s)** | ✅ | ⚠️ | Only in TV mode; extend to Transit in 7.1 |
| 1.11 | Quick stats (Active, Boarding, Next, Delayed) | ✅ | ✅ | In header |
| 1.12 | Region switching | ✅ | ✅ | |

---

## 2. Rank Admin / Marshal Dashboard

| # | Feature | Legacy | New | Notes |
|---|---------|--------|-----|-------|
| 2.1 | Queue list with reorder | ✅ | ✅ | |
| 2.2 | **Add vehicle to queue** | ✅ | ❌ | Restore in 7.2 |
| 2.3 | Load → Full Cabin → Depart flow | ✅ | ✅ | |
| 2.4 | **Vehicle details modal** | ✅ | ❌ | Restore in 7.2 |
| 2.5 | Marshal profile switcher | ✅ | ⚠️ | Auto-derived; multi-marshal test in 7.2 |
| 2.6 | **Daily 30-day roster viewer** | ✅ | ❌ | Restore in 7.2 |
| 2.7 | **Manual rotation advance** | ✅ | ❌ | Restore in 7.2 |
| 2.8 | **YoY comparison** | ✅ | ❌ | Restore in 7.2 |
| 2.9 | **Driver comms (chat)** | ✅ | ❌ | Restore in 7.2 |
| 2.10 | **Move-loading-to-bottom setting** | ✅ | ❌ | Restore in 7.2 |
| 2.11 | **Rank fee config (from marshal view)** | ✅ | ❌ | Restore in 7.2 |
| 2.12 | Delay reason capture | ⚠️ | ✅ | Improved in new system |
| 2.13 | Breakdown reason capture | ⚠️ | ✅ | Improved in new system |

---

## 3. Fleet Manager (Fleet Registry & Operations)

| # | Feature | Legacy | New | Notes |
|---|---------|--------|-----|-------|
| 3.1 | Fleet registry table | ✅ | ✅ | `/admin/vehicles` |
| 3.2 | **30-Day Rotation Queue tab** | ✅ | ❌ | Restore in 7.5 |
| 3.3 | Driver Cab & Chat | ✅ | ⚠️ | Driver list exists, chat missing |
| 3.4 | **Corridors & Regions tab** | ✅ | ❌ | Restore in 7.5 |
| 3.5 | Rank Marshals & Ledger | ✅ | ✅ | `/admin/ledger` |
| 3.6 | **Regional Terminals config** | ✅ | ❌ | Restore in 7.5 |
| 3.7 | Permits & Compliance | ✅ | ✅ | `/admin/permits` |
| 3.8 | Renewals | ✅ | ✅ | `/admin/permits` |
| 3.9 | **Security Audit Trail tab** | ✅ | ❌ | Restore in 7.5 |
| 3.10 | **Compliance Reports tab** | ✅ | ❌ | Restore in 7.5 |
| 3.11 | Vehicle Registration modal | ✅ | ✅ | |
| 3.12 | Driver Registration modal | ✅ | ✅ | |
| 3.13 | **Marshal Registration modal** | ✅ | ❌ | Restore in 7.5 |
| 3.14 | **Marshal Virtual Card modal** | ✅ | ❌ | Restore in 7.5 |
| 3.15 | **Vehicle Virtual Card modal** | ✅ | ❌ | Restore in 7.5 |
| 3.16 | **Rank Fee config (dedicated)** | ✅ | ⚠️ | Exists in staff config, needs dedicated UI |
| 3.17 | **YoY Queue Comparison view** | ✅ | ❌ | Restore in 7.5 |
| 3.18 | Rank Marshal switcher | ✅ | ✅ | |

---

## 4. Driver Dashboard

| # | Feature | Legacy | New | Notes |
|---|---------|--------|-----|-------|
| 4.1 | Driver profile display | ✅ | ✅ | |
| 4.2 | Vehicle assignment display | ✅ | ✅ | |
| 4.3 | Queue position display | ✅ | ✅ | |
| 4.4 | **8:30 PM rule indicator** | ✅ | ❌ | Restore in 7.3 |
| 4.5 | **30-day rotation viewer** | ✅ | ❌ | Restore in 7.3 |
| 4.6 | **Cab status update buttons** | ✅ | ❌ | Restore in 7.3 (with marshal notify) |
| 4.7 | **Virtual Card (view/topup/pay)** | ✅ | ❌ | Restore in 7.3 |
| 4.8 | **Card statement modal** | ✅ | ❌ | Restore in 7.3 |
| 4.9 | **Profile photo upload** | ✅ | ❌ | Restore in 7.3 |
| 4.10 | Trip history + summary | ❌ | ✅ | New addition |
| 4.11 | Message marshal | ❌ | ✅ | New addition |

---

## 5. Operator Dashboard

| # | Feature | Legacy | New | Notes |
|---|---------|--------|-----|-------|
| 5.1 | Operator identity | ✅ | ✅ | |
| 5.2 | **Master Card view on own dashboard** | ✅ | ❌ | Restore in 7.4 |
| 5.3 | **Quick reload buttons** | ✅ | ❌ | Restore in 7.4 |
| 5.4 | **Freeze/unfreeze card** | ✅ | ❌ | Restore in 7.4 |
| 5.5 | **Send money to vehicle** | ✅ | ❌ | Restore in 7.4 |
| 5.6 | Top up master card | ✅ | ✅ | `/operator/wallet` |
| 5.7 | Permit renewal request | ✅ | ✅ | `/operator/renewals` |
| 5.8 | **Vehicle Virtual Cards view** | ✅ | ❌ | Restore in 7.4 |
| 5.9 | **Fleet vehicle list w/ cards** | ✅ | ❌ | Restore in 7.4 |
| 5.10 | **Full transaction history** | ✅ | ⚠️ | Only payment intents, not card tx |
| 5.11 | **Card inspection modal** | ✅ | ❌ | Restore in 7.4 |

---

## 6. Super Admin Control Centre

| # | Feature | Legacy | New | Notes |
|---|---------|--------|-----|-------|
| 6.1 | Dashboard Matrix | ✅ | ✅ | `/admin` grid |
| 6.2 | User administration | ✅ | ✅ | `/admin/staff` |
| 6.3 | **Advertisements management** | ✅ | ❌ | Restore in 7.6 |
| 6.4 | **Live Analytics dashboard** | ✅ | ❌ | Restore in 7.6 |
| 6.5 | **Security Centre** | ✅ | ❌ | Restore in 7.6 |
| 6.6 | **Error Hub** | ✅ | ❌ | Restore in 7.6 |
| 6.7 | **Telemetry Metrics** | ✅ | ❌ | Restore in 7.6 |
| 6.8 | **Full Audit Log view** | ✅ | ⚠️ | Permit-only |
| 6.9 | **System Config** (themes/seals/watermarks) | ✅ | ❌ | Restore in 7.6 |
| 6.10 | **Disaster Recovery panel** | ✅ | ❌ | Restore in 7.6 |
| 6.11 | **Cloud Sync panel** | ✅ | ❌ | Restore in 7.6 |
| 6.12 | **Storage Usage panel** | ✅ | ❌ | Restore in 7.6 |
| 6.13 | **Backup management** | ✅ | ❌ | Restore in 7.6 |
| 6.14 | **AI Virtual Assistant** | ✅ | ❌ | Restore in 7.6 |
| 6.15 | **IP Whitelist/Blacklist** | ✅ | ❌ | Restore in 7.6 |

---

## Summary Counts

| Area | Total | ✅ | ⚠️ | ❌ |
|------|-------|-----|-----|-----|
| 1. Departures | 12 | 8 | 1 | 3+ |
| 2. Rank Admin | 13 | 6 | 1 | 6 |
| 3. Fleet Manager | 18 | 8 | 2 | 8 |
| 4. Driver | 11 | 6 | 0 | 5 |
| 5. Operator | 11 | 4 | 1 | 6 |
| 6. Super Admin | 15 | 3 | 1 | 11 |
| **TOTAL** | **80** | **35** | **6** | **39** |

**Phase 7 restoration target: move 39 items from ❌ to ✅**

---

## Restoration Order

1. **7.1** — Departures Board (3 items)
2. **7.2** — Marshal Dashboard (6 items)
3. **7.3** — Driver Dashboard (5 items)
4. **7.4** — Operator Dashboard (6 items)
5. **7.5** — Fleet Manager tabs (8 items)
6. **7.6** — Super Admin panels (11 items)

After 7.6: **100% parity achieved.** Then we extend.
