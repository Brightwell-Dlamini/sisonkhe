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
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui";

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
  const isSuperAdmin = user?.role === "super-admin";

  return (
    <div>
      <PageHeader
        title="Admin Centre"
        description={`Welcome back, ${user?.fullName ?? "Administrator"}. Manage registry, permits, and operations.`}
      />

      {isSuperAdmin && (
        <Link
          href="/admin/super"
          className="group block bg-gradient-to-r from-purple-600/90 to-purple-800/90 border border-purple-500/30 text-white rounded-2xl p-5 mb-6 hover:border-purple-400/50 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-widest opacity-80">
                  Elevated Access
                </div>
                <h2 className="text-base font-black uppercase mt-0.5">
                  Super Admin Control Centre
                </h2>
                <p className="text-xs opacity-80 mt-0.5">
                  Analytics, security, telemetry, disaster recovery, and system-wide configuration.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-[#0F0F10] border border-white/[0.06] hover:border-emerald-500/40 rounded-2xl p-4 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h2 className="text-xs font-black text-white uppercase tracking-tight mt-2.5">
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
