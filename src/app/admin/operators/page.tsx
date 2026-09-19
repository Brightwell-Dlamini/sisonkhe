/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import OperatorsList from "@/components/operators/OperatorsList";

export default function OperatorsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
          Fleet Operators
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Register vehicle owners, issue Master Cards, and manage enterprise accounts.
        </p>
      </header>

      <OperatorsList />
    </div>
  );
}
