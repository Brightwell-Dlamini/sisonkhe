/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Route } from "../../types";
import { X, Calculator, ArrowRight, Check, CreditCard, Smartphone, ShieldCheck, MapPin, Clock } from "lucide-react";

interface CommuterFareCalculatorModalProps {
  routes: Route[];
  initialRoute?: Route | null;
  onClose: () => void;
}

export default function CommuterFareCalculatorModal({
  routes,
  initialRoute,
  onClose
}: CommuterFareCalculatorModalProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    initialRoute?.id || routes[0]?.id || ""
  );
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [hasLuggage, setHasLuggage] = useState<boolean>(false);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const baseFare = selectedRoute?.baseFareE || 25;
  const luggageFee = hasLuggage ? 10 : 0;
  const totalFare = baseFare * passengerCount + luggageFee;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative text-zinc-900 dark:text-white">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block font-space">
                Eswatini Public Transit Fare Guide
              </span>
              <h3 className="text-base sm:text-lg font-black font-space uppercase tracking-tight">
                Fare & Distance Calculator
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Route Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
              Select Destination Corridor
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 font-bold text-sm text-zinc-900 dark:text-white focus:outline-emerald-500 cursor-pointer"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} ➔ {r.destination} ({r.region} Region • {r.distanceKm} km • E {r.baseFareE.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Passenger & Luggage Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Passengers
              </label>
              <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                <button
                  onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                  className="px-3.5 py-2 text-base font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-black text-sm">
                  {passengerCount}
                </span>
                <button
                  onClick={() => setPassengerCount(Math.min(10, passengerCount + 1))}
                  className="px-3.5 py-2 text-base font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Large Luggage
              </label>
              <button
                onClick={() => setHasLuggage(!hasLuggage)}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  hasLuggage
                    ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-800 dark:text-emerald-300"
                    : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border ${hasLuggage ? "bg-emerald-600 text-white border-emerald-600" : "border-zinc-400"}`}>
                  {hasLuggage && <Check className="w-3 h-3" />}
                </div>
                <span>Luggage (+E10)</span>
              </button>
            </div>
          </div>

          {/* Fare Summary Card */}
          {selectedRoute && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                  Total Gazetted Fare
                </span>
                <div className="text-right">
                  <span className="text-3xl font-mono font-black text-emerald-700 dark:text-emerald-400">
                    E {totalFare.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-zinc-500 block font-sans">
                    Emalangeni (SZL)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Distance</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{selectedRoute.distanceKm} km</strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Est. Travel Time</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">~{Math.round(selectedRoute.distanceKm * 1.1)} mins</strong>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
              Accepted Payment Methods
            </span>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <strong className="block text-zinc-900 dark:text-white">MTN MoMo Pay</strong>
                  <span className="text-[10px] text-zinc-500">Scan QR or dial *007#</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <strong className="block text-zinc-900 dark:text-white">Cash at Boarding</strong>
                  <span className="text-[10px] text-zinc-500">Pay conductor / driver</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Fares are officially gazetted by the National Road Transportation Council (NRTC). No surcharge permitted.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
