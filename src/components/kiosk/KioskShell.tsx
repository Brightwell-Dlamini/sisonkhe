"use client";

import { useState, useRef } from "react";
import type { KioskSnapshot } from "@/lib/public/kiosk";
import type { KioskMode } from "@/app/kiosk/page";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import KioskHeader from "./KioskHeader";
import KioskModeTabs from "./KioskModeTabs";
import KioskModeTransit from "./KioskModeTransit";
import KioskModeRadar from "./KioskModeRadar";
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
  const rootRef = useRef<HTMLDivElement>(null);

  const voice = useVoiceAnnouncements();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div ref={rootRef} className="kiosk-root kiosk-grid-bg">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 py-4 pb-28">
        <KioskHeader
          snapshot={snapshot}
          onRegionChange={onRegionChange}
          onRefresh={onRefresh}
          onOpenFareCalculator={() => setShowFareCalc(true)}
          onOpenLostProperty={() => setShowLostProperty(true)}
          onToggleFullscreen={toggleFullscreen}
          voiceEnabled={voice.enabled}
          voiceSupported={voice.supported}
          onToggleVoice={() => voice.setEnabled(!voice.enabled)}
        />

        <KioskModeTabs
          mode={mode}
          onModeChange={onModeChange}
          routeCount={snapshot.routes.length}
          vehicleCount={snapshot.vehicles.length}
          region={snapshot.region}
        />

        <div className="mt-5">
          {mode === "transit" && (
            <KioskModeTransit
              snapshot={snapshot}
              onSpeak={voice.speak}
              voiceEnabled={voice.enabled}
            />
          )}
          {mode === "radar" && <KioskModeRadar snapshot={snapshot} />}
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
