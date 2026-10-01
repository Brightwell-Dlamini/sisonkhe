/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sisonkhe In Transit — root router.
 *
 * The legacy monolith lived here. It's been replaced by dedicated routes:
 *   /kiosk      → public terminal board
 *   /verify     → public QR verification
 *   /login      → sign in
 *   /claim      → marshal account claim
 *   /account    → password change
 *   /marshal    → marshal dispatch dashboard
 *   /operator   → operator portal (renewals, wallet)
 *   /admin      → staff portal (staff, drivers, vehicles, operators, ledger, permits)
 *
 * This component's only job is to route the user to the right place based
 * on their role.
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "./hooks/useAuth";

export default function App() {
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
        // Driver dashboard is Phase 7. Until then, park drivers on the kiosk.
        router.replace("/kiosk");
        break;
      case "super-admin":
      case "admin":
      case "fleet-manager":
      case "inspector":
        router.replace("/admin");
        break;
      default:
        router.replace("/kiosk");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3">
          🇸🇿
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
        <div className="text-xs text-zinc-500 mt-3">Redirecting…</div>
      </div>
    </div>
  );
}
