/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { LogOut, Loader2, ShieldAlert } from "lucide-react";
import { signOut } from "@/lib/auth/client";

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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
            Session
          </h2>
          <p className="text-[11px] text-zinc-500">
            Sign out of this device.
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        If you're on a shared device, sign out to prevent others from accessing your account.
      </p>

      <button
        onClick={handleSignOut}
        disabled={loading}
        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        {loading ? "Signing out…" : "Sign Out"}
      </button>
    </div>
  );
}
