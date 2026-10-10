/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Clock, X } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";

interface Props {
  registrationNumber: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/** Preset reasons stay English for audit consistency; UI chrome is localised. */
const PRESETS = [
  "Traffic congestion",
  "Passenger boarding delay",
  "Document check",
  "Weather conditions",
  "Fuel stop",
  "__other__",
];

export default function DelayReasonModal({
  registrationNumber,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useLocale();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [custom, setCustom] = useState("");

  const isOther = preset === "__other__";
  const finalReason = isOther ? custom.trim() : preset;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white">
                {t("marshal.delay_title")}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                {registrationNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="min-h-10 min-w-10 p-2 rounded-lg text-zinc-500 hover:text-zinc-200 touch-manipulation"
            aria-label={t("common.cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {PRESETS.map((p) => (
            <label
              key={p}
              className={`flex items-center gap-2 min-h-11 px-3 py-2.5 rounded-xl border cursor-pointer text-xs touch-manipulation ${
                preset === p
                  ? "border-amber-500/40 bg-amber-500/10 text-white"
                  : "border-white/[0.06] text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="delay-preset"
                checked={preset === p}
                onChange={() => setPreset(p)}
                className="accent-amber-500"
              />
              <span className="font-bold">
                {p === "__other__" ? t("marshal.delay_other") : p}
              </span>
            </label>
          ))}
        </div>

        {isOther && (
          <textarea
            rows={2}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={t("marshal.delay_placeholder")}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 resize-none"
          />
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-bold hover:bg-white/[0.10] touch-manipulation"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => finalReason && onConfirm(finalReason)}
            disabled={!finalReason}
            className="min-h-11 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-black uppercase touch-manipulation"
          >
            {t("marshal.delay_confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
