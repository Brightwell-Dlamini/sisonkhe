/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { LogOut, ShieldAlert } from "lucide-react";
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
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Session</h2>
          <p className="text-[11px] text-zinc-500">Sign out of this device.</p>
        </div>
      </div>
      <Button variant="danger" leadingIcon={LogOut} loading={loading} onClick={handleSignOut} fullWidth>
        Sign Out
      </Button>
    </div>
  );
}
