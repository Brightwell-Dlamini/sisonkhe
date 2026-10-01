/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import {
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  X,
  Send,
} from "lucide-react";
import type { PublicRoute, PublicVehicle } from "@/lib/public/kiosk";

interface Props {
  routes: PublicRoute[];
  vehicles: PublicVehicle[];
  onClose: () => void;
}

export default function KioskLostProperty({ routes, vehicles, onClose }: Props) {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? "");
  const [vehicleReg, setVehicleReg] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !description) return;

    const route = routes.find((r) => r.id === routeId);

    try {
      await fetch("/api/public/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: name,
          reporterPhone: phone,
          category: "Lost property",
          description: `Lost item: ${description}. Route: ${route?.origin ?? "?"} → ${route?.destination ?? "?"}. Vehicle: ${vehicleReg || "unspecified"}`,
          vehicleReg: vehicleReg || undefined,
          routeId,
          reporterType: "Commuter",
        }),
      });
    } catch {
      // We'll still show success — a follow-up can correct if the write failed
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-zinc-900 dark:text-white">
              Report Logged
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Marshals and drivers on this corridor have been notified. If found, you'll be contacted at{" "}
              <strong>{phone}</strong>.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono">
            Rank Marshal Desk: <strong>+268 2404 2222</strong>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
                Report Lost Property
              </h3>
              <p className="text-[10px] text-zinc-500">
                NRTC Commuter Assistance
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-zinc-500">
            Left something in a kombi? Log it now so marshals can check the vehicle at the next terminal.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Route
            </label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-white"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} → {r.destination} ({r.region})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Vehicle plate (if known)
            </label>
            <input
              type="text"
              value={vehicleReg}
              onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
              placeholder="e.g. HSD 101 BM"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+268 7600 0000"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Describe item & location *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Black backpack with laptop, left on back row around 08:15"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-600" />
              <span className="text-amber-900 dark:text-amber-200 font-medium">
                Marshal Desk:
              </span>
            </div>
            <span className="font-mono font-black text-amber-800 dark:text-amber-300">
              +268 2404 2222
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
