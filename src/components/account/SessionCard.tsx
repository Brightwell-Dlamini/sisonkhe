/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { LogOut, ShieldAlert, Monitor, Smartphone } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui";

export default function SessionCard() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      window.location.href = "/login";
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0F0F10] p-6 transition-colors hover:border-rose-500/30">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative mb-5 flex items-center gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white">
            Session
          </h2>
          <p className="text-[11px] text-zinc-500">
            Sign out of this device.
          </p>
        </div>
      </div>

      <div className="relative mb-5 space-y-2.5">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
          <Monitor className="h-4 w-4 shrink-0 text-zinc-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white">Current device</p>
            <p className="truncate text-[11px] text-zinc-500">
              This browser · Active now
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            Live
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] px-3.5 py-2.5 opacity-70">
          <Smartphone className="h-4 w-4 shrink-0 text-zinc-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-400">
              Other devices
            </p>
            <p className="truncate text-[11px] text-zinc-600">
              Manage from your provider dashboard
            </p>
          </div>
        </div>
      </div>

      <Button
        variant="danger"
        leadingIcon={LogOut}
        loading={loading}
        onClick={handleSignOut}
        fullWidth
      >
        Sign Out
      </Button>
    </div>
  );
}
