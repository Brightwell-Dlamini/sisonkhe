/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Badge } from "@/components/ui";

export default function AccountHeader() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <PageHeader
        title="My Account"
        description="Profile, security, and session settings."
      />
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
        {(user as any).avatarUrl ? (
          <img
            src={(user as any).avatarUrl}
            alt={user.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/[0.08] shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-black flex items-center justify-center font-black text-xl shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-black text-white truncate">{user.fullName}</h2>
          <p className="text-xs text-zinc-500 truncate">{user.email ?? (user as any).username}</p>
          <div className="mt-1.5">
            <Badge variant="success" size="sm">
              {(user.role ?? "user").replace(/-/g, " ")}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
