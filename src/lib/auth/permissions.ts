/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role capability matrix.
 *
 * super-admin  — national, platform + break-glass
 * admin        — region-scoped rank operations (no platform)
 * fleet-manager — same operational surface as admin, region-aware
 * inspector    — roadside read + tickets (government enforcement)
 */

import type { AuthRole, ResolvedUser } from "./roles";

export type Permission =
  | "admin.shell"
  | "admin.command_centre"
  | "admin.permits.review"
  | "admin.permits.print"
  | "admin.reports"
  | "admin.audits.view"
  | "admin.drivers"
  | "admin.operators"
  | "admin.marshals"
  | "admin.vehicles"
  | "admin.routes"
  | "admin.terminals"
  | "admin.ledger.view"
  | "admin.queue.view"
  | "admin.yoy.view"
  | "admin.staff"
  | "admin.platform"
  | "admin.config"
  | "admin.national"
  | "inspector.lookup"
  | "inspector.ticket";

const SUPER: Permission[] = [
  "admin.shell",
  "admin.command_centre",
  "admin.permits.review",
  "admin.permits.print",
  "admin.reports",
  "admin.audits.view",
  "admin.drivers",
  "admin.operators",
  "admin.marshals",
  "admin.vehicles",
  "admin.routes",
  "admin.terminals",
  "admin.ledger.view",
  "admin.queue.view",
  "admin.yoy.view",
  "admin.staff",
  "admin.platform",
  "admin.config",
  "admin.national",
  "inspector.lookup",
  "inspector.ticket",
];

/** Rank admin / fleet-manager: daily ops only, region-scoped, no platform. */
const RANK_ADMIN: Permission[] = [
  "admin.shell",
  "admin.command_centre",
  "admin.permits.review",
  "admin.permits.print",
  "admin.reports",
  "admin.audits.view",
  "admin.drivers",
  "admin.operators",
  "admin.marshals",
  "admin.vehicles",
  "admin.routes",
  "admin.terminals",
  "admin.ledger.view",
  "admin.queue.view",
  "admin.yoy.view",
];

const INSPECTOR: Permission[] = ["inspector.lookup", "inspector.ticket"];

const ROLE_PERMISSIONS: Record<AuthRole, Permission[]> = {
  "super-admin": SUPER,
  admin: RANK_ADMIN,
  "fleet-manager": RANK_ADMIN,
  inspector: INSPECTOR,
  marshal: [],
  driver: [],
  operator: [],
};

export function can(role: AuthRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canUser(
  user: ResolvedUser | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  return can(user.role, permission);
}

/** Super-admin is national; admin/fleet-manager are region-scoped when region is set. */
export function isNationalScope(user: ResolvedUser): boolean {
  return user.role === "super-admin" || can(user.role, "admin.national");
}

/**
 * Region filter for list queries.
 * Returns null when the caller may see all regions (super-admin / national).
 * Returns the region string when the caller is limited to one region.
 * Throws FORBIDDEN when a regional admin has no region assigned.
 */
export function regionScopeOrThrow(user: ResolvedUser): string | null {
  if (isNationalScope(user)) return null;
  if (user.role === "admin" || user.role === "fleet-manager") {
    const region = user.region?.trim();
    if (!region) {
      throw new Error("REGION_REQUIRED");
    }
    return region;
  }
  return null;
}

export function assertPermission(
  user: ResolvedUser,
  permission: Permission
): void {
  if (!can(user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
}
