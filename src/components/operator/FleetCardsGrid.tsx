"use client";

import { useState } from "react";
import { Loader2, Inbox } from "lucide-react";
import { useOperatorFleetCards } from "@/hooks/useOperatorFleetCards";
import VehicleCardMini from "./VehicleCardMini";
import CardInspectionModal from "./CardInspectionModal";
import SendMoneyModal from "./SendMoneyModal";
import { useOperatorMasterCard } from "@/hooks/useOperatorMasterCard";
import { useToast } from "@/components/ui";

export default function FleetCardsGrid() {
  const { vehicles, loading, error } = useOperatorFleetCards();
  const [selected, setSelected] = useState<string | null>(null);
  const [sendTo, setSendTo] = useState<string | null>(null);
  const { card, refresh, sendMoney } = useOperatorMasterCard();
  const toast = useToast();

  if (loading && vehicles.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl px-4 py-3 text-xs">
        {error}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-12 text-center">
        <Inbox className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
        <div className="text-sm font-bold text-zinc-300">
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
            onQuickSend={(reg) => setSendTo(reg)}
          />
        ))}
      </div>

      {selected && (
        <CardInspectionModal
          registrationNumber={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {sendTo && card && (
        <SendMoneyModal
          vehicles={vehicles}
          initialVehicleReg={sendTo}
          masterBalance={card.balanceSzl}
          onClose={() => setSendTo(null)}
          onSubmit={async (input) => {
            const res = await sendMoney(input);
            if (res.success) {
              await refresh();
              toast.success("Transfer sent", `E${input.amountSzl.toFixed(2)} → ${input.vehicleReg}`);
            } else {
              toast.error("Transfer failed", res.error ?? "Request failed");
            }
            return res;
          }}
        />
      )}
    </>
  );
}
