"use client";

import Link from "next/link";
import {
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
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const LINKS = [
  { href: "/admin/staff", label: "Staff", desc: "Administrators, fleet managers, inspectors", icon: Users },
  { href: "/admin/drivers", label: "Drivers", desc: "Register drivers, assign vehicles", icon: UserCircle },
  { href: "/admin/operators", label: "Operators", desc: "Vehicle owners and Master Cards", icon: Building2 },
  { href: "/admin/marshals", label: "Marshals", desc: "Rank marshals and dispatch passes", icon: BadgeCheck },
  { href: "/admin/vehicles", label: "Vehicles", desc: "Commercial vehicle registry", icon: Car },
  { href: "/admin/routes", label: "Routes", desc: "Corridor routes and fares", icon: RouteIcon },
  { href: "/admin/terminals", label: "Terminals", desc: "Regional terminal configuration", icon: MapPin },
  { href: "/admin/queue", label: "30-Day Queue", desc: "Full rotation cycle viewer", icon: Calendar },
  { href: "/admin/yoy", label: "YoY Comparison", desc: "Year-over-year metrics", icon: Scale },
  { href: "/admin/ledger", label: "Ledger", desc: "Trips and settlement", icon: Receipt },
  { href: "/admin/permits", label: "Permits", desc: "Renewal requests", icon: Award },
  { href: "/admin/permits/print", label: "Print Queue", desc: "A4 permits with signed QR", icon: Printer },
  { href: "/admin/audits", label: "Security Audits", desc: "Full audit trail", icon: Shield },
  { href: "/admin/reports", label: "Reports", desc: "CSV compliance exports", icon: FileText },
  { href: "/admin/config", label: "Configuration", desc: "Rank fee and system settings", icon: Settings },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-emerald-500" />
              </div>
              <h2 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight mt-2.5">
                {link.label}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">{link.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
