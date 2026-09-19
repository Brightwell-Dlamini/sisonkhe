/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IndexedDB persistence for the fleet store.
 *
 * Uses Dexie for ergonomics. Provides:
 *   - Hydration: read all data on app boot
 *   - Persistence: write-through on every store change
 *   - Migration: one-time import from legacy localStorage
 *
 * The store itself is unaware of Dexie. This module is the only place that
 * touches IndexedDB for the fleet domain.
 */

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
} from "../types";
import type { FleetState } from "./useFleetStore";

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

interface ConfigRow {
  key: string;
  value: unknown;
}

class SisonkheDB extends Dexie {
  routes!: Table<Route, string>;
  drivers!: Table<Driver, string>;
  vehicles!: Table<Vehicle, string>;
  trips!: Table<Trip, string>;
  notifications!: Table<RankNotification, string>;
  incidents!: Table<IncidentReport, string>;
  payments!: Table<RankFeePayment, string>;
  regionConfigs!: Table<RegionConfig, string>;
  trafficTickets!: Table<TrafficTicket, string>;
  marshals!: Table<MarshalAccount, string>;
  marshalTransactions!: Table<MarshalTransaction, string>;
  adverts!: Table<Advert, string>;
  config!: Table<ConfigRow, string>;

  constructor() {
    super("sisonkhe");
    this.version(1).stores({
      routes: "id, region",
      drivers: "id, assignedVehicleReg",
      vehicles: "registrationNumber, routeAssignmentId, status, currentQueuePosition",
      trips: "id, date, routeId, vehicleReg, driverId",
      notifications: "id, timestamp, type",
      incidents: "id, timestamp, status, vehicleReg",
      payments: "id, vehicleReg, timestamp",
      regionConfigs: "region",
      trafficTickets: "id, vehicleReg, timestamp",
      marshals: "id, region, terminalName",
      marshalTransactions: "id, marshalId, date, month",
      adverts: "id, isActive, createdAt",
      config: "key",
    });
  }
}

export const db = new SisonkheDB();

// ---------------------------------------------------------------------------
// Config keys
// ---------------------------------------------------------------------------

const CONFIG_KEYS = {
  activeRegion: "activeRegion",
  rankFee: "rankFee",
  splitOperational: "splitOperational",
  splitNRTC: "splitNRTC",
  splitMaintenance: "splitMaintenance",
  moveLoadingToBottom: "moveLoadingToBottom",
  isDarkMode: "isDarkMode",
  lastServerSeq: "lastServerSeq",
} as const;

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

/**
 * Read all fleet data from IndexedDB. Returns a partial FleetState.
 * If IndexedDB is empty, returns `null` (caller should use mockData).
 */
export async function hydrateFromIndexedDB(): Promise<Partial<FleetState> | null> {
  try {
    const [
      routes,
      drivers,
      vehicles,
      trips,
      notifications,
      incidents,
      payments,
      regionConfigs,
      trafficTickets,
      marshals,
      marshalTransactions,
      adverts,
    ] = await Promise.all([
      db.routes.toArray(),
      db.drivers.toArray(),
      db.vehicles.toArray(),
      db.trips.toArray(),
      db.notifications.toArray(),
      db.incidents.toArray(),
      db.payments.toArray(),
      db.regionConfigs.toArray(),
      db.trafficTickets.toArray(),
      db.marshals.toArray(),
      db.marshalTransactions.toArray(),
      db.adverts.toArray(),
    ]);

    // If nothing exists in IndexedDB, signal to caller to use seed data
    const isEmpty =
      routes.length === 0 &&
      vehicles.length === 0 &&
      drivers.length === 0;

    if (isEmpty) return null;

    const configRows = await db.config.toArray();
    const config: Record<string, unknown> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    return {
      routes,
      drivers,
      vehicles,
      trips,
      notifications,
      incidents,
      payments,
      regionConfigs,
      trafficTickets,
      marshals,
      marshalTransactions,
      adverts,
      activeRegion: (config[CONFIG_KEYS.activeRegion] as FleetState["activeRegion"]) ?? undefined,
      rankFee: (config[CONFIG_KEYS.rankFee] as number) ?? undefined,
      splitOperational: (config[CONFIG_KEYS.splitOperational] as number) ?? undefined,
      splitNRTC: (config[CONFIG_KEYS.splitNRTC] as number) ?? undefined,
      splitMaintenance: (config[CONFIG_KEYS.splitMaintenance] as number) ?? undefined,
      moveLoadingToBottom: (config[CONFIG_KEYS.moveLoadingToBottom] as boolean) ?? undefined,
      isDarkMode: (config[CONFIG_KEYS.isDarkMode] as boolean) ?? undefined,
      lastServerSeq: (config[CONFIG_KEYS.lastServerSeq] as number) ?? undefined,
    };
  } catch (err) {
    console.error("[persistence] hydrateFromIndexedDB failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Persistence (write-through)
// ---------------------------------------------------------------------------

/**
 * Persist a single collection to IndexedDB. Called from the store subscription.
 * Uses bulkPut for efficiency — no reads, no per-row transactions.
 */
export async function persistCollection<K extends keyof FleetState>(
  key: K,
  data: FleetState[K]
): Promise<void> {
  try {
    switch (key) {
      case "routes":
        await db.routes.bulkPut(data as Route[]);
        break;
      case "drivers":
        await db.drivers.bulkPut(data as Driver[]);
        break;
      case "vehicles":
        await db.vehicles.bulkPut(data as Vehicle[]);
        break;
      case "trips":
        await db.trips.bulkPut(data as Trip[]);
        break;
      case "notifications":
        await db.notifications.bulkPut(data as RankNotification[]);
        break;
      case "incidents":
        await db.incidents.bulkPut(data as IncidentReport[]);
        break;
      case "payments":
        await db.payments.bulkPut(data as RankFeePayment[]);
        break;
      case "regionConfigs":
        await db.regionConfigs.bulkPut(data as RegionConfig[]);
        break;
      case "trafficTickets":
        await db.trafficTickets.bulkPut(data as TrafficTicket[]);
        break;
      case "marshals":
        await db.marshals.bulkPut(data as MarshalAccount[]);
        break;
      case "marshalTransactions":
        await db.marshalTransactions.bulkPut(data as MarshalTransaction[]);
        break;
      case "adverts":
        await db.adverts.bulkPut(data as Advert[]);
        break;
      default:
        // Config-like values are handled separately in persistConfig
        break;
    }
  } catch (err) {
    console.error(`[persistence] persistCollection(${key}) failed:`, err);
  }
}

/**
 * Persist configuration values (scalars) to IndexedDB.
 */
export async function persistConfig(
  partial: Partial<{
    activeRegion: string;
    rankFee: number;
    splitOperational: number;
    splitNRTC: number;
    splitMaintenance: number;
    moveLoadingToBottom: boolean;
    isDarkMode: boolean;
    lastServerSeq: number;
  }>
): Promise<void> {
  try {
    const rows: ConfigRow[] = [];
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        rows.push({ key, value });
      }
    }
    if (rows.length > 0) {
      await db.config.bulkPut(rows);
    }
  } catch (err) {
    console.error("[persistence] persistConfig failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Legacy migration (localStorage → IndexedDB)
// ---------------------------------------------------------------------------

const LEGACY_PREFIX = "kombiflow_";
const MIGRATION_FLAG = "migrated_to_indexeddb_v1";

/**
 * One-time migration from localStorage to IndexedDB. Runs on first boot of the
 * new code. Safe to call multiple times — no-ops after the first success.
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Already migrated?
  if (localStorage.getItem(MIGRATION_FLAG) === "true") {
    return false;
  }

  try {
    // Check if there's anything to migrate
    const legacyRoutes = localStorage.getItem(`${LEGACY_PREFIX}routes`);
    if (!legacyRoutes) {
      // Nothing to migrate — mark complete and move on
      localStorage.setItem(MIGRATION_FLAG, "true");
      return false;
    }

    const read = <T,>(key: string): T | null => {
      try {
        const raw = localStorage.getItem(`${LEGACY_PREFIX}${key}`);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    };

    const routes = read<Route[]>("routes") ?? [];
    const drivers = read<Driver[]>("drivers") ?? [];
    const vehicles = read<Vehicle[]>("vehicles") ?? [];
    const trips = read<Trip[]>("trips") ?? [];
    const notifications = read<RankNotification[]>("notifications") ?? [];
    const incidents = read<IncidentReport[]>("incidents") ?? [];
    const payments = read<RankFeePayment[]>("payments") ?? [];
    const regionConfigs = read<RegionConfig[]>("regionConfigs") ?? [];
    const trafficTickets = read<TrafficTicket[]>("trafficTickets") ?? [];
    const marshals = read<MarshalAccount[]>("marshals") ?? [];
    const marshalTransactions = read<MarshalTransaction[]>("marshalTransactions") ?? [];
    const adverts = read<Advert[]>("adverts") ?? [];

    // Write to IndexedDB in one transaction per table
    await db.transaction(
      "rw",
      [
        db.routes,
        db.drivers,
        db.vehicles,
        db.trips,
        db.notifications,
        db.incidents,
        db.payments,
        db.regionConfigs,
        db.trafficTickets,
        db.marshals,
        db.marshalTransactions,
        db.adverts,
        db.config,
      ],
      async () => {
        if (routes.length) await db.routes.bulkPut(routes);
        if (drivers.length) await db.drivers.bulkPut(drivers);
        if (vehicles.length) await db.vehicles.bulkPut(vehicles);
        if (trips.length) await db.trips.bulkPut(trips);
        if (notifications.length) await db.notifications.bulkPut(notifications);
        if (incidents.length) await db.incidents.bulkPut(incidents);
        if (payments.length) await db.payments.bulkPut(payments);
        if (regionConfigs.length) await db.regionConfigs.bulkPut(regionConfigs);
        if (trafficTickets.length) await db.trafficTickets.bulkPut(trafficTickets);
        if (marshals.length) await db.marshals.bulkPut(marshals);
        if (marshalTransactions.length) await db.marshalTransactions.bulkPut(marshalTransactions);
        if (adverts.length) await db.adverts.bulkPut(adverts);

        // Config
        const configRows: ConfigRow[] = [
          { key: CONFIG_KEYS.activeRegion, value: read("activeRegion") },
          { key: CONFIG_KEYS.rankFee, value: read("rankFee") ?? 25 },
          { key: CONFIG_KEYS.splitOperational, value: read("splitOperational") ?? 20 },
          { key: CONFIG_KEYS.splitNRTC, value: read("splitNRTC") ?? 3.5 },
          { key: CONFIG_KEYS.splitMaintenance, value: read("splitMaintenance") ?? 1.5 },
          { key: CONFIG_KEYS.moveLoadingToBottom, value: read("moveLoadingToBottom") ?? true },
          { key: CONFIG_KEYS.isDarkMode, value: read("isDarkMode") ?? true },
        ].filter((r) => r.value !== null && r.value !== undefined);

        if (configRows.length) await db.config.bulkPut(configRows);
      }
    );

    // Don't delete legacy localStorage yet — keep as fallback for one release.
    // We'll delete in a future version once IndexedDB is proven stable.
    // Comment intentionally left: legacy keys WILL be removed in v0.3.0.
    localStorage.setItem(MIGRATION_FLAG, "true");
    console.info("[persistence] Migrated localStorage → IndexedDB successfully");
    return true;
  } catch (err) {
    console.error("[persistence] migration failed:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Clear all IndexedDB data. Used by factory reset only. */
export async function clearAllIndexedDB(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.routes, db.drivers, db.vehicles, db.trips, db.notifications,
      db.incidents, db.payments, db.regionConfigs, db.trafficTickets,
      db.marshals, db.marshalTransactions, db.adverts, db.config,
    ],
    async () => {
      await Promise.all([
        db.routes.clear(),
        db.drivers.clear(),
        db.vehicles.clear(),
        db.trips.clear(),
        db.notifications.clear(),
        db.incidents.clear(),
        db.payments.clear(),
        db.regionConfigs.clear(),
        db.trafficTickets.clear(),
        db.marshals.clear(),
        db.marshalTransactions.clear(),
        db.adverts.clear(),
        db.config.clear(),
      ]);
    }
  );
}
