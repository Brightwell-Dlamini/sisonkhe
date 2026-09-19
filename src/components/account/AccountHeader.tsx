/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import { Mail, Phone, MapPin, ShieldCheck, User } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Administrator",
  admin: "Rank Administrator",
  "fleet-manager": "Fleet Manager",
  inspector: "Traffic Inspector",
  marshal: "Rank Marshal",
  driver: "Kombi Driver",
  operator: "Fleet Operator",
};

export default function AccountHeader() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-200 dark:border-zinc-700 shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-xl shrink-0">
            {user.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-zinc-900 dark:text-white truncate">
            {user.fullName}
          </h1>

          <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>

          {/* Contextual details */}
          <div className="mt-3 space-y-1 text-xs text-zinc-500">
            {user.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono truncate">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono">{user.phone}</span>
              </div>
            )}
            {user.region && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Assigned Region: <strong>{user.region}</strong>
                </span>
              </div>
            )}
            {user.assignedVehicleReg && (
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Assigned Vehicle:{" "}
                  <strong className="font-mono">{user.assignedVehicleReg}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
