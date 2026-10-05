/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side IndexedDB schema via Dexie.
 * Primary local store for offline-first operation.
 */

"use client";

import Dexie, { type Table } from "dexie";
import type { SyncEvent } from "@/lib/sync/protocol";

export interface LocalVehicle {
  registrationNumber: string;
  vic?: string;
  make: string;
  model: string;
  seatingCapacity: number;
  classification: string;
  routeAssignmentId?: string;
  loadingBay?: string;
  status: string;
  currentQueuePosition: number;
  permitNumber?: string;
  permitStatus?: string;
  permitExpiryDate?: string;
  driverId?: string;
  version: number;
  updatedAt: string;
  [key: string]: unknown;
}

export interface LocalDriver {
  id: string;
  fullName: string;
  phone: string;
  nationalId?: string;
  licenseNumber?: string;
  status: string;
  assignedVehicleReg?: string;
  version: number;
  updatedAt: string;
  [key: string]: unknown;
}

export interface LocalQueueEvent {
  id: string;
  vehicleReg: string;
  action: string;
  occurredAt: string;
  marshalId?: string;
  payload?: Record<string, unknown>;
}

export interface WatermarkRow {
  table: string;
  seq: number;
}

export class SisonkheDB extends Dexie {
  vehicles!: Table<LocalVehicle, string>;
  drivers!: Table<LocalDriver, string>;
  queueEvents!: Table<LocalQueueEvent, string>;
  outbox!: Table<SyncEvent, string>;
  watermarks!: Table<WatermarkRow, string>;

  constructor() {
    super("sisonkhe");

    this.version(1).stores({
      vehicles: "registrationNumber, vic, status, updatedAt, routeAssignmentId",
      drivers: "id, assignedVehicleReg, status, updatedAt",
      queueEvents: "id, vehicleReg, occurredAt",
      outbox: "id, entityType, occurredAt, idempotencyKey",
      watermarks: "table",
    });
  }
}

let dbInstance: SisonkheDB | null = null;

export function getOfflineDb(): SisonkheDB {
  if (typeof window === "undefined") {
    throw new Error("getOfflineDb() is client-only");
  }
  if (!dbInstance) {
    dbInstance = new SisonkheDB();
  }
  return dbInstance;
}

/** Safe accessor that returns null on the server */
export function tryGetOfflineDb(): SisonkheDB | null {
  if (typeof window === "undefined") return null;
  return getOfflineDb();
}
