/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Search, RefreshCw, Printer } from "lucide-react";
import Link from "next/link";
import { useRenewals } from "@/hooks/useRenewals";
import type { RenewalRow } from "@/lib/renewals/queries";
import PendingRenewalsTable from "./PendingRenewalsTable";
import RenewalApprovalModal from "./RenewalApprovalModal";
import {
  Button,
  IconButton,
  Input,
  PageHeader,
  TableSkeleton,
  useToast,
} from "@/components/ui";

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
  const toast = useToast();

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

  const handleApprove = async (
    id: string,
    input: Parameters<typeof approveRenewal>[1]
  ) => {
    const result = await approveRenewal(id, input);
    if (result.success) {
      toast.success(`Renewal ${input.decision.toLowerCase()}`);
      setActive(null);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  return (
    <div>
      <PageHeader
        title="Permit Renewals"
        description="Review operator-submitted renewal requests. Approvals update the vehicle's permit and archive the old one."
        actions={
          <Link href="/admin/permits/print">
            <Button leadingIcon={Printer} size="sm">
              Print Queue
            </Button>
          </Link>
        }
      />

      <div className="flex items-center gap-1.5 bg-[#0F0F10] border border-white/[0.06] p-1 rounded-2xl w-fit mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex-1 min-w-0">
          <Input
            leadingIcon={Search}
            placeholder="Search by vehicle, operator, or request ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <IconButton
          icon={RefreshCw}
          label="Refresh"
          onClick={refresh}
          disabled={loading}
          className={loading ? "[&_svg]:animate-spin" : ""}
        />
      </div>

      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
          {error}
        </div>
      )}

      {loading && renewals.length === 0 ? (
        <TableSkeleton rows={6} />
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
