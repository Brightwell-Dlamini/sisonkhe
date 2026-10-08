/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Root entry: send authenticated users to their role home, guests to kiosk.
 */

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  LogIn,
  Monitor,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import BrandMark from "@/components/common/BrandMark";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;

    switch (user.role) {
      case "marshal":
        router.replace("/marshal");
        break;
      case "operator":
        router.replace("/operator/renewals");
        break;
      case "driver":
        router.replace("/driver");
        break;
      case "inspector":
        router.replace("/inspector/scan");
        break;
      case "super-admin":
      case "admin":
      case "fleet-manager":
        router.replace("/admin");
        break;
      default:
        router.replace("/kiosk");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandMark size="lg" showSubtitle />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
          <div className="text-xs text-zinc-500 mt-3">Redirecting</div>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <BrandMark size="lg" showSubtitle />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
            Choose your access point
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            Public passengers, permit checks, and staff operations all start here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/kiosk"
            className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0F0F10]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Public
            </div>
            <div className="mt-2 text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Transit kiosk
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Route status, vehicle info, and public transport updates.
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold text-emerald-600">
              Open kiosk <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/verify"
            className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0F0F10]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Verify
            </div>
            <div className="mt-2 text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Permit check
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Validate a permit QR and inspect vehicle registration details.
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold text-emerald-600">
              Verify QR <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-500/60 hover:shadow-md dark:border-white/[0.08] dark:bg-[#0F0F10]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <LogIn className="h-5 w-5" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Staff
            </div>
            <div className="mt-2 text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              Sign in
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Access marshal, driver, operator, inspector, and admin dashboards.
            </div>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold text-emerald-600">
              Staff access <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-white/[0.08] dark:bg-[#0F0F10]">
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
            <UserRound className="h-3.5 w-3.5 text-emerald-500" />
            New to the system?
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Register a driver profile at <Link href="/register/driver" className="font-bold text-emerald-600 hover:underline">/register/driver</Link> or claim your account at <Link href="/claim" className="font-bold text-emerald-600 hover:underline">/claim</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
