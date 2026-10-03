"use client";

import { ShieldCheck } from "lucide-react";
import type { Role } from "@/config/navigation";

const LABELS: Record<Role, string> = {
  "super-admin": "Super Admin",
  admin: "Rank Admin",
  "fleet-manager": "Fleet Manager",
  marshal: "Marshal",
  operator: "Operator",
  driver: "Driver",
  inspector: "Inspector",
  commuter: "Commuter",
};

const TONES: Record<Role, string> = {
  "super-admin": "bg-purple-500/15 text-purple-300 border-purple-500/30",
  admin: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  "fleet-manager": "bg-teal-500/15 text-teal-300 border-teal-500/30",
  marshal: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  operator: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  driver: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  inspector: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  commuter: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

export default function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[9px] font-black uppercase tracking-[0.12em] ${TONES[role]}`}
    >
      <ShieldCheck className="w-2.5 h-2.5" />
      {LABELS[role]}
    </span>
  );
}
