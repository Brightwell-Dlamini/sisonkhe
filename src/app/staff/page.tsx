/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /staff — universal staff sign-in entry point.
 *
 * Anyone can bookmark this URL. It takes them to the sign-in page and
 * offers a quick path back to the public kiosk or permit verification.
 */

import Link from "next/link";
import { ArrowRight, LogIn, Monitor, ShieldCheck } from "lucide-react";

export default function StaffRedirect() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-[#050505]">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-[#0F0F10]">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-500">
            Staff access
          </div>
          <h1 className="mt-2 text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
            Redirecting to sign in
          </h1>
        </div>

        <div className="space-y-2">
          <Link
            href="/login"
            className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-tight text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-500/15 dark:text-emerald-400"
          >
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Staff sign-in
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/kiosk"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-zinc-200 dark:hover:border-white/[0.12]"
          >
            <span className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Transit kiosk
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/verify"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-zinc-200 dark:hover:border-white/[0.12]"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Verify permit
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
