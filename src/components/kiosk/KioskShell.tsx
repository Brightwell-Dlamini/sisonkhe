/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import type { KioskSnapshot } from "@/lib/public/kiosk";
import type { KioskMode } from "@/app/kiosk/page";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import KioskHeader from "./KioskHeader";
import KioskModeTabs from "./KioskModeTabs";
import KioskModeTransit from "./KioskModeTransit";
import KioskModeRadar from "./KioskModeRadar";
import KioskModeQueue from "./KioskModeQueue";
import KioskModeTV from "./KioskModeTV";
import KioskAdvertBanner from "./KioskAdvertBanner";
import KioskFareCalculator from "./KioskFareCalculator";
import KioskLostProperty from "./KioskLostProperty";

interface Props {
  snapshot: KioskSnapshot;
  mode: KioskMode;
  onModeChange: (mode: KioskMode) => void;
  onRegionChange: (region: string) => void;
  onRefresh: () => void;
}

export default function KioskShell({
  snapshot,
  mode,
  onModeChange,
  onRegionChange,
  onRefresh,
}: Props) {
  const [showFareCalc, setShowFareCalc] = useState(false);
  const [showLostProperty, setShowLostProperty] = useState(false);

  const voice = useVoiceAnnouncements();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-24">
        <KioskHeader
          snapshot={snapshot}
          onRegionChange={onRegionChange}
          onRefresh={onRefresh}
          onOpenFareCalculator={() => setShowFareCalc(true)}
          onOpenLostProperty={() => setShowLostProperty(true)}
          voiceEnabled={voice.enabled}
          voiceSupported={voice.supported}
          onToggleVoice={() => voice.setEnabled(!voice.enabled)}
        />

        <KioskModeTabs
          mode={mode}
          onModeChange={onModeChange}
          routeCount={snapshot.routes.length}
          vehicleCount={snapshot.vehicles.length}
        />

        <div className="mt-5">
          {mode === "transit" && (
            <KioskModeTransit snapshot={snapshot} onSpeak={voice.speak} voiceEnabled={voice.enabled} />
          )}
          {mode === "radar" && <KioskModeRadar snapshot={snapshot} />}
          {mode === "queue" && <KioskModeQueue snapshot={snapshot} />}
          {mode === "tv" && <KioskModeTV snapshot={snapshot} />}
        </div>
      </div>

      <KioskAdvertBanner region={snapshot.region} />

      {showFareCalc && (
        <KioskFareCalculator
          routes={snapshot.routes}
          onClose={() => setShowFareCalc(false)}
        />
      )}

      {showLostProperty && (
        <KioskLostProperty
          routes={snapshot.routes}
          vehicles={snapshot.vehicles}
          onClose={() => setShowLostProperty(false)}
        />
      )}
    </div>
  );
}
