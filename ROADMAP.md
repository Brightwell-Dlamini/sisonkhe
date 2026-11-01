# Sisonkhe Product & Engineering Roadmap

**Status:** Active programme  
**Owner:** Platform  
**Last updated:** 2026-11-01

This document records the senior-engineering extension plan for Sisonkhe In Transit. All work proceeds in focused, production-safe increments. Direct commits to `main` are authorised only when the change is complete, typed, and non-breaking.

---

## Guiding Principles

1. **Incremental & production-safe** — one coherent theme per series of commits.
2. **Domain-first** — extend the relational model and TypeScript domain layer before UI.
3. **Offline-first compatibility** — every new write path must participate in the event-log / outbox model.
4. **Permission lattice** — every new capability receives an explicit `Permission` and matching RLS policy.
5. **Eswatini operational reality** — features must serve marshals, drivers, operators and inspectors in the field.

---

## Phase 0 – Domain & Schema Foundation (In Progress)

- [x] Formal roadmap captured
- [ ] Associations entity + memberships (schema, domain types, permissions)
- [ ] Training / Certification records
- [ ] Vehicle maintenance log
- [ ] Passenger / commuter feedback
- [ ] Financial exception queue model
- [ ] Compliance risk & reminder model
- [ ] Extended offline event types for new entities

## Phase 1 – Proactive Compliance & Renewal Engine

- Automated expiry calendars (permit, COF, PDP, insurance, roadworthiness)
- Multi-channel reminders (in-app, WhatsApp, SMS)
- Risk scoring combining days-to-expiry + historical behaviour
- Operator bulk-renewal workflows
- Print-pending and approval lifecycle hardening

## Phase 2 – Financial Intelligence & Settlement

- Exception queue for unmatched / partial / reversed payments
- Automated allocation rules with reconciliation reports
- Operator and association settlement statements
- Cost-of-operation views for operators

## Phase 3 – Intelligent Queue & Capacity

- Historical load-factor signals by route / time / day
- Suggested bay assignments and next-vehicle recommendations
- Fairness-aware dispatch helpers
- What-if simulation mode for marshals and admins
- Public / kiosk estimated wait times

## Phase 4 – Incident, Safety & Enforcement Loop

- Structured escalation paths with SLA timers
- Evidence capture with chain-of-custody metadata
- Heat-map and trend views for inspectors
- Driver / operator challenge workflow with audit trail

## Phase 5 – National / Regional Command & Analytics

- Cross-region dashboards (utilisation, compliance, fees, incidents)
- Configurable KPIs and anomaly detection
- Regulatory / stakeholder export packs
- Permission-scoped natural-language digests (building on existing GenAI)

## Phase 6 – New Modules

### 6.1 Association & Membership
- First-class associations
- Membership status, dues, representation
- Association-level rules (preferred queues, fee adjustments, bulk actions)

### 6.2 Training & Certification Tracker
- PDP, defensive driving, rank-specific certifications
- Expiry and mandatory refresh reminders
- Evidence upload and verification

### 6.3 Asset & Maintenance (Light)
- Odometer, service history, known issues
- Flags approaching roadworthiness / COF windows
- Future workshop integration points

### 6.4 Passenger Feedback & Demand Sensing
- Simple rating and overcrowding channel
- Aggregated demand signals feeding queue intelligence
- Privacy-preserving design

### 6.5 Multi-Terminal & Cross-Border Readiness
- Explicit multi-terminal vehicle support
- Dual-permit tracking patterns
- Settlement and currency considerations for later SADC expansion

## Phase 7 – Engineering Hardening

- Expanded automated tests on critical paths (offline events, QR, payments, queue transitions)
- Structured domain-event logging with correlation IDs
- Metrics for sync lag, payment success, QR volume
- Further PWA / background-sync improvements for low-end devices
- Domain model and operational runbook documentation

---

## Current Focus

**Phase 0 – Associations foundation** is the active workstream.

Subsequent phases will be opened only after the preceding foundation is stable in production.
