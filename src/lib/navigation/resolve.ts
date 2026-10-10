/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Map a resolved user to their navigation tree + home route.
 *
 * Roles arrive already validated by resolveUserRole(). This file does not
 * coerce — it maps. An unknown role reaching this file is a bug in the caller.
 */

import type { AuthRole, NavRole } from "@/lib/auth/roles";
import { can, type Permission } from "@/lib/auth/permissions";
import {
  ADMIN_NAV,
  PLATFORM_NAV,
  MARSHAL_NAV,
  DRIVER_NAV,
  OPERATOR_NAV,
  INSPECTOR_NAV,
  PUBLIC_NAV,
  type NavGroup,
  type NavItem,
} from "@/config/navigation";

/**
 * The home route for a role. What they land on after login.
 * `null` input = unauthenticated visitor → public kiosk.
 */
export function homeRouteForRole(role: NavRole | null): string {
  if (role === null) return "/kiosk";

  switch (role) {
    case "super-admin":
    case "admin":
    case "fleet-manager":
      return "/admin";
    case "marshal":
      return "/marshal";
    case "operator":
      return "/operator/renewals";
    case "driver":
      return "/driver";
    case "inspector":
      return "/inspector/scan";
    case "commuter":
      return "/kiosk";
  }
}

function itemAllowed(item: NavItem, role: NavRole): boolean {
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.permission) {
    // Permission matrix is defined for AuthRole; commuter has no permissions
    if (role === "commuter") return false;
    if (!can(role as AuthRole, item.permission)) return false;
  }
  return true;
}

/**
 * Filter nav groups by role list + optional permission on each item.
 */
export function filterNavByPermissions(
  groups: NavGroup[],
  role: NavRole
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => itemAllowed(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Nav tree for a role. Role-gated and permission-gated items are filtered out.
 * Super-admin gets ADMIN_NAV + PLATFORM_NAV.
 */
export function navForRole(role: NavRole): NavGroup[] {
  let groups: NavGroup[];

  switch (role) {
    case "super-admin":
      groups = [...ADMIN_NAV, ...PLATFORM_NAV];
      break;
    case "admin":
    case "fleet-manager":
      groups = ADMIN_NAV;
      break;
    case "marshal":
      groups = MARSHAL_NAV;
      break;
    case "operator":
      groups = OPERATOR_NAV;
      break;
    case "driver":
      groups = DRIVER_NAV;
      break;
    case "inspector":
      groups = INSPECTOR_NAV;
      break;
    case "commuter":
      groups = PUBLIC_NAV;
      break;
  }

  return filterNavByPermissions(groups, role);
}

/**
 * Which shell should wrap this route?
 */
export function shellForPath(pathname: string): "app" | "public" | "bare" {
  if (
    pathname.startsWith("/print/") ||
    pathname.startsWith("/api/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  ) {
    return "bare";
  }
  if (
    pathname.startsWith("/kiosk") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/claim")
  ) {
    return "public";
  }
  return "app";
}

/**
 * Find the nav item that best matches the current path (for breadcrumbs).
 */
export function findActiveItem(
  pathname: string,
  groups: NavGroup[]
): NavItem | null {
  let best: NavItem | null = null;
  let bestScore = -1;

  for (const group of groups) {
    for (const item of group.items) {
      if (item.exact) {
        if (pathname === item.href && item.href.length > bestScore) {
          best = item;
          bestScore = item.href.length;
        }
      } else if (pathname.startsWith(item.href)) {
        if (item.href.length > bestScore) {
          best = item;
          bestScore = item.href.length;
        }
      }
    }
  }

  return best;
}

export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbsFor(pathname: string, groups: NavGroup[]): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];

  for (const group of groups) {
    for (const item of group.items) {
      if (item.exact ? pathname === item.href : pathname.startsWith(item.href)) {
        crumbs.push({ label: group.label });
        crumbs.push({ label: item.label, href: item.href });
        break;
      }
    }
  }

  return crumbs;
}

/**
 * Runtime guard: narrow an untyped role string (e.g. from a JWT or URL)
 * to NavRole. Returns null when the input is not a known role.
 */
export function toNavRole(roleString: string): NavRole | null {
  switch (roleString) {
    case "super-admin":
    case "admin":
    case "fleet-manager":
    case "marshal":
    case "operator":
    case "driver":
    case "inspector":
    case "commuter":
      return roleString;
    default:
      return null;
  }
}

/** @deprecated — kept for one release to avoid a hard break. */
export function toRole(roleString: string): NavRole {
  return toNavRole(roleString) ?? "commuter";
}

export type { Permission };
