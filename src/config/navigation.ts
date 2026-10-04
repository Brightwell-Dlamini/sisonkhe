/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Job-first navigation. Ordered by what each role does on a normal day,
 * not by entity type alphabetically.
 *
 * To add a page: add an item here. Sidebar, mobile drawer, and breadcrumbs
 * pick it up automatically via navForRole().
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Users,
  UserCircle,
  Car,
  Building2,
  BadgeCheck,
  Calendar,
  Scale,
  Route as RouteIcon,
  MapPin,
  Receipt,
  Award,
  Printer,
  Shield,
  FileText,
  Settings,
  Radio,
  CreditCard,
  ScanLine,
  FileWarning,
  Activity,
  AlertOctagon,
  Cpu,
  Database,
  HardDrive,
  Megaphone,
  Sparkles,
  Wallet,
  MessageSquare,
} from "lucide-react";

export type Role =
  | "admin"
  | "super-admin"
  | "fleet-manager"
  | "marshal"
  | "operator"
  | "driver"
  | "inspector"
  | "commuter";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Optional badge style — evaluated at render time. */
  badge?: "live" | "count";
  /** Exact match only (index pages like /admin). */
  exact?: boolean;
  /** Roles that can see this item. Undefined = all roles for this shell. */
  roles?: Role[];
  /**
   * Visual emphasis for high-frequency daily work.
   * Primary items sit at the top of their group and render slightly stronger.
   */
  emphasis?: "primary";
  /** Short hint shown as title attribute (collapsed sidebar / mobile). */
  hint?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Admin / fleet-manager — ordered by daily job, not entity type
// ---------------------------------------------------------------------------

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Today",
    items: [
      {
        href: "/admin",
        label: "Command Centre",
        icon: LayoutGrid,
        exact: true,
        emphasis: "primary",
        hint: "Ranked work queue and risk radar",
      },
    ],
  },
  {
    label: "Compliance",
    items: [
      {
        href: "/admin/permits",
        label: "Permit Renewals",
        icon: Award,
        emphasis: "primary",
        hint: "Approve or reject operator requests",
      },
      {
        href: "/admin/permits/print",
        label: "Print Queue",
        icon: Printer,
        emphasis: "primary",
        hint: "A4 permits with signed QR",
      },
      {
        href: "/admin/reports",
        label: "Reports",
        icon: FileText,
        hint: "CSV compliance exports",
      },
      {
        href: "/admin/audits",
        label: "Audit Trail",
        icon: Shield,
        hint: "Security and change log",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        href: "/admin/drivers",
        label: "Drivers",
        icon: UserCircle,
        hint: "Registry, PDP, assignment",
      },
      {
        href: "/admin/operators",
        label: "Operators",
        icon: Building2,
        hint: "Owners and Master Cards",
      },
      {
        href: "/admin/marshals",
        label: "Marshals",
        icon: BadgeCheck,
        hint: "Rank dispatch staff",
      },
      {
        href: "/admin/staff",
        label: "Staff",
        icon: Users,
        roles: ["super-admin"],
        hint: "Administrators and inspectors",
      },
    ],
  },
  {
    label: "Fleet",
    items: [
      {
        href: "/admin/vehicles",
        label: "Vehicles",
        icon: Car,
        hint: "Commercial vehicle registry",
      },
      {
        href: "/admin/routes",
        label: "Routes",
        icon: RouteIcon,
        hint: "Corridors and fares",
      },
      {
        href: "/admin/terminals",
        label: "Terminals",
        icon: MapPin,
        hint: "Regional terminal config",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/admin/ledger",
        label: "Ledger",
        icon: Receipt,
        hint: "Trips and settlement",
      },
      {
        href: "/admin/queue",
        label: "30-Day Queue",
        icon: Calendar,
        hint: "Rotation cycle viewer",
      },
      {
        href: "/admin/yoy",
        label: "YoY Metrics",
        icon: Scale,
        hint: "Year-over-year comparison",
      },
    ],
  },
];

/** Platform tools — only merged for super-admin as a single door. */
export const PLATFORM_NAV: NavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/admin/super",
        label: "Control Centre",
        icon: Sparkles,
        exact: true,
        hint: "Elevated system overview",
      },
      {
        href: "/admin/super/analytics",
        label: "Live Analytics",
        icon: Activity,
      },
      {
        href: "/admin/super/security",
        label: "Security",
        icon: Shield,
      },
      {
        href: "/admin/super/telemetry",
        label: "Telemetry",
        icon: Cpu,
      },
      {
        href: "/admin/super/errors",
        label: "Error Hub",
        icon: AlertOctagon,
      },
      {
        href: "/admin/super/storage",
        label: "Storage",
        icon: HardDrive,
      },
      {
        href: "/admin/super/config",
        label: "System Config",
        icon: Settings,
      },
      {
        href: "/admin/config",
        label: "Rank Config",
        icon: Settings,
        hint: "Rank fee and operational settings",
      },
      {
        href: "/admin/super/adverts",
        label: "Adverts",
        icon: Megaphone,
      },
      {
        href: "/admin/super/recovery",
        label: "Snapshots",
        icon: Database,
      },
      {
        href: "/admin/super/assistant",
        label: "Assistant",
        icon: Sparkles,
      },
    ],
  },
];

/** @deprecated Use PLATFORM_NAV — kept for any stray imports. */
export const SUPER_ADMIN_NAV = PLATFORM_NAV;

// ---------------------------------------------------------------------------
// Marshal — rank floor, keep lean
// ---------------------------------------------------------------------------

export const MARSHAL_NAV: NavGroup[] = [
  {
    label: "Rank",
    items: [
      {
        href: "/marshal",
        label: "Dispatch",
        icon: LayoutGrid,
        exact: true,
        emphasis: "primary",
        hint: "Live bay and departure board",
      },
      {
        href: "/marshal/comms",
        label: "Driver Comms",
        icon: MessageSquare,
        hint: "Messages from the rank",
      },
    ],
  },
  {
    label: "More",
    items: [
      {
        href: "/marshal/queue",
        label: "30-Day Queue",
        icon: Calendar,
      },
      {
        href: "/marshal/settings",
        label: "Settings",
        icon: Settings,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Driver — cab-first
// ---------------------------------------------------------------------------

export const DRIVER_NAV: NavGroup[] = [
  {
    label: "Cab",
    items: [
      {
        href: "/driver",
        label: "My Vehicle",
        icon: Car,
        exact: true,
        emphasis: "primary",
      },
      {
        href: "/driver/roster",
        label: "My Roster",
        icon: Calendar,
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        href: "/driver/card",
        label: "Virtual Card",
        icon: CreditCard,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Operator — renewals first (legal continuity)
// ---------------------------------------------------------------------------

export const OPERATOR_NAV: NavGroup[] = [
  {
    label: "Compliance",
    items: [
      {
        href: "/operator/renewals",
        label: "Permit Renewals",
        icon: Award,
        emphasis: "primary",
        hint: "Request and track permit renewals",
      },
    ],
  },
  {
    label: "Fleet",
    items: [
      {
        href: "/operator/fleet",
        label: "Fleet Cards",
        icon: Car,
        hint: "Vehicle virtual cards",
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        href: "/operator/wallet",
        label: "Master Wallet",
        icon: Wallet,
        hint: "Top up and disburse",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Inspector — field phone
// ---------------------------------------------------------------------------

export const INSPECTOR_NAV: NavGroup[] = [
  {
    label: "Field",
    items: [
      {
        href: "/inspector/scan",
        label: "Scan Vehicle",
        icon: ScanLine,
        emphasis: "primary",
      },
      {
        href: "/inspector/tickets",
        label: "My Tickets",
        icon: FileWarning,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export const PUBLIC_NAV: NavGroup[] = [
  {
    label: "Public",
    items: [
      {
        href: "/kiosk",
        label: "Live Departures",
        icon: Radio,
        exact: true,
        badge: "live",
      },
      {
        href: "/verify",
        label: "Verify Permit",
        icon: Shield,
      },
    ],
  },
];
