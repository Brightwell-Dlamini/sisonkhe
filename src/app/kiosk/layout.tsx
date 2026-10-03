"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Minimal top bar — kiosk keeps its own internal header below this */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40">
        <Link
          href="/staff"
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-lg border border-white/[0.08] hover:border-emerald-500/40 transition-all shadow-lg"
          title="Sign in as staff (admins, marshals, drivers, operators, inspectors)"
        >
          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-300 group-hover:text-white">
            Staff Sign In
          </span>
        </Link>
      </div>

      {children}
    </div>
  );
}
