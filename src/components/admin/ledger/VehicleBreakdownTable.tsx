/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { SettlementSummary } from "@/lib/ledger/queries";
import { Table, TableHead, TableBody, Th, Tr, Td } from "@/components/ui";

interface Props {
  vehicles: SettlementSummary["byVehicle"];
}

export default function VehicleBreakdownTable({ vehicles }: Props) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">
          By Vehicle
        </h3>
        <span className="text-[10px] text-zinc-500 font-mono">
          {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
        </span>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-8 text-xs text-zinc-500">
          No vehicle activity in this range.
        </div>
      ) : (
        <Table>
          <TableHead>
            <Th>Vehicle</Th>
            <Th>VIC</Th>
            <Th align="right">Dispatches</Th>
            <Th align="right">Collected</Th>
          </TableHead>
          <TableBody>
            {vehicles.map((v) => (
              <Tr key={v.vehicleReg}>
                <Td>
                  <span className="font-mono font-bold text-white text-xs">
                    {v.vehicleReg}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-emerald-400 text-[11px]">
                    {v.vic ?? "—"}
                  </span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-zinc-300 text-xs">{v.dispatchCount}</span>
                </Td>
                <Td align="right">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    E {v.totalCollected.toFixed(2)}
                  </span>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
