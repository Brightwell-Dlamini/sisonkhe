/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Event-log sync protocol.
 * Clients push discrete events. Server is the sole authority for ordering.
 */

export type SyncOperation = "INSERT" | "UPDATE" | "DELETE";

export type EntityType =
  | "vehicle"
  | "driver"
  | "marshal"
  | "route"
  | "trip"
  | "incident"
  | "queue_event"
  | "notification"
  | "advert"
  | "staff"
  | "operator";

export interface SyncEvent {
  /** Client-generated UUID v7 (or compatible sortable id) */
  id: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  /** Unique per logical write; retries reuse the same key */
  idempotencyKey: string;
  clientId: string;
  /** ISO 8601 — when the client observed the change */
  occurredAt: string;
  /** Optimistic concurrency base version (for UPDATE) */
  baseVersion?: number;
}

export interface SyncPushRequest {
  events: SyncEvent[];
  clientId: string;
}

export interface SyncPushResult {
  accepted: string[]; // event ids
  rejected: Array<{ id: string; reason: string }>;
  latestSeq: number;
}

export interface SyncPullResponse {
  events: Array<SyncEvent & { seq: number; appliedAt: string }>;
  latestSeq: number;
  hasMore: boolean;
}

export function createEventId(): string {
  // Prefer crypto.randomUUID when available; fallback is fine for offline generation
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createIdempotencyKey(): string {
  return createEventId();
}
