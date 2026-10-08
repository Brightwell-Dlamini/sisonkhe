/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Link from "next/link";
import React from "react";
import { Monitor, ShieldCheck } from "lucide-react";
import BrandMark from "@/components/common/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-3">
            <BrandMark href="/kiosk" size="lg" showSubtitle />
          </div>
          <p className="text-xs text-zinc-400">
            National Taxi Rank Management • Kingdom of Eswatini
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <Link
            href="/kiosk"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-emerald-500/50 hover:text-emerald-400"
          >
            <Monitor className="h-3.5 w-3.5" />
            Kiosk
          </Link>
          <Link
            href="/verify"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-emerald-500/50 hover:text-emerald-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Verify
          </Link>
        </div>

        {children}
        <p className="text-center text-[10px] text-zinc-400 mt-8">
          © 2026 National Road Transportation Council
        </p>
      </div>
    </div>
  );
}
