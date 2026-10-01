/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Route, Vehicle } from "../../types";
import { X, ShieldAlert, PhoneCall, CheckCircle2, HelpCircle, AlertTriangle, Send } from "lucide-react";

interface LostPropertyModalProps {
  routes: Route[];
  vehicles: Vehicle[];
  onClose: () => void;
  onSubmitIncident?: (incident: any) => void;
}

export default function LostPropertyModal({
  routes,
  vehicles,
  onClose,
  onSubmitIncident
}: LostPropertyModalProps) {
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || "");
  const [vehicleReg, setVehicleReg] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactPhone || !itemDescription) return;

    if (onSubmitIncident) {
      onSubmitIncident({
        id: `inc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        reporterName: contactName,
        reporterPhone: contactPhone,
        category: "Lost property",
        description: `Lost Item: ${itemDescription}. Route: ${selectedRouteId}. Vehicle: ${vehicleReg || "Unspecified"}`,
        vehicleReg: vehicleReg || undefined,
        routeId: selectedRouteId,
        status: "Pending",
        escalatedTo: "Local Transport Association",
        reporterType: "Commuter"
      });
    }

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative text-zinc-900 dark:text-white">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 block font-space">
                Commuter Assistance Center
              </span>
              <h3 className="text-base sm:text-lg font-black font-space uppercase tracking-tight">
                Report Lost Property
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
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {submitted ? (
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black font-space uppercase text-zinc-900 dark:text-white">
                  Report Logged Successfully
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Your lost property report has been broadcasted to the Rank Marshal office and drivers on that corridor. If found, you will be contacted at <strong>{contactPhone}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-mono">
                <span>Rank Marshal Office: <strong>+268 2404 2222</strong></span>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <p className="text-zinc-500 leading-relaxed">
                Left a phone, bag, wallet, or luggage in a kombi? Log the details below immediately. Rank Marshals can check the vehicle at the next destination terminal.
              </p>

              {/* Route */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-zinc-500">
                  Route You Traveled
                </label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-900 dark:text-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.origin} ➔ {r.destination} ({r.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle plate if known */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-zinc-500">
                  Kombi Plate / Fleet Number (If known)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ASD 633 BM or K-104"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-900 dark:text-white"
                />
              </div>

              {/* Your Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-zinc-500">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thabo Ndlovu"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-zinc-500">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+268 7600 0000"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Item Description */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-zinc-500">
                  Describe Item & Location in Kombi *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Black leather backpack with laptop and ID card, left on back seat row 4 around 08:15 AM."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white resize-none"
                />
              </div>

              {/* Marshal Hotline */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-900 dark:text-amber-200 font-medium">Rank Marshal Desk:</span>
                </div>
                <span className="font-mono font-black text-amber-800 dark:text-amber-300">
                  +268 2404 2222
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
