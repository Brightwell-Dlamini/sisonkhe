/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public kiosk. Standalone route, no auth required.
 */

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useKioskData } from "@/hooks/useKioskData";
import KioskShell from "@/components/kiosk/KioskShell";

export type KioskMode = "transit" | "radar" | "tv";

function KioskInner() {
  const searchParams = useSearchParams();
  const initialRegion = searchParams.get("region") ?? "Hhohho";
  const [mode, setMode] = useState<KioskMode>("transit");

  const { snapshot, loading, error, refresh, setRegion } = useKioskData(initialRegion);

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            Loading terminal data…
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505] px-4">
        <div className="max-w-md text-center">
          <div className="text-sm font-bold text-red-600 mb-2">
            Terminal data unavailable
          </div>
          <div className="text-xs text-zinc-500">
            {error ?? "Please contact the terminal operator."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <KioskShell
      snapshot={snapshot}
      mode={mode}
      onModeChange={setMode}
      onRegionChange={setRegion}
      onRefresh={refresh}
    />
  );
}

export default function KioskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      }
    >
      <KioskInner />
    </Suspense>
  );
}
