/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Copy, Check, X, AlertCircle, ShieldCheck, CreditCard } from "lucide-react";

interface Props {
  name: string;
  email: string;
  username: string;
  password: string;
  masterCardNumber?: string;
  initialBalance?: number;
  isReset?: boolean;
  onClose: () => void;
}

export default function OperatorCredentialsDialog({
  name,
  email,
  username,
  password,
  masterCardNumber,
  initialBalance,
  isReset,
  onClose,
}: Props) {
  const [copied, setCopied] = useState<"user" | "pass" | "all" | null>(null);

  const copy = (text: string, tag: "user" | "pass" | "all") => {
    navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    const lines = [
      `Operator: ${name}`,
      `Email: ${email}`,
      `Username: ${username}`,
      `Password: ${password}`,
    ];
    if (masterCardNumber) lines.push(`Master Card: ${masterCardNumber}`);
    if (initialBalance !== undefined)
      lines.push(`Initial Balance: E${initialBalance.toFixed(2)}`);
    copy(lines.join("\n"), "all");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                {isReset ? "Password Reset" : "Operator Registered"}
              </h3>
              <p className="text-[11px] text-zinc-500">{name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isReset && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              The password is shown <strong>only once</strong>. Share these
              credentials securely with {name}.
            </span>
          </div>
        )}

        {isReset && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              New password shown once. Share it securely with {name}.
            </span>
          </div>
        )}

        {/* Email */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
            Email (Login)
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-zinc-900 dark:text-white break-all">
              {email || "(none)"}
            </code>
            {email && (
              <button
                onClick={() => copy(email, "user")}
                className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600"
              >
                {copied === "user" ? (
                  <Check className="w-4 h-4 text-amber-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Username */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
            Username (Alternative Login)
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-zinc-900 dark:text-white break-all">
              {username}
            </code>
            <button
              onClick={() => copy(username, "user")}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600"
            >
              {copied === "user" ? (
                <Check className="w-4 h-4 text-amber-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
            {isReset ? "New Temporary Password" : "Initial Password"}
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-zinc-900 dark:text-white break-all">
              {password}
            </code>
            <button
              onClick={() => copy(password, "pass")}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-amber-600"
            >
              {copied === "pass" ? (
                <Check className="w-4 h-4 text-amber-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Master Card (only on create) */}
        {!isReset && masterCardNumber && initialBalance !== undefined && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              <CreditCard className="w-3.5 h-3.5" />
              Master Card Issued
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-zinc-900 dark:text-white text-xs">
                  {masterCardNumber}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Enterprise Master Concession
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-zinc-400 font-bold">
                  Balance
                </div>
                <div className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  E{" "}
                  {initialBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={copyAll}
            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {copied === "all" ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy All
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
