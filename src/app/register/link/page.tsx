/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import LinkAssignmentPanel from "@/components/assignments/LinkAssignmentPanel";

function LinkInner() {
  const params = useSearchParams();
  const nationalId = params.get("nationalId") || params.get("driver") || "";
  const vehicleReg = params.get("vehicleReg") || params.get("vehicle") || "";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-950">
        Register driver and vehicle separately if needed, then link them here with{" "}
        <strong>National ID</strong> and <strong>number plate</strong>. Both
        records update together.
      </div>
      <LinkAssignmentPanel
        defaultNationalId={nationalId}
        defaultVehicleReg={vehicleReg}
        mode="either"
      />
      <p className="text-center text-[11px] text-slate-500">
        <Link href="/register/driver" className="font-bold text-amber-700 hover:underline">
          Driver registration
        </Link>
        {" \u00b7 "}
        <Link href="/register/vehicle" className="font-bold text-amber-700 hover:underline">
          Vehicle registration
        </Link>
        {" \u00b7 "}
        <Link href="/login" className="font-bold text-amber-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterLinkPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading\u2026</div>}>
      <LinkInner />
    </Suspense>
  );
}
