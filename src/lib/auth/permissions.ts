/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role capability matrix.
 *
 * super-admin   — national, platform + break-glass
 * admin         — region-scoped rank operations (no platform)
 * fleet-manager — same operational surface as admin, region-aware
 * inspector     — roadside read + tickets (government enforcement)
 *
 * =============================================================================
 * DB policy contract — Phase 4
 * =============================================================================
 * Every permission below has a matching RLS policy in
 * supabase/migrations/20261018_authority_lattice.sql. The naming convention
 * is <table>_scoped_<read|write> for anything that used to be loose.
 *
 * If you add a permission here, add the corresponding policy name to the
 * comment. If the policy name is ever renamed in a migration, update it
 * here in the same PR.
 * =============================================================================
 */

import type { AuthRole, ResolvedUser } from "./roles";
import { AppError } from "@/lib/api/errors";

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
  | "admin.ops.view"
  | "admin.payments.manage"
  | "admin.staff"
  | "admin.platform"
  | "admin.config"
  | "admin.national"
  | "inspector.lookup"
  | "inspector.ticket";

/**
 * Permission → DB policy pairs.
 *
 * Key:   the Permission used by the app.
 * Value: the RLS policy name(s) that enforce the same rule at the DB.
 */
export const PERMISSION_POLICIES: Partial<Record<Permission, string[]>> = {
  "admin.drivers": ["drivers_scoped_write"],
  "admin.operators": ["omcards_scoped_write", "operators_scoped_update"],
  "admin.marshals": ["marshals_scoped_write"],
  "admin.vehicles": ["vehicles_scoped_write"],
  "admin.routes": ["routes_scoped_write"],
  "admin.terminals": ["regions_super_admin_write"],
  "admin.permits.review": ["renewals_scoped_write"],
  "admin.permits.print": ["renewals_scoped_write"],
  "admin.reports": ["trips_scoped_read"],
  "admin.audits.view": ["audit_scoped_read"],
  "admin.staff": ["staff_super_admin_write"],
  "admin.platform": ["adverts_super_admin_write"],
  "admin.config": ["system_config_super_admin_write"],
  "admin.ledger.view": ["trips_scoped_read", "payments_scoped_read"],
  "admin.ops.view": ["trips_scoped_read", "payments_scoped_read", "audit_scoped_read"],
  "admin.payments.manage": ["payments_scoped_read"],
  "inspector.ticket": ["tickets_inspector_write"],
  "inspector.lookup": ["vehicles_scoped_read", "drivers_scoped_read"],
};

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
  "admin.ops.view",
  "admin.payments.manage",
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
  "admin.ops.view",
  "admin.payments.manage",
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
 * Throws AppError(REGION_REQUIRED) when a regional admin has no region assigned.
 */
export function regionScopeOrThrow(user: ResolvedUser): string | null {
  if (isNationalScope(user)) return null;
  if (user.role === "admin" || user.role === "fleet-manager") {
    const region = user.region?.trim();
    if (!region) {
      throw AppError.regionRequired();
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
    throw AppError.forbidden();
  }
}

/** List permissions granted to a role (for UI nav gating). */
export function permissionsForRole(role: AuthRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
