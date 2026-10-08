/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side IndexedDB schema via Dexie.
 * Primary local store for offline-first operation.
 */

"use client";

import Dexie, { type Table } from "dexie";

export interface OutboxEntry {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "dispatch";
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  clientId: string;
  createdAt: string;
  status: "pending" | "in_flight" | "success" | "failed";
  lastError?: string;
  attempts: number;
  baseVersion?: number;
}

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

export interface WatermarkRow {
  table: string;
  seq: number;
}

export class SisonkheDB extends Dexie {
  outbox!: Table<OutboxEntry, string>;
  vehicles!: Table<LocalVehicle, string>;
  drivers!: Table<LocalDriver, string>;
  watermarks!: Table<WatermarkRow, string>;

  constructor() {
    super("sisonkhe");

    this.version(1).stores({
      outbox: "id, status, entityType, createdAt, idempotencyKey",
      vehicles: "registrationNumber, vic, status, updatedAt, routeAssignmentId",
      drivers: "id, assignedVehicleReg, status, updatedAt",
      watermarks: "table",
    });
  }
}

/** Singleton used by the existing offline engine */
export const offlineDB = new SisonkheDB();

export function getOfflineDb(): SisonkheDB {
  return offlineDB;
}
