# Schema Decisions

Quick reference for why the schema is the way it is.

## IDs are `text`

Every table uses `text` primary keys, not `uuid`.

**Why:** Offline-first clients need to generate IDs before the server sees them.
UUIDs are fine but require a client-side UUID library. Client-generated sortable
IDs (e.g. `marshal-1789639284605-0pzea`) match what the registration portal
already does and need no dependency.

## Every table has `version integer`

Optimistic concurrency. On update, the client sends the version it believes is
current. The server increments and returns the new version. If the version
doesn't match, the write is rejected and the client re-fetches.

**Why:** Prevents silent last-write-wins clobbering when two marshals/admins
edit the same row simultaneously. Cheaper and simpler than full CRDT.

## Every table has `created_at` and `updated_at` (timestamptz)

Server-managed. Never set by the client.

**Why:** We need to know when the server actually applied a change, separate
from when the client observed it. Client clocks drift.

## Sync uses an append-only event log (`sync_events`)

The server never accepts "here is the new state of the vehicles table." It
accepts "vehicle X changed status to Loading at timestamp T with idempotency
key K."

**Why:** Append-only event logs are:
- Idempotent (retry-safe)
- Conflict-free by construction (server decides order)
- Auditable (full history)
- Efficient (bandwidth scales with change, not dataset)

## `marshals` gets one new column: `version`

We do not touch the registration portal or its `sync_logs` table. We do not
rename anything. We do not change existing column types.

**Why:** The portal works. It has real data. It ships marshals. We respect that.

The only integration point is: when a marshal claims their account in Sisonkhe
In Transit, we write `auth_user_id` on their existing row.

## No base64 images in the database

`marshals.photo_data_url` and `marshals.signature_data_url` are legacy. We do
not populate them. We use `photo_storage_path` + Supabase Storage.

**Why:** Base64 in a row inflates every query, every backup, every replica.
Storage is what Supabase Storage is for.

## Commuters do not have accounts

Public kiosk. Read-only. No login.

**Why:** They consume information. They don't own resources. If they later want
saved routes or push notifications, we add lightweight guest accounts at that
time.

## Auth roles map 1:1 to tables

- `staff` table → super-admin, admin, fleet-manager, inspector
- `marshals` table → marshal (via `auth_user_id`)
- `drivers` table → driver (via `auth_user_id`)
- `fleet_operators` table → operator (via `auth_user_id`)

**Why:** Role lives with the domain entity. RLS policies join naturally. No
duplicate role storage.
