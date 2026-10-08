/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authorization for event-log sync mutations.
 * applyEvents uses the service role; every event must be checked here first.
 */

import "server-only";
import type { ResolvedUser } from "@/lib/auth/roles";
import type { EntityType, SyncEvent, SyncOperation } from "./protocol";

const STAFF_ROLES = new Set(["super-admin", "admin", "fleet-manager"]);

/** Entity types rank staff may mutate via sync. */
const STAFF_ENTITIES = new Set<EntityType>([
  "vehicle",
  "driver",
  "marshal",
  "route",
  "trip",
  "incident",
  "queue_event",
  "notification",
  "operator",
]);

const MARSHAL_ENTITIES = new Set<EntityType>([
  "vehicle",
  "trip",
  "incident",
  "queue_event",
  "notification",
]);

const DRIVER_ENTITIES = new Set<EntityType>(["driver", "notification"]);

const OPERATOR_ENTITIES = new Set<EntityType>([
  "vehicle",
  "operator",
  "notification",
]);

/** Fields drivers may update on their own row via sync. */
const DRIVER_SELF_UPDATE_KEYS = new Set([
  "status",
  "signal",
  "signal_status",
  "last_signal_at",
  "profile_picture_url",
  "avatar_url",
]);

/** Vehicle fields marshals may touch (queue / dispatch surface). */
const MARSHAL_VEHICLE_UPDATE_KEYS = new Set([
  "status",
  "current_queue_position",
  "loading_bay",
  "queue_position",
  "departed_at",
  "loaded_at",
  "last_dispatch_at",
]);

function isOwnDriver(user: ResolvedUser, entityId: string): boolean {
  return Boolean(user.driverId && user.driverId === entityId);
}

function isOwnOperator(user: ResolvedUser, entityId: string): boolean {
  return Boolean(user.operatorId && user.operatorId === entityId);
}

function payloadKeysAllowed(
  payload: Record<string, unknown>,
  allowed: Set<string>
): boolean {
  return Object.keys(payload).every((k) => allowed.has(k));
}

/**
 * Returns null if allowed, otherwise a stable rejection reason.
 */
export function authorizeSyncEvent(
  user: ResolvedUser,
  event: SyncEvent
): string | null {
  const { entityType, operation, entityId, payload } = event;

  if (operation === "UPDATE" && event.baseVersion == null) {
    return "UPDATE requires baseVersion for optimistic concurrency";
  }

  // Platform-only entities
  if (entityType === "staff" || entityType === "advert") {
    if (user.role !== "super-admin") {
      return `${entityType} mutations require super-admin`;
    }
    return null;
  }

  if (STAFF_ROLES.has(user.role)) {
    if (!STAFF_ENTITIES.has(entityType)) {
      return `Role ${user.role} cannot sync entityType ${entityType}`;
    }
    return null;
  }

  if (user.role === "marshal") {
    if (!MARSHAL_ENTITIES.has(entityType)) {
      return `Marshal cannot sync entityType ${entityType}`;
    }
    if (entityType === "vehicle" && operation === "UPDATE") {
      if (!payloadKeysAllowed(payload, MARSHAL_VEHICLE_UPDATE_KEYS)) {
        return "Marshal may only update vehicle queue/dispatch fields";
      }
    }
    if (operation === "DELETE" && entityType === "vehicle") {
      return "Marshal cannot delete vehicles";
    }
    if (operation === "INSERT" && entityType === "vehicle") {
      return "Marshal cannot insert vehicles via sync";
    }
    return null;
  }

  if (user.role === "driver") {
    if (!DRIVER_ENTITIES.has(entityType)) {
      return `Driver cannot sync entityType ${entityType}`;
    }
    if (entityType === "driver") {
      if (!isOwnDriver(user, entityId)) {
        return "Driver may only sync their own driver row";
      }
      if (operation === "DELETE" || operation === "INSERT") {
        return "Driver cannot insert or delete driver rows via sync";
      }
      if (
        operation === "UPDATE" &&
        !payloadKeysAllowed(payload, DRIVER_SELF_UPDATE_KEYS)
      ) {
        return "Driver may only update status/signal/profile fields";
      }
    }
    return null;
  }

  if (user.role === "operator") {
    if (!OPERATOR_ENTITIES.has(entityType)) {
      return `Operator cannot sync entityType ${entityType}`;
    }
    if (entityType === "operator") {
      if (!isOwnOperator(user, entityId)) {
        return "Operator may only sync their own operator row";
      }
      if (operation === "DELETE") {
        return "Operator cannot delete operator rows via sync";
      }
    }
    if (entityType === "vehicle" && operation === "DELETE") {
      return "Operator cannot delete vehicles via sync";
    }
    return null;
  }

  if (user.role === "inspector") {
    return "Inspector cannot use event-sync push";
  }

  return `Role ${user.role} is not permitted to push sync events`;
}

export function assertSyncOperation(
  op: string
): op is SyncOperation {
  return op === "INSERT" || op === "UPDATE" || op === "DELETE";
}
