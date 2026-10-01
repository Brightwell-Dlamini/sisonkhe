/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dexie/IndexedDB schema for offline caching and outbox queue.
 */

"use client";

import Dexie, { type Table } from "dexie";
import type {
  Vehicle,
  Driver,
  Route,
  Trip,
  RankNotification,
  IncidentReport,
  RankFeePayment,
  RegionConfig,
  TrafficTicket,
  MarshalAccount,
  MarshalTransaction,
  Advert,
} from "../../types";

// ---------------------------------------------------------------------------
// Outbox entry
// ---------------------------------------------------------------------------

export interface OutboxEntry {
  id: string; // UUID
  action: string; // "dispatch" | "rank_fee" | "incident" | ...
  entityType: string; // "vehicle" | "rank_fee" | ...
  entityId: string; // registration, id, etc.
  payload: Record<string, unknown>;
  idempotencyKey: string; // server dedupes on this
  clientId: string; // device id
  createdAt: number; // ms epoch
  attempts: number;
  lastError: string | null;
  status: "pending" | "in_flight" | "failed_permanent";
}

// ---------------------------------------------------------------------------
// Cache meta
// ---------------------------------------------------------------------------

export interface CacheMeta {
  key: string; // e.g. "vehicles", "queue_HSD 101 BM"
  value: unknown;
  cachedAt: number; // ms epoch
  ttlMs: number;
}

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

export interface DeviceInfo {
  key: "self";
  clientId: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

class SisonkheOfflineDB extends Dexie {
  vehicles!: Table<Vehicle, string>;
  drivers!: Table<Driver, string>;
  routes!: Table<Route, string>;
  trips!: Table<Trip, string>;
  notifications!: Table<RankNotification, string>;
  incidents!: Table<IncidentReport, string>;
  payments!: Table<RankFeePayment, string>;
  regionConfigs!: Table<RegionConfig, string>;
  trafficTickets!: Table<TrafficTicket, string>;
  marshals!: Table<MarshalAccount, string>;
  marshalTransactions!: Table<MarshalTransaction, string>;
  adverts!: Table<Advert, string>;

  outbox!: Table<OutboxEntry, string>;
  cacheMeta!: Table<CacheMeta, string>;
  deviceInfo!: Table<DeviceInfo, string>;

  constructor() {
    super("sisonkhe-offline");
    this.version(1).stores({
      vehicles: "registrationNumber, routeAssignmentId, status, currentQueuePosition",
      drivers: "id, assignedVehicleReg",
      routes: "id, region",
      trips: "id, date, routeId, vehicleReg, driverId",
      notifications: "id, timestamp",
      incidents: "id, status, vehicleReg",
      payments: "id, vehicleReg, timestamp",
      regionConfigs: "region",
      trafficTickets: "id, vehicleReg, timestamp",
      marshals: "id, region, terminalName",
      marshalTransactions: "id, marshalId, date, month",
      adverts: "id, isActive",

      outbox: "id, status, createdAt, idempotencyKey",
      cacheMeta: "key",
      deviceInfo: "key",
    });
  }
}

export const offlineDB = new SisonkheOfflineDB();

// ---------------------------------------------------------------------------
// Device identity
// ---------------------------------------------------------------------------

const CLIENT_ID_KEY = "sisonkhe_client_id";

export async function getClientId(): Promise<string> {
  // Try Dexie first
  const existing = await offlineDB.deviceInfo.get("self");
  if (existing) return existing.clientId;

  // Try localStorage (survives DB wipes)
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
      await offlineDB.deviceInfo.put({
        key: "self",
        clientId: stored,
        createdAt: Date.now(),
      });
      return stored;
    }
  }

  // Generate a new one
  const newId =
    "dev-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10);

  await offlineDB.deviceInfo.put({
    key: "self",
    clientId: newId,
    createdAt: Date.now(),
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CLIENT_ID_KEY, newId);
  }

  return newId;
}

// ---------------------------------------------------------------------------
// Cache meta helpers
// ---------------------------------------------------------------------------

export async function setCacheMeta(
  key: string,
  value: unknown,
  ttlMs: number
): Promise<void> {
  await offlineDB.cacheMeta.put({
    key,
    value,
    cachedAt: Date.now(),
    ttlMs,
  });
}

export async function getCacheMeta<T>(key: string): Promise<{
  value: T;
  ageMs: number;
  isFresh: boolean;
} | null> {
  const entry = await offlineDB.cacheMeta.get(key);
  if (!entry) return null;
  const ageMs = Date.now() - entry.cachedAt;
  return {
    value: entry.value as T,
    ageMs,
    isFresh: ageMs < entry.ttlMs,
  };
}
