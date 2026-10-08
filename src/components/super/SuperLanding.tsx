"use client";

import Link from "next/link";
import {
  Activity,
  Shield,
  AlertOctagon,
  Cpu,
  FileText,
  Settings,
  Database,
  HardDrive,
  Megaphone,
  Search,
  ChevronRight,
} from "lucide-react";

const LINKS = [
  { href: "/admin/super/analytics", label: "Live Analytics", desc: "Real-time operations data", icon: Activity },
  { href: "/admin/super/security", label: "Security Centre", desc: "Threats and IP lists", icon: Shield },
  { href: "/admin/super/errors", label: "Error Hub", desc: "System exception log", icon: AlertOctagon },
  { href: "/admin/super/telemetry", label: "Telemetry", desc: "Server and DB metrics", icon: Cpu },
  { href: "/admin/audits", label: "Audit Log", desc: "Full activity trail", icon: FileText },
  { href: "/admin/super/config", label: "System Config", desc: "Themes and timers", icon: Settings },
  { href: "/admin/super/recovery", label: "Disaster Recovery", desc: "Snapshots and restore", icon: Database },
  { href: "/admin/super/storage", label: "Storage Usage", desc: "Row counts per table", icon: HardDrive },
  { href: "/admin/super/adverts", label: "Advertisements", desc: "Kiosk sponsored content", icon: Megaphone },
  { href: "/admin/super/assistant", label: "Ops Query", desc: "Status and inventory lookup", icon: Search },
];

export default function SuperLanding() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">
          Super Admin Control Centre
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          National platform oversight, diagnostics, and disaster recovery.
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
