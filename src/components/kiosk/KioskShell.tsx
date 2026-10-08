"use client";

import { useState, useRef } from "react";
import {
  Bus,
  CircleDollarSign,
  MapPinned,
  ShieldAlert,
  Ticket,
} from "lucide-react";
import type { KioskSnapshot } from "@/lib/public/kiosk";
import type { KioskMode } from "@/app/kiosk/page";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { RoleGuidance } from "@/components/common/RoleGuidance";
import Link from "next/link";
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

        <div className="mt-5 space-y-5">
          <RoleGuidance
            title="Transit quick actions"
            items={[
              {
                label: "Track routes",
                detail: "Switch to the live transit view to see current route availability and next departures.",
                icon: Bus,
              },
              {
                label: "Check fares",
                detail: "Open fare calculations for route pricing before the rider boards.",
                icon: CircleDollarSign,
              },
              {
                label: "Find a stop",
                detail: "Use the regional map view to confirm the nearest active bus stop and route coverage.",
                icon: MapPinned,
              },
              {
                label: "Verify a permit",
                detail: "Confirm the rider status and permit details before completing a transaction or boarding decision.",
                href: "/verify",
                icon: Ticket,
              },
              {
                label: "Report an issue",
                detail: "Escalate lost property or route concerns quickly from the terminal menu.",
                icon: ShieldAlert,
              },
            ]}
          />

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
<footer className="mt-12 pb-6 text-center">
  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-700">
    Sisonkhe In Transit · Kingdom of Eswatini
  </p>
  <div className="mt-2 flex items-center justify-center gap-3 text-[10px] font-mono text-zinc-800">
    <Link href="/staff" className="hover:text-zinc-500 transition-colors">
      Staff Access
    </Link>
    <span>·</span>
    <Link href="/verify" className="hover:text-zinc-500 transition-colors">
      Verify a Permit
    </Link>
  </div>
</footer>
    </div>
  );
}
