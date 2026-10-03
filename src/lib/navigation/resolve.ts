/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Map a resolved user to their navigation tree + home route.
 */

import type { ResolvedUser } from "@/lib/auth/roles";
import {
  ADMIN_NAV,
  SUPER_ADMIN_NAV,
  MARSHAL_NAV,
  DRIVER_NAV,
  OPERATOR_NAV,
  INSPECTOR_NAV,
  PUBLIC_NAV,
  type NavGroup,
  type Role,
  type NavItem,
} from "@/config/navigation";

/**
 * The home route for a role. What they land on after login.
 */
export function homeRouteForRole(role: Role): string {
  switch (role) {
    case "super-admin":
      return "/admin";
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
    default:
      return "/kiosk";
  }
}

/**
 * Nav tree for a role, with role-gated items filtered out.
 */
export function navForRole(role: Role): NavGroup[] {
  let groups: NavGroup[] = [];

  switch (role) {
    case "super-admin":
      // Super admin gets BOTH the admin nav AND the super admin nav.
      // The super admin nav is a superset experience.
      groups = [
        ...ADMIN_NAV,
        ...SUPER_ADMIN_NAV.map((g) => ({
          ...g,
          label: `Super · ${g.label}`,
        })),
      ];
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
    default:
      groups = PUBLIC_NAV;
  }

  // Filter items by role if a roles array is present
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || item.roles.includes(role)
      ),
    }))
    .filter((group) => group.items.length > 0);
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

/**
 * Breadcrumb trail for the current path. Built from the matched nav item
 * plus a manual override map for known deep pages.
 */
export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbsFor(
  pathname: string,
  groups: NavGroup[]
): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Home", href: "/" }];

  // Find the section this path belongs to by matching the top-level prefix
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
 * Convert ResolvedUser's role string to our Role type.
 */
export function toRole(roleString: string): Role {
  if (roleString === "super-admin") return "super-admin";
  if (roleString === "admin") return "admin";
  if (roleString === "fleet-manager") return "fleet-manager";
  if (roleString === "marshal") return "marshal";
  if (roleString === "operator") return "operator";
  if (roleString === "driver") return "driver";
  if (roleString === "inspector") return "inspector";
  return "commuter";
}
