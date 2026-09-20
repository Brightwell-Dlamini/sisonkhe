/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useRenewals } from "@/hooks/useRenewals";
import type { RenewalRow } from "@/lib/renewals/queries";
import PendingRenewalsTable from "./PendingRenewalsTable";
import RenewalApprovalModal from "./RenewalApprovalModal";

type Tab = "pending" | "approved" | "rejected";

const TABS: { id: Tab; label: string; status: RenewalRow["status"] }[] = [
  { id: "pending", label: "Pending", status: "Pending Admin Approval" },
  { id: "approved", label: "Approved", status: "Approved" },
  { id: "rejected", label: "Rejected", status: "Rejected" },
];

export default function AdminPermitsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const status = TABS.find((t) => t.id === tab)!.status;
  const { renewals, loading, error, refresh, approveRenewal } = useRenewals(status);

  const [search, setSearch] = useState("");
  const [active, setActive] = useState<RenewalRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return renewals;
    const q = search.toLowerCase();
    return renewals.filter(
      (r) =>
        r.vehicleReg.toLowerCase().includes(q) ||
        (r.operator ?? "").toLowerCase().includes(q) ||
        (r.id ?? "").toLowerCase().includes(q)
    );
  }, [renewals, search]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (
    id: string,
    input: Parameters<typeof approveRenewal>[1]
  ) => {
    const result = await approveRenewal(id, input);
    if (result.success) {
      showToast(`Renewal ${input.decision.toLowerCase()}`);
      setActive(null);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
            Permit Renewals
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Review operator-submitted renewal requests. Approvals update the
            vehicle's permit and archive the old one.
          </p>
        </div>
        <Link
          href="/admin/permits/print"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          Print Queue
        </Link>
      </header>

      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by vehicle, operator, or request ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && renewals.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : (
        <PendingRenewalsTable
          renewals={filtered}
          isPending={tab === "pending"}
          onSelect={(r) => setActive(r)}
        />
      )}

      {active && (
        <RenewalApprovalModal
          renewal={active}
          readOnly={active.status !== "Pending Admin Approval"}
          onClose={() => setActive(null)}
          onSubmit={(input) => handleApprove(active.id, input)}
        />
      )}
    </div>
  );
}
