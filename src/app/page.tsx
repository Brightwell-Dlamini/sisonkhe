/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Root entry: send authenticated users to their role home, guests to kiosk.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/kiosk");
      return;
    }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
      <div className="text-center">
        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
          🇸🇿 Sisonkhe In Transit
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
        <div className="text-xs text-zinc-500 mt-3">Redirecting\u2026</div>
      </div>
    </div>
  );
}
