/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sync protocol types. Shared between client outbox and server event log.
 */

/** A single mutation event. Client-generated, server-applied. */
export interface SyncEvent<T = unknown> {
  /** UUID v7 — sortable, unique */
  id: string;

  /** Which entity type this touches */
  entityType: SyncEntityType;

  /** Primary key of the entity */
  entityId: string;

  /** What kind of change */
  operation: "INSERT" | "UPDATE" | "DELETE";

  /** The change payload. For UPDATE, a partial. For DELETE, empty. */
  payload: T;

  /** Idempotency key — server dedupes on replay */
  idempotencyKey: string;

  /** Which client emitted this. Used for conflict resolution and debugging. */
  clientId: string;

  /** When the client observed the change (ISO 8601) */
  occurredAt: string;

  /** For optimistic concurrency: the version client believed was current */
  baseVersion?: number;
}

export type SyncEntityType =
  | "vehicle"
  | "driver"
  | "route"
  | "trip"
  | "incident"
  | "notification"
  | "payment"
  | "traffic_ticket"
  | "marshal"
  | "marshal_transaction"
  | "advert"
  | "region_config"
  | "system_config";

/** Response from /api/sync/push */
export interface SyncPushResponse {
  accepted: string[]; // idempotency keys
  rejected: Array<{
    idempotencyKey: string;
    reason: string;
    serverState?: unknown; // for the client to reconcile
  }>;
  newSeq: number; // server's latest sequence after this batch
}

/** Response from /api/sync/pull */
export interface SyncPullResponse {
  events: SyncEvent[];
  newSeq: number;
  hasMore: boolean;
}

/** SSE message shape from /api/sync/stream */
export interface SyncStreamMessage {
  type: "event" | "heartbeat" | "sync_required";
  seq?: number;
  event?: SyncEvent;
}
