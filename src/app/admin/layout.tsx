"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
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
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuth } from "@/hooks/useAuth";
import OfflineBanner from "@/components/offline/OfflineBanner";
import SyncStatusPill from "@/components/offline/SyncStatusPill";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    label: "People",
    items: [
      { href: "/admin/staff", label: "Staff", icon: Users },
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
    items: [{ href: "/admin/config", label: "Configuration", icon: Settings }],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth([
    "super-admin",
    "admin",
    "fleet-manager",
  ]);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!user) return null;

  const allowed = ["super-admin", "admin", "fleet-manager"];
  if (!allowed.includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
      <OfflineBanner />
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </Link>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Admin Centre
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatusPill />
            <Link
              href="/account"
              className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {user.fullName} →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-4 md:sticky md:top-20 md:self-start">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-3 mb-1.5">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
