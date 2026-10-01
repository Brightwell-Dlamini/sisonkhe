/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useInspectorTickets } from "@/hooks/useInspectorTickets";
import TicketList from "@/components/inspector/TicketList";

export default function TicketsPage() {
  const { tickets, loading, error } = useInspectorTickets();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          My Tickets
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Tickets you've issued, most recent first.
        </p>
      </header>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
          {error}
        </div>
      )}

      <TicketList tickets={tickets} loading={loading} />
    </div>
  );
}
