/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function MarshalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth(["marshal"]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user || user.role !== "marshal") return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Marshal Terminal
            </span>
          </div>
          <Link
            href="/account"
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {user.fullName} →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </div>
    </div>
  );
}
