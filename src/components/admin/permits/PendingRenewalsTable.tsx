/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Inbox } from "lucide-react";
import type { RenewalRow } from "@/lib/renewals/queries";
import RenewalStatusBadge from "@/components/operator/renewals/RenewalStatusBadge";
import {
  Button,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
  EmptyState,
} from "@/components/ui";

interface Props {
  renewals: RenewalRow[];
  isPending: boolean;
  onSelect: (r: RenewalRow) => void;
}

export default function PendingRenewalsTable({
  renewals,
  isPending,
  onSelect,
}: Props) {
  if (renewals.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={`No ${isPending ? "pending " : ""}renewals`}
        description={
          isPending
            ? "Operator renewal requests will appear here for review."
            : "No records match this status."
        }
      />
    );
  }

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
      <Table>
        <TableHead>
          <Th>Request</Th>
          <Th>Vehicle</Th>
          <Th>Operator</Th>
          <Th>Submitted</Th>
          <Th align="right">Fee Paid</Th>
          <Th>Status</Th>
          <Th align="right">Actions</Th>
        </TableHead>
        <TableBody>
          {renewals.map((r) => (
            <Tr key={r.id}>
              <Td>
                <span className="font-mono text-[10px] text-zinc-500">{r.id}</span>
              </Td>
              <Td>
                <span className="font-mono font-bold text-white text-xs">
                  {r.vehicleReg}
                </span>
              </Td>
              <Td>
                <span className="text-zinc-300 text-xs">{r.operator ?? "—"}</span>
              </Td>
              <Td>
                <span className="font-mono text-zinc-400 text-xs">{r.requestDate}</span>
              </Td>
              <Td align="right">
                {r.renewalFeeAmountSzl !== null ? (
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    E {r.renewalFeeAmountSzl.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-zinc-500">—</span>
                )}
              </Td>
              <Td>
                <RenewalStatusBadge status={r.status} />
              </Td>
              <Td align="right">
                <Button
                  size="sm"
                  variant={isPending ? "primary" : "secondary"}
                  onClick={() => onSelect(r)}
                >
                  {isPending ? "Review" : "View"}
                </Button>
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
