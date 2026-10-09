/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import InspectorDashboard from "@/components/inspector/InspectorDashboard";

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      }
    >
      <InspectorDashboard />
    </Suspense>
  );
}
