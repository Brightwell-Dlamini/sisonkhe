"use client";

import { useMemo, useState } from "react";
import { Car, Calendar, CreditCard, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useDriverSummary } from "@/hooks/useDriverSummary";
import { useDriverSignal } from "@/hooks/useDriverSignal";
import DriverHeader from "./DriverHeader";
import DriverVehicleCard from "./DriverVehicleCard";
import DriverSummaryCards from "./DriverSummaryCards";
import DriverTripsList from "./DriverTripsList";
import MessageMarshalModal from "./MessageMarshalModal";
import { IconButton, TableSkeleton, useToast } from "@/components/ui";

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
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
        {error}
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

      <div className="flex items-center gap-1.5 bg-[#0F0F10] border border-white/[0.06] p-1 rounded-2xl w-fit">
        <span className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-white/[0.08] text-white">
          <Car className="w-3.5 h-3.5" />
          My Vehicle
        </span>
        <Link
          href="/driver/roster"
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          30-Day Roster
        </Link>
        <Link
          href="/driver/card"
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-all"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Virtual Card
        </Link>
      </div>

      <div className="space-y-4">
        <DriverVehicleCard
          vehicle={context.vehicle}
          marshal={context.marshal}
          onMessageMarshal={() => setShowMessage(true)}
          onEmitSignal={async (kind, note) => {
            const res = await emitSignal(kind, note);
            if (res.ok && !res.queued) await refresh();
            return res;
          }}
          online={online}
          pendingSignalCount={pendingSignals.length}
          isAfter830PM={after830}
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
