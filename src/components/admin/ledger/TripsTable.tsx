/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { TripRow } from "@/lib/ledger/queries";
import {
  Badge,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
  EmptyState,
} from "@/components/ui";
import { Receipt } from "lucide-react";

interface Props {
  trips: TripRow[];
}

const STATUS_VARIANT: Record<string, "success" | "info" | "danger" | "default"> = {
  Completed: "success",
  InProgress: "info",
  Cancelled: "danger",
};

export default function TripsTable({ trips }: Props) {
  if (trips.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No trips found"
        description="Adjust the date range or region filter to see trip history."
      />
    );
  }

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
      <Table>
        <TableHead>
          <Th>Date</Th>
          <Th>Dep</Th>
          <Th>Route</Th>
          <Th>Vehicle</Th>
          <Th>Driver</Th>
          <Th align="right">Pax</Th>
          <Th align="right">Revenue</Th>
          <Th>Status</Th>
        </TableHead>
        <TableBody>
          {trips.map((t) => (
            <Tr key={t.id}>
              <Td><span className="font-mono text-zinc-400 text-xs">{t.date}</span></Td>
              <Td><span className="font-mono text-zinc-400 text-xs">{t.departureTime}</span></Td>
              <Td>
                <div className="font-bold text-white text-xs">{t.routeOrigin} → {t.routeDestination}</div>
                <div className="text-[10px] text-zinc-500">{t.region}</div>
              </Td>
              <Td><span className="font-mono font-bold text-white text-xs">{t.vehicleReg}</span></Td>
              <Td><span className="text-zinc-400 text-xs">{t.driverName ?? "—"}</span></Td>
              <Td align="right"><span className="font-mono text-zinc-300 text-xs">{t.passengerCount}</span></Td>
              <Td align="right"><span className="font-mono font-bold text-emerald-400 text-xs">E {t.revenueSzl.toFixed(2)}</span></Td>
              <Td>
                <Badge variant={STATUS_VARIANT[t.status] ?? "default"} size="sm">{t.status}</Badge>
              </Td>
            </Tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
