/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Mail, ShieldCheck, Sparkles } from "lucide-react";
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

  const avatarUrl = (user as any).avatarUrl as string | undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Account"
        description="Manage your profile, security, and active sessions."
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0F0F10]">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 blur-md opacity-40" />
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.fullName}
                className="relative h-20 w-20 rounded-2xl object-cover ring-2 ring-white/10"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-2xl font-black text-black ring-2 ring-white/10">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0F0F10] bg-emerald-500">
              <ShieldCheck className="h-3.5 w-3.5 text-black" />
            </span>
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black tracking-tight text-white">
                {user.fullName}
              </h2>
              <Badge variant="success" size="sm">
                <Sparkles className="mr-1 h-3 w-3" />
                {(user.role ?? "user").replace(/-/g, " ")}
              </Badge>
            </div>

            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-zinc-400">
              <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              {user.email ?? (user as any).username}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
                Account active
              </span>
              <span>Secure session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
