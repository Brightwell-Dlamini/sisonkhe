/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline cache for inspector vehicle compliance lookups.
 * Written on successful online lookup; served when offline or network fails.
 */

"use client";

import { getOfflineDb } from "./db";
import type { InspectorVehicleView } from "@/lib/inspector/queries";
import { plateKey } from "@/lib/domain/identity";

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function normalizeKey(query: string): string {
  return plateKey(query) || query.trim().toUpperCase();
}

export async function putInspectorCache(
  view: InspectorVehicleView
): Promise<void> {
  try {
    const db = getOfflineDb();
    const key = normalizeKey(view.registrationNumber);
    await db.inspectorCache.put({
      registrationNumber: key,
      view: view as unknown as Record<string, unknown>,
      cachedAt: new Date().toISOString(),
    });
    // Also index by VIC if present
    if (view.vic) {
      const vicKey = normalizeKey(view.vic);
      if (vicKey !== key) {
        await db.inspectorCache.put({
          registrationNumber: vicKey,
          view: view as unknown as Record<string, unknown>,
          cachedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("[inspectorCache] put failed", err);
  }
}

export async function getInspectorCache(
  query: string
): Promise<{ view: InspectorVehicleView; cachedAt: string } | null> {
  try {
    const db = getOfflineDb();
    const key = normalizeKey(query);
    const row = await db.inspectorCache.get(key);
    if (!row) return null;

    const age = Date.now() - new Date(row.cachedAt).getTime();
    if (age > MAX_AGE_MS) {
      await db.inspectorCache.delete(key);
      return null;
    }

    return {
      view: row.view as unknown as InspectorVehicleView,
      cachedAt: row.cachedAt,
    };
  } catch (err) {
    console.warn("[inspectorCache] get failed", err);
    return null;
  }
}

export function formatCacheAge(cachedAt: string): string {
  const ms = Date.now() - new Date(cachedAt).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}
