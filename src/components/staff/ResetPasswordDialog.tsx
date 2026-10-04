/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { KeyRound, Copy, Check, X, AlertCircle } from "lucide-react";
import type { StaffRow } from "@/lib/staff/queries";

interface Props {
  staff: StaffRow;
  tempPassword?: string;
  onClose: () => void;
}

export default function ResetPasswordDialog({ staff, tempPassword, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white">
                Password Reset
              </h3>
              <p className="text-[11px] text-zinc-500">{staff.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {tempPassword ? (
          <>
            <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This password is shown only once. Copy it now and share it securely
                with {staff.fullName}.
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
                Temporary Password
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold text-white break-all">
                  {tempPassword}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-[#0F0F10] border border-white/[0.06] text-zinc-400 hover:text-emerald-600"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-xs text-zinc-500">
            No password was generated.
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
        >
          Done
        </button>
      </div>
    </div>
  );
}
