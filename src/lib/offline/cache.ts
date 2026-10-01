/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Read-through caching: try network first, fall back to IndexedDB.
 * Writes the response to Dexie on success.
 */

"use client";

import { offlineDB, setCacheMeta, getCacheMeta } from "./db";
import { isOnline } from "./network";
import type { Vehicle } from "../../types";

const VEHICLES_CACHE_KEY = "vehicles:all";
const VEHICLES_TTL_MS = 60_000; // 1 minute

/**
 * Fetch all vehicles. Network-first with IndexedDB fallback.
 */
export async function fetchVehiclesCached(): Promise<{
  vehicles: Vehicle[];
  source: "network" | "cache";
  cachedAt: number;
}> {
  const cacheKey = VEHICLES_CACHE_KEY;

  if (isOnline()) {
    try {
      const res = await fetch("/api/vehicles", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const vehicles: Vehicle[] = data.vehicles ?? [];

        // Refresh Dexie + meta
        await offlineDB.vehicles.bulkPut(vehicles);
        await setCacheMeta(cacheKey, { count: vehicles.length }, VEHICLES_TTL_MS);

        return { vehicles, source: "network", cachedAt: Date.now() };
      }
    } catch (err) {
      console.warn("[cache] vehicles network fetch failed, falling back:", err);
    }
  }

  // Offline or network failed — use cache
  const vehicles = await offlineDB.vehicles.toArray();
  const meta = await getCacheMeta<{ count: number }>(cacheKey);
  return {
    vehicles,
    source: "cache",
    cachedAt: meta ? Date.now() - meta.ageMs : 0,
  };
}

/**
 * General helper for arbitrary cached fetches.
 * Usage:
 *   const { data, source } = await cachedJson("/api/xyz", "my-key", 60000);
 */
export async function cachedJson<T>(
  url: string,
  cacheKey: string,
  ttlMs: number = 60_000
): Promise<{ data: T | null; source: "network" | "cache" | "none"; cachedAt: number }> {
  if (isOnline()) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = (await res.json()) as T;
        await setCacheMeta(cacheKey, data, ttlMs);
        return { data, source: "network", cachedAt: Date.now() };
      }
    } catch (err) {
      console.warn(`[cache] fetch failed for ${url}:`, err);
    }
  }

  const cached = await getCacheMeta<T>(cacheKey);
  if (cached) {
    return {
      data: cached.value,
      source: "cache",
      cachedAt: Date.now() - cached.ageMs,
    };
  }

  return { data: null, source: "none", cachedAt: 0 };
}
