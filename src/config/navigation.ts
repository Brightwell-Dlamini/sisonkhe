/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single source of truth for navigation across every role.
 *
 * To add a page: add an item here. It appears in the sidebar, mobile
 * drawer, breadcrumbs, and command palette automatically.
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
  UserCheck,
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
  /** Optional badge — evaluated at render time. */
  badge?: "live" | "count";
  /** Exact match only (used for index pages like /admin). */
  exact?: boolean;
  /** Roles that can see this item. Undefined = all roles for the shell. */
  roles?: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Admin (staff) navigation
// ---------------------------------------------------------------------------

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
      { href: "/admin/analytics", label: "Live Analytics", icon: Activity, roles: ["super-admin"] },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/staff", label: "Staff", icon: Users, roles: ["super-admin"] },
      { href: "/admin/drivers", label: "Drivers", icon: UserCircle },
      { href: "/admin/operators", label: "Operators", icon: Building2 },
      { href: "/admin/marshals", label: "Marshals", icon: BadgeCheck },
    ],
  },
  {
    label: "Fleet & Routes",
    items: [
      { href: "/admin/vehicles", label: "Vehicles", icon: Car },
      { href: "/admin/routes", label: "Routes", icon: RouteIcon },
      { href: "/admin/terminals", label: "Terminals", icon: MapPin },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/queue", label: "30-Day Queue", icon: Calendar },
      { href: "/admin/yoy", label: "YoY Comparison", icon: Scale },
      { href: "/admin/ledger", label: "Ledger", icon: Receipt },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/admin/permits", label: "Permit Renewals", icon: Award },
      { href: "/admin/permits/print", label: "Print Queue", icon: Printer },
      { href: "/admin/audits", label: "Security Audits", icon: Shield },
      { href: "/admin/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/config", label: "Configuration", icon: Settings, roles: ["super-admin"] },
      { href: "/admin/super", label: "Super Admin", icon: Sparkles, roles: ["super-admin"] },
    ],
  },
];

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin/super", label: "Control Centre", icon: LayoutGrid, exact: true },
      { href: "/admin/super/analytics", label: "Live Analytics", icon: Activity },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/super/telemetry", label: "Telemetry", icon: Cpu },
      { href: "/admin/super/errors", label: "Error Hub", icon: AlertOctagon },
      { href: "/admin/super/storage", label: "Storage", icon: HardDrive },
    ],
  },
  {
    label: "Security",
    items: [
      { href: "/admin/super/security", label: "Security Centre", icon: Shield },
      { href: "/admin/super/config", label: "System Config", icon: Settings },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/super/adverts", label: "Advertisements", icon: Megaphone },
    ],
  },
  {
    label: "Recovery",
    items: [
      { href: "/admin/super/recovery", label: "Snapshots", icon: Database },
      { href: "/admin/super/assistant", label: "AI Assistant", icon: Sparkles },
    ],
  },
];

// ---------------------------------------------------------------------------
// Marshal navigation
// ---------------------------------------------------------------------------

export const MARSHAL_NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/marshal", label: "Dispatch", icon: LayoutGrid, exact: true },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/marshal/queue", label: "30-Day Queue", icon: Calendar },
      { href: "/marshal/comms", label: "Driver Comms", icon: FileWarning },
      { href: "/marshal/settings", label: "Settings", icon: Settings },
    ],
  },
];

// ---------------------------------------------------------------------------
// Driver navigation
// ---------------------------------------------------------------------------

export const DRIVER_NAV: NavGroup[] = [
  {
    label: "Cab",
    items: [
      { href: "/driver", label: "My Vehicle", icon: Car, exact: true },
      { href: "/driver/roster", label: "30-Day Roster", icon: Calendar },
    ],
  },
  {
    label: "Wallet",
    items: [
      { href: "/driver/card", label: "Virtual Card", icon: CreditCard },
    ],
  },
];

// ---------------------------------------------------------------------------
// Operator navigation
// ---------------------------------------------------------------------------

export const OPERATOR_NAV: NavGroup[] = [
  {
    label: "Fleet",
    items: [
      { href: "/operator/renewals", label: "Permit Renewals", icon: Award },
      { href: "/operator/fleet", label: "Fleet Cards", icon: Car },
    ],
  },
  {
    label: "Wallet",
    items: [
      { href: "/operator/wallet", label: "Master Wallet", icon: Wallet },
    ],
  },
];

// ---------------------------------------------------------------------------
// Inspector navigation
// ---------------------------------------------------------------------------

export const INSPECTOR_NAV: NavGroup[] = [
  {
    label: "Field",
    items: [
      { href: "/inspector/scan", label: "Scan Vehicle", icon: ScanLine },
      { href: "/inspector/tickets", label: "My Tickets", icon: FileWarning },
    ],
  },
];

// ---------------------------------------------------------------------------
// Public (kiosk, verify)
// ---------------------------------------------------------------------------

export const PUBLIC_NAV: NavGroup[] = [
  {
    label: "Public",
    items: [
      { href: "/kiosk", label: "Live Departures", icon: Radio, exact: true },
      { href: "/verify", label: "Verify Permit", icon: Shield },
    ],
  },
];
