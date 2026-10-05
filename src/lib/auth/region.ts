/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helpers to apply region filters on Supabase queries for rank admins.
 */

import type { ResolvedUser } from "./roles";
import { regionScopeOrThrow } from "./permissions";

export type RegionFilter = string | null;

export function resolveRegionFilter(user: ResolvedUser): RegionFilter {
  return regionScopeOrThrow(user);
}

/** True if a row's region matches the caller's scope (national always matches). */
export function matchesRegion(
  scope: RegionFilter,
  rowRegion: string | null | undefined
): boolean {
  if (scope == null) return true;
  if (!rowRegion) return false;
  return rowRegion.trim().toLowerCase() === scope.trim().toLowerCase();
}

/** Normalize region codes for comparison (e.g. "Hhohho" vs "hhohho"). */
export function normalizeRegion(r: string | null | undefined): string {
  return (r ?? "").trim().toLowerCase();
}
