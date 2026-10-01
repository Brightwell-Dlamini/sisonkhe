/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin landing. Shows a quick overview dashboard.
 */

"use client";

import Link from "next/link";
import {
  Users,
  UserCircle,
  Car,
  Building2,
  Receipt,
  Award,
  Printer,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_LINKS = [
  {
    href: "/admin/staff",
    label: "Staff",
    description: "Manage admins, fleet managers, and inspectors",
    icon: Users,
  },
  {
    href: "/admin/drivers",
    label: "Drivers",
    description: "Register drivers, assign vehicles, manage PDPs",
    icon: UserCircle,
  },
  {
    href: "/admin/vehicles",
    label: "Vehicles",
    description: "Commercial vehicle registry and permit management",
    icon: Car,
  },
  {
    href: "/admin/operators",
    label: "Operators",
    description: "Vehicle owners and Master Card management",
    icon: Building2,
  },
  {
    href: "/admin/ledger",
    label: "Ledger & Settlement",
    description: "Trip history and rank fee reconciliation",
    icon: Receipt,
  },
  {
    href: "/admin/permits",
    label: "Permit Renewals",
    description: "Review operator renewal requests",
    icon: Award,
  },
  {
    href: "/admin/permits/print",
    label: "Print Queue",
    description: "Print official A4 permits with signed QR",
    icon: Printer,
  },
];

export default function AdminIndex() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Admin Centre
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Welcome back, {user?.fullName ?? "Administrator"}.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMIN_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-2xl p-5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-3">
                {link.label}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">{link.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
