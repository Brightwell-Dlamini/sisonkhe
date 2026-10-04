/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Map a resolved user to their navigation tree + home route.
 */

import type { ResolvedUser } from "@/lib/auth/roles";
import {
  ADMIN_NAV,
  PLATFORM_NAV,
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
 *
 * Super-admin gets the same job-first admin tree as everyone else,
 * plus a single Platform group at the bottom — not a second full catalogue.
 */
export function navForRole(role: Role): NavGroup[] {
  let groups: NavGroup[] = [];

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
    default:
      groups = PUBLIC_NAV;
  }

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

export interface Crumb {
  label: string;
  href?: string;
}

export function breadcrumbsFor(
  pathname: string,
  groups: NavGroup[]
): Crumb[] {
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
