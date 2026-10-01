/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
                Fare Calculator
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                NRTC Gazetted Fares
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Destination
            </label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-white"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} → {r.destination} (E{r.baseFareE.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Passengers
              </label>
              <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                <button
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                  className="px-3 py-2 text-base font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  −
                </button>
                <span className="flex-1 text-center font-mono font-black text-sm">
                  {passengers}
                </span>
                <button
                  onClick={() => setPassengers(Math.min(10, passengers + 1))}
                  className="px-3 py-2 text-base font-bold text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Large Luggage
              </label>
              <button
                onClick={() => setHasLuggage(!hasLuggage)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  hasLuggage
                    ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                }`}
              >
                {hasLuggage && <Check className="w-3.5 h-3.5" />}
                +E10
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-300">
                Total
              </span>
              <div className="text-right">
                <div className="text-3xl font-mono font-black text-emerald-700 dark:text-emerald-400">
                  E {total.toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-500">SZL</div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 text-center">
            Fares gazetted by National Road Transportation Council. No surcharge permitted.
          </div>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs uppercase rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
