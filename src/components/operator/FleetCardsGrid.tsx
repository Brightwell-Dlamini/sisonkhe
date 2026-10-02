"use client";

import { useState } from "react";
import { Loader2, Inbox } from "lucide-react";
import { useOperatorFleetCards } from "@/hooks/useOperatorFleetCards";
import VehicleCardMini from "./VehicleCardMini";
import CardInspectionModal from "./CardInspectionModal";

export default function FleetCardsGrid() {
  const { vehicles, loading, error } = useOperatorFleetCards();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading && vehicles.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
        {error}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No vehicles in your fleet
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Contact admin to have vehicles assigned to your operator account.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicles.map((v) => (
          <VehicleCardMini
            key={v.registrationNumber}
            vehicle={v}
            onClick={() => setSelected(v.registrationNumber)}
          />
        ))}
      </div>

      {selected && (
        <CardInspectionModal
          registrationNumber={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
