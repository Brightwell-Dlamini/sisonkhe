/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Binds the fleet store to IndexedDB persistence.
 *
 * Call `initFleetStore()` once, in a top-level client component (App.tsx).
 * It will:
 *   1. Migrate legacy localStorage → IndexedDB (one-time)
 *   2. Hydrate the store from IndexedDB (or fall back to seeds)
 *   3. Subscribe to store changes and write through to IndexedDB
 */

"use client";

import { useEffect } from "react";
import { useFleetStore } from "./useFleetStore";
import {
  hydrateFromIndexedDB,
  migrateFromLocalStorage,
  persistCollection,
  persistConfig,
} from "./persistence";

let didInit = false;

/**
 * Initialize the fleet store. Idempotent — safe to call multiple times.
 */
export async function initFleetStore(): Promise<void> {
  if (didInit) return;
  didInit = true;

  // 1. Migrate legacy data if needed
  await migrateFromLocalStorage();

  // 2. Hydrate from IndexedDB (or fall back to seeds already in store)
  const persisted = await hydrateFromIndexedDB();
  if (persisted) {
    useFleetStore.getState().hydrate(persisted);
  } else {
    // No persisted data — mark store as hydrated with seed data
    useFleetStore.getState().hydrate();
    // Immediately persist the seed data so the next boot hydrates from IDB
    const state = useFleetStore.getState();
    await Promise.all([
      persistCollection("routes", state.routes),
      persistCollection("drivers", state.drivers),
      persistCollection("vehicles", state.vehicles),
      persistCollection("trips", state.trips),
      persistCollection("notifications", state.notifications),
      persistCollection("incidents", state.incidents),
      persistCollection("payments", state.payments),
      persistCollection("regionConfigs", state.regionConfigs),
      persistCollection("trafficTickets", state.trafficTickets),
      persistCollection("marshals", state.marshals),
      persistCollection("marshalTransactions", state.marshalTransactions),
      persistCollection("adverts", state.adverts),
    ]);
  }

  // 3. Subscribe to store changes → write through to IndexedDB
  const collectionsToPersist = [
    "routes",
    "drivers",
    "vehicles",
    "trips",
    "notifications",
    "incidents",
    "payments",
    "regionConfigs",
    "trafficTickets",
    "marshals",
    "marshalTransactions",
    "adverts",
  ] as const;

  let pendingPersist = new Set<string>();
  let flushHandle: number | null = null;

  const flush = async () => {
    const keys = Array.from(pendingPersist) as Array<typeof collectionsToPersist[number]>;
    pendingPersist.clear();
    flushHandle = null;
    const state = useFleetStore.getState();
    await Promise.all(
      keys.map((key) => persistCollection(key, state[key]))
    );
  };

  const scheduleFlush = () => {
    if (flushHandle !== null) return;
    flushHandle = window.setTimeout(flush, 250);
  };

  // Persist collections
  for (const key of collectionsToPersist) {
    useFleetStore.subscribe(
      (state) => state[key],
      () => {
        pendingPersist.add(key);
        scheduleFlush();
      },
      { fireImmediately: false }
    );
  }

  // Persist config values
  const configKeys = [
    "activeRegion",
    "rankFee",
    "splitOperational",
    "splitNRTC",
    "splitMaintenance",
    "moveLoadingToBottom",
    "isDarkMode",
    "lastServerSeq",
  ] as const;

  let configFlushHandle: number | null = null;
  const configPending: Partial<Record<typeof configKeys[number], unknown>> = {};

  const flushConfig = async () => {
    configFlushHandle = null;
    const toWrite = { ...configPending };
    for (const k of Object.keys(configPending)) {
      delete (configPending as Record<string, unknown>)[k];
    }
    if (Object.keys(toWrite).length > 0) {
      await persistConfig(toWrite as Parameters<typeof persistConfig>[0]);
    }
  };

  for (const key of configKeys) {
    useFleetStore.subscribe(
      (state) => state[key],
      (value) => {
        configPending[key] = value;
        if (configFlushHandle === null) {
          configFlushHandle = window.setTimeout(flushConfig, 250);
        }
      },
      { fireImmediately: false }
    );
  }
}

/**
 * React hook — call from a client component at the top of your tree.
 */
export function useInitFleetStore(): boolean {
  const hydrated = useFleetStore((s) => s.hydrated);
  useEffect(() => {
    void initFleetStore();
  }, []);
  return hydrated;
}
