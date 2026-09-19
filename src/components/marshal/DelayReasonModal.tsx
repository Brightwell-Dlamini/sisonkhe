/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  registrationNumber: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

const PRESETS = [
  "Mechanical issue",
  "Waiting for passengers",
  "Traffic incident",
  "Driver unavailable",
  "Route obstruction",
  "Other (specify)",
];

export default function DelayReasonModal({
  registrationNumber,
  onCancel,
  onConfirm,
}: Props) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [custom, setCustom] = useState("");

  const finalReason = preset === "Other (specify)" ? custom.trim() : preset;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                Report Delay
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                {registrationNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {PRESETS.map((p) => (
            <label
              key={p}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs ${
                preset === p
                  ? "border-amber-400 bg-amber-50 dark:bg-amber-950/40"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="delay-preset"
                checked={preset === p}
                onChange={() => setPreset(p)}
                className="text-amber-600"
              />
              <span className="font-bold text-zinc-700 dark:text-zinc-300">{p}</span>
            </label>
          ))}

          {preset === "Other (specify)" && (
            <input
              type="text"
              placeholder="Describe the reason…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              autoFocus
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(finalReason)}
            disabled={preset === "Other (specify)" && !custom.trim()}
            className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Report Delay
          </button>
        </div>
      </div>
    </div>
  );
}
