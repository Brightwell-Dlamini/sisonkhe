/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { RegionConfig, EswatiniRegion } from "../../types";
import {
  MapPin,
  PhoneCall,
  Megaphone,
  Check,
  Building2,
  Radio,
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface RegionalTerminalsSubTabProps {
  regionConfigs: RegionConfig[];
  onUpdateRegionConfigs?: (configs: RegionConfig[]) => void;
}

export default function RegionalTerminalsSubTab({
  regionConfigs,
  onUpdateRegionConfigs
}: RegionalTerminalsSubTabProps) {
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSave = (regionName: string) => {
    setSaveSuccessMsg(`Parameters and broadcast notice for ${regionName} saved successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Regional Terminals & Emergency Dispatch Configurations
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Configure regional terminal station names, emergency hotlines, and station audio/visual announcements for commuter boards.
            </p>
          </div>

          {saveSuccessMsg && (
            <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {regionConfigs.map((cfg, idx) => (
            <div
              key={cfg.region}
              className="p-5 bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {cfg.region === "Hhohho" ? "🏰" : cfg.region === "Manzini" ? "🏭" : cfg.region === "Lubombo" ? "🏔️" : "🌳"}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-white uppercase tracking-tight text-sm">
                    {cfg.region} Region Node
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  ACTIVE TERMINAL
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black tracking-wider uppercase text-zinc-400 block mb-1">
                    Terminal Station Name
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={cfg.terminalName}
                      onChange={(e) => {
                        const updated = [...regionConfigs];
                        updated[idx].terminalName = e.target.value;
                        if (onUpdateRegionConfigs) onUpdateRegionConfigs(updated);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g. Mbabane Main Bus Rank"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-wider uppercase text-zinc-400 block mb-1">
                    Emergency Hotline
                  </label>
                  <div className="relative">
                    <PhoneCall className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={cfg.emergencyNumber}
                      onChange={(e) => {
                        const updated = [...regionConfigs];
                        updated[idx].emergencyNumber = e.target.value;
                        if (onUpdateRegionConfigs) onUpdateRegionConfigs(updated);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g. +268 2404 2221"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-wider uppercase text-zinc-400 block mb-1">
                    Terminal Announcement Broadcast Notice
                  </label>
                  <div className="relative">
                    <Megaphone className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <textarea
                      rows={2}
                      value={cfg.announcement}
                      onChange={(e) => {
                        const updated = [...regionConfigs];
                        updated[idx].announcement = e.target.value;
                        if (onUpdateRegionConfigs) onUpdateRegionConfigs(updated);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                      placeholder="Broadcast notice to terminal display screens..."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleSave(cfg.region)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
