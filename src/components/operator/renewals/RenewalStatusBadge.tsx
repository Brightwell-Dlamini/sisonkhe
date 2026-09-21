/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { RenewalRow } from "@/lib/renewals/queries";

const STYLES: Record<string, string> = {
  "Pending Admin Approval":
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

const LABELS: Record<string, string> = {
  "Pending Admin Approval": "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
};

export default function RenewalStatusBadge({
  status,
}: {
  status: RenewalRow["status"];
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${STYLES[status] ?? ""}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
