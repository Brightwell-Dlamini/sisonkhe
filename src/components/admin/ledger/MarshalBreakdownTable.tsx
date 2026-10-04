/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import type { SettlementSummary } from "@/lib/ledger/queries";
import { Table, TableHead, TableBody, Th, Tr, Td } from "@/components/ui";

interface Props {
  marshals: SettlementSummary["byMarshal"];
}

export default function MarshalBreakdownTable({ marshals }: Props) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">
          By Marshal
        </h3>
        <span className="text-[10px] text-zinc-500 font-mono">
          {marshals.length} {marshals.length === 1 ? "marshal" : "marshals"}
        </span>
      </div>

      {marshals.length === 0 ? (
        <div className="text-center py-8 text-xs text-zinc-500">
          No marshal activity in this range.
        </div>
      ) : (
        <Table>
          <TableHead>
            <Th>Marshal</Th>
            <Th>Region</Th>
            <Th align="right">Dispatches</Th>
            <Th align="right">Collected</Th>
          </TableHead>
          <TableBody>
            {marshals.map((m) => (
              <Tr key={m.marshalId}>
                <Td>
                  <span className="font-bold text-white text-xs">{m.marshalName}</span>
                </Td>
                <Td>
                  <span className="text-zinc-400 text-xs">{m.region}</span>
                </Td>
                <Td align="right">
                  <span className="font-mono text-zinc-300 text-xs">{m.dispatchCount}</span>
                </Td>
                <Td align="right">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    E {m.totalCollected.toFixed(2)}
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
