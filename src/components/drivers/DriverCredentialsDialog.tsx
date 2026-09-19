/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Copy, Check, X, AlertCircle, ShieldCheck } from "lucide-react";

interface Props {
  fullName: string;
  username: string;
  password: string;
  isReset?: boolean;
  onClose: () => void;
}

export default function DriverCredentialsDialog({
  fullName,
  username,
  password,
  isReset,
  onClose,
}: Props) {
  const [copiedField, setCopiedField] = useState<"username" | "password" | "both" | null>(null);

  const copy = (text: string, field: "username" | "password" | "both") => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyBoth = () => {
    const text = `Username: ${username}\nPassword: ${password}`;
    copy(text, "both");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                {isReset ? "Password Reset" : "Driver Registered"}
              </h3>
              <p className="text-[11px] text-zinc-500">{fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            The password is shown <strong>only once</strong>. Copy it now and
            share it securely with {fullName}. They should change it after
            their first login.
          </span>
        </div>

        {/* Username */}
        <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400 mb-1">
            Username
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-zinc-900 dark:text-white break-all">
              {username}
            </code>
            <button
              onClick={() => copy(username, "username")}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600"
            >
              {copiedField === "username" ? (
                <Check className="w-4 h-4 text-emerald-600" />
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
              onClick={() => copy(password, "password")}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600"
            >
              {copiedField === "password" ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyBoth}
            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {copiedField === "both" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Both
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
