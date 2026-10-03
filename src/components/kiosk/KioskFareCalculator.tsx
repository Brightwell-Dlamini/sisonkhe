"use client";

import { useState } from "react";
import { Calculator, X, Check } from "lucide-react";
import type { PublicRoute } from "@/lib/public/kiosk";

interface Props {
  routes: PublicRoute[];
  onClose: () => void;
}

export default function KioskFareCalculator({ routes, onClose }: Props) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [passengers, setPassengers] = useState(1);
  const [hasLuggage, setHasLuggage] = useState(false);

  const route = routes.find((r) => r.id === routeId) ?? routes[0];
  const baseFare = route?.baseFareE ?? 0;
  const luggageFee = hasLuggage ? 10 : 0;
  const total = baseFare * passengers + luggageFee;

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        icon={<Calculator className="w-5 h-5" />}
        eyebrow="NRTC Fare Guide"
        title="Fare Calculator"
        onClose={onClose}
      />

      <div className="p-6 space-y-5">
        <Field label="Destination Corridor">
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="w-full bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/40"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.origin} → {r.destination} · E {r.baseFareE.toFixed(2)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Passengers">
            <div className="flex items-center rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
              <button
                onClick={() => setPassengers(Math.max(1, passengers - 1))}
                className="px-4 py-3 text-lg font-black text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                −
              </button>
              <span className="flex-1 text-center font-mono font-black text-base text-white tabular-nums">
                {passengers}
              </span>
              <button
                onClick={() => setPassengers(Math.min(10, passengers + 1))}
                className="px-4 py-3 text-lg font-black text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Large Luggage">
            <button
              onClick={() => setHasLuggage(!hasLuggage)}
              className={`w-full py-3 rounded-xl border text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                hasLuggage
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-zinc-900 border-white/[0.06] text-zinc-500 hover:text-white"
              }`}
            >
              {hasLuggage && <Check className="w-4 h-4" />}
              +E10
            </button>
          </Field>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] border border-emerald-500/20">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs font-black uppercase tracking-[0.15em] text-emerald-400">
              Total Gazetted Fare
            </span>
            <div className="text-right">
              <div className="font-mono text-5xl font-black text-white tracking-tight tabular-nums">
                E {total.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                Emalangeni · SZL
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Info label="Distance" value={`${route?.distanceKm ?? 0} km`} />
          <Info
            label="Est. Travel"
            value={`~${Math.round((route?.distanceKm ?? 0) * 1.1)} min`}
          />
        </div>

        <p className="text-[10px] text-center text-zinc-500 leading-relaxed">
          Fares gazetted by the National Road Transportation Council.
          <br />
          No surcharge permitted.
        </p>
      </div>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0f0f10] border border-white/[0.08] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  icon,
  eyebrow,
  title,
  onClose,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="font-mono text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400">
            {eyebrow}
          </div>
          <h3 className="kiosk-destination text-lg text-white uppercase">
            {title}
          </h3>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-mono text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-zinc-900 border border-white/[0.06]">
      <div className="font-mono text-[9px] font-black uppercase tracking-widest text-zinc-600">
        {label}
      </div>
      <div className="font-mono text-sm font-black text-white mt-0.5 tabular-nums">
        {value}
      </div>
    </div>
  );
}
