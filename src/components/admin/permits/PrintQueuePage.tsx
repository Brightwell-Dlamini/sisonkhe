/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import PrintQueueTable from "./PrintQueueTable";

export default function PrintQueuePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Permit Print Queue
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Select vehicles to print official A4 permits. Each permit embeds a
          signed HMAC-SHA256 QR linking to the public verification page.
        </p>
      </header>

      <PrintQueueTable />
    </div>
  );
}
