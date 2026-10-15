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
        userId={user?.id}
        displayName={context.fullName}
      />

      <RoleWelcomeBanner
        title={`Welcome back, ${context.fullName}`}
        subtitle="Vehicle status, roster, and trip readiness. Keep the marshal informed before the next push."
        actionLabel="Open roster"
        actionHref="/driver/roster"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <DriverHeader context={context} onPhotoUploaded={refresh} />
        </div>
        <IconButton
          icon={RefreshCw}
          label="Refresh"
          onClick={handleRefresh}
          disabled={loading}
          className={loading ? "[&_svg]:animate-spin" : ""}
        />
      </div>

      <DriverSummaryCards summary={summary} />

      <div className="flex items-center gap-1 bg-[#0F0F10] border border-white/[0.06] p-1 rounded-2xl w-full sm:w-fit overflow-x-auto">
        <span className="min-h-11 px-4 rounded-xl text-sm font-semibold flex items-center gap-1.5 bg-white/[0.08] text-white shrink-0">
          <Car className="w-4 h-4" />
          My vehicle
        </span>
        <Link
          href="/driver/roster"
          className="min-h-11 px-4 rounded-xl text-sm font-medium flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
        >
          <Calendar className="w-4 h-4" />
          Roster
        </Link>
        <Link
          href="/driver/card"
          className="min-h-11 px-4 rounded-xl text-sm font-medium flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          Card
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
