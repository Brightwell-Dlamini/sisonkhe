"use client";

import Link from "next/link";
import {
  Activity,
  Shield,
  Settings,
  Database,
  Megaphone,
  ChevronRight,
} from "lucide-react";

const LINKS = [
  {
    href: "/admin/super/analytics",
    label: "Live Analytics",
    desc: "National ops snapshot",
    icon: Activity,
  },
  {
    href: "/admin/super/security",
    label: "Security Centre",
    desc: "Threats and IP lists",
    icon: Shield,
  },
  {
    href: "/super/invariants",
    label: "Invariants",
    desc: "Reconciliation and drift",
    icon: Activity,
  },
  {
    href: "/admin/config",
    label: "Rank Config",
    desc: "Fees and operational settings",
    icon: Settings,
  },
  {
    href: "/admin/super/adverts",
    label: "Adverts",
    desc: "Kiosk sponsored content",
    icon: Megaphone,
  },
  {
    href: "/admin/super/recovery",
    label: "Snapshots",
    desc: "App data backup and restore",
    icon: Database,
  },
];

export default function SuperLanding() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">
          Super Admin
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Domain controls only. Server, deploy, and DB metrics live in Vercel /
          Hostinger / Supabase.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="group bg-[#0F0F10] border border-white/[0.06] hover:border-zinc-500 rounded-2xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] text-zinc-300 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
              </div>
              <h2 className="text-xs font-black text-white uppercase mt-2.5">
                {l.label}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">{l.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
