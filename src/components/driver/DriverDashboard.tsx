"use client";

import { useMemo, useState } from "react";
import { Car, Calendar, CreditCard, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useDriverSummary } from "@/hooks/useDriverSummary";
import { useDriverSignal } from "@/hooks/useDriverSignal";
import { signalLabel } from "@/lib/domain/driverCoach";
import DriverHeader from "./DriverHeader";
import DriverVehicleCard from "./DriverVehicleCard";
import DriverSummaryCards from "./DriverSummaryCards";
import DriverTripsList from "./DriverTripsList";
import MessageMarshalModal from "./MessageMarshalModal";
import { RoleGuidance } from "@/components/common/RoleGuidance";
import { RoleWelcomeBanner } from "@/components/common/RoleWelcomeBanner";
import FirstRunWizard from "@/components/common/FirstRunWizard";
import { IconButton, TableSkeleton, useToast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarClock,
  CreditCardIcon,
  MessageSquareText,
  Route,
} from "lucide-react";

function isAfter830PMLocal(): boolean {
  const now = new Date();
  return (
    now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30)
  );
}

export default function DriverDashboard() {
  const { context, summary, trips, loading, error, refresh } =
    useDriverSummary();
  const [showMessage, setShowMessage] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const after830 = useMemo(() => isAfter830PMLocal(), []);

  const vehicleReg = context?.vehicle?.registrationNumber ?? null;
  const routeId = context?.vehicle?.routeId ?? null;
  const {
    emit: emitSignal,
    pending: pendingSignals,
    flush: flushSignals,
    online,
  } = useDriverSignal(vehicleReg, routeId);

  if (loading && !context) return <TableSkeleton rows={6} />;

  if (error && !context) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Could not load driver home</div>
          <div className="mt-0.5 text-rose-200/90">{error}</div>
        </div>
      </div>
    );
  }

  if (!context) return null;

  const handleRefresh = async () => {
    await flushSignals();
    await refresh();
  };

  return (
    <div className="space-y-5">
      <FirstRunWizard
        role="driver"
        userId={user?.authUserId}
        displayName={context.fullName}
      />

      <RoleWelcomeBanner
        roleLabel="Driver"
        headline={`Welcome, ${context.fullName.split(" ")[0] || "driver"}`}
        body="Update vehicle status, signal the marshal, and keep your roster clear."
      />

      <div className="flex items-center justify-between gap-3">
        <DriverHeader context={context} />
        <IconButton
          label="Refresh"
          onClick={() => void handleRefresh()}
          className="shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </IconButton>
      </div>

      {summary && <DriverSummaryCards summary={summary} />}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/driver/roster"
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 flex items-center gap-2.5 min-h-12 hover:border-emerald-500/40"
        >
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">Roster</span>
        </Link>
        <Link
          href="/driver/card"
          className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 flex items-center gap-2.5 min-h-12 hover:border-emerald-500/40"
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-200">Card</span>
        </Link>
      </div>

      <div className="space-y-4">
        <DriverVehicleCard
          vehicle={context.vehicle}
          marshal={context.marshal}
          onMessageMarshal={() => setShowMessage(true)}
          onEmitSignal={async (kind, note) => {
            const res = await emitSignal(kind, note);
            if (!res.ok) {
              toast.error(
                "Signal failed",
                res.error ?? "Could not send to marshal."
              );
              return res;
            }
            if (res.queued) {
              toast.warning(
                "Signal queued",
                "It will send when you are back online."
              );
              return res;
            }
            toast.success(
              "Signal sent",
              `${signalLabel(kind)} sent to marshal.`
            );
            await refresh();
            return res;
          }}
          online={online}
          pendingSignalCount={pendingSignals.length}
          isAfter830PM={after830}
        />

        <RoleGuidance
          title="Daily driver flow"
          items={[
            {
              label: "Update vehicle status",
              detail:
                "Keep the marshal synced with road availability, delays, and route readiness.",
              icon: Route,
            },
            {
              label: "Review roster",
              detail:
                "Check the next assigned dates and trip sequence before the day begins.",
              href: "/driver/roster",
              icon: CalendarClock,
            },
            {
              label: "Send marshal note",
              detail:
                "Report a delay, issue, or operating change quickly and clearly.",
              icon: MessageSquareText,
            },
            {
              label: "Use virtual card",
              detail:
                "Access trip and payment details from the driver card when needed.",
              href: "/driver/card",
              icon: CreditCardIcon,
            },
          ]}
        />

        <DriverTripsList trips={trips} />
      </div>

      {showMessage && context.marshal && (
        <MessageMarshalModal
          marshal={context.marshal}
          driverName={context.fullName}
          onClose={() => setShowMessage(false)}
          onSent={() => {
            setShowMessage(false);
            toast.success("Message sent to marshal");
          }}
        />
      )}
    </div>
  );
}
