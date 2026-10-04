"use client";

import { useState } from "react";
import {
  Clock,
  Users,
  CheckCircle2,
  Rocket,
  Loader2,
} from "lucide-react";

interface Props {
  currentStatus: string;
  onUpdate: (status: string) => Promise<{ success: boolean; error?: string }>;
}

const STATUSES = [
  { id: "Waiting", label: "Waiting", icon: Clock, color: "blue" },
  { id: "Loading", label: "Loading", icon: Users, color: "emerald" },
  { id: "Full", label: "Full Cabin", icon: CheckCircle2, color: "purple" },
  { id: "Depart", label: "Departing", icon: Rocket, color: "amber" },
];

const COLORS: Record<string, string> = {
  blue: "bg-blue-500 border-blue-500 text-white",
  emerald: "bg-emerald-500 border-emerald-500 text-white",
  purple: "bg-purple-500 border-purple-500 text-white",
  amber: "bg-amber-500 border-amber-500 text-white",
};

export default function CabStatusButtons({ currentStatus, onUpdate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleClick = async (status: string) => {
    if (status === currentStatus) return;
    setBusy(status);
    const res = await onUpdate(status);
    setBusy(null);
    if (res.success) {
      setToast(`Status sent to marshal: ${status}`);
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast(res.error ?? "Update failed");
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
        Update Cab Status (Notifies Marshal)
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STATUSES.map((s) => {
          const Icon = s.icon;
          const isCurrent = s.id === currentStatus;
          return (
            <button
              key={s.id}
              onClick={() => handleClick(s.id)}
              disabled={busy !== null}
              className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                isCurrent
                  ? COLORS[s.color]
                  : "bg-[#0F0F10] border border-white/[0.06] text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {busy === s.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              {s.label}
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="text-[11px] text-center text-emerald-400 font-bold">
          {toast}
        </div>
      )}

      <div className="text-[10px] text-zinc-500 text-center">
        The marshal has final approval on queue dispatch.
      </div>
    </div>
  );
}
