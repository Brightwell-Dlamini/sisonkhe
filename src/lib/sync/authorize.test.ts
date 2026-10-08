/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { authorizeSyncEvent } from "./authorize";
import type { ResolvedUser } from "@/lib/auth/roles";
import type { SyncEvent } from "./protocol";

function user(partial: Partial<ResolvedUser> & { role: ResolvedUser["role"] }): ResolvedUser {
  return {
    authUserId: "auth-1",
    email: "t@example.com",
    phone: null,
    fullName: "Test",
    roleDisplay: partial.role,
    ...partial,
  };
}

function evt(partial: Partial<SyncEvent> & Pick<SyncEvent, "entityType" | "operation">): SyncEvent {
  return {
    id: "evt-1",
    entityId: "id-1",
    payload: {},
    idempotencyKey: "idem-1",
    clientId: "client-1",
    occurredAt: new Date().toISOString(),
    ...partial,
  };
}

describe("authorizeSyncEvent", () => {
  it("rejects UPDATE without baseVersion", () => {
    const reason = authorizeSyncEvent(
      user({ role: "admin" }),
      evt({ entityType: "vehicle", operation: "UPDATE" })
    );
    expect(reason).toMatch(/baseVersion/);
  });

  it("blocks non-super-admin from staff mutations", () => {
    const reason = authorizeSyncEvent(
      user({ role: "admin" }),
      evt({ entityType: "staff", operation: "UPDATE", baseVersion: 1 })
    );
    expect(reason).toMatch(/super-admin/);
  });

  it("allows super-admin staff update with baseVersion", () => {
    const reason = authorizeSyncEvent(
      user({ role: "super-admin" }),
      evt({ entityType: "staff", operation: "UPDATE", baseVersion: 1 })
    );
    expect(reason).toBeNull();
  });

  it("blocks driver from mutating another driver row", () => {
    const reason = authorizeSyncEvent(
      user({ role: "driver", driverId: "drv-mine" }),
      evt({
        entityType: "driver",
        entityId: "drv-other",
        operation: "UPDATE",
        baseVersion: 1,
        payload: { status: "Available" },
      })
    );
    expect(reason).toMatch(/own driver/);
  });

  it("allows driver self status update", () => {
    const reason = authorizeSyncEvent(
      user({ role: "driver", driverId: "drv-mine" }),
      evt({
        entityType: "driver",
        entityId: "drv-mine",
        operation: "UPDATE",
        baseVersion: 2,
        payload: { status: "Available" },
      })
    );
    expect(reason).toBeNull();
  });

  it("blocks marshal from privileged vehicle fields", () => {
    const reason = authorizeSyncEvent(
      user({ role: "marshal", marshalId: "m1" }),
      evt({
        entityType: "vehicle",
        operation: "UPDATE",
        baseVersion: 1,
        payload: { permit_status: "Active" },
      })
    );
    expect(reason).toMatch(/queue\/dispatch/);
  });

  it("allows marshal queue field update", () => {
    const reason = authorizeSyncEvent(
      user({ role: "marshal", marshalId: "m1" }),
      evt({
        entityType: "vehicle",
        operation: "UPDATE",
        baseVersion: 1,
        payload: { current_queue_position: 3, status: "Loading" },
      })
    );
    expect(reason).toBeNull();
  });

  it("blocks inspector from sync push", () => {
    const reason = authorizeSyncEvent(
      user({ role: "inspector" }),
      evt({ entityType: "vehicle", operation: "UPDATE", baseVersion: 1 })
    );
    expect(reason).toMatch(/Inspector/);
  });
});
