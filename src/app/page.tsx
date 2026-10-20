/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public front door — three clear intents.
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
  UserPlus,
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
        router.replace("/operator");
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
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandMark size="lg" showSubtitle />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <BrandMark size="lg" showSubtitle />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            What do you need?
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            Taxi rank management · Eswatini
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/kiosk"
            className="block rounded-2xl border border-white/[0.08] bg-[#0F0F10] p-5 transition hover:border-emerald-500/50"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black uppercase text-white">
                  Rank & route info
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Live departures and routes. No login.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  Open kiosk <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0F0F10] p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black uppercase text-white">
                  Account access
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Drivers, marshals, operators, staff.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Sign in
                  </Link>
                  <Link
                    href="/register/driver"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[11px] font-bold text-zinc-200 hover:border-emerald-500/40"
                  >
                    New driver — register
                  </Link>
                  <p className="text-[10px] text-zinc-500 text-center">
                    Invite link lost?{" "}
                    <Link href="/claim" className="text-emerald-400 font-bold hover:underline">
                      Verify with ID
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/verify"
            className="block rounded-2xl border border-white/[0.08] bg-[#0F0F10] p-5 transition hover:border-emerald-500/50"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black uppercase text-white">
                  Check a vehicle
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Scan permit QR or look up registration.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  Verify permit <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        <p className="mt-8 text-center text-[10px] text-zinc-600">
          © 2026 National Road Transportation Council
        </p>
      </div>
    </div>
  );
}
