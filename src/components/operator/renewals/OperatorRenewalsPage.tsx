/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRenewals } from "@/hooks/useRenewals";
import { useAuth } from "@/hooks/useAuth";
import RenewalsList from "./RenewalsList";
import RenewalRequestModal from "./RenewalRequestModal";

export default function OperatorRenewalsPage() {
  const { user } = useAuth();
  const { renewals, loading, error, refresh, createRenewal } = useRenewals();
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (input: Parameters<typeof createRenewal>[0]) => {
    const result = await createRenewal(input);
    if (result.success) {
      showToast("Renewal request submitted. Pending approval.");
      setShowModal(false);
      return { success: true };
    }
    return {
      success: false,
      error: result.error,
      issues: result.issues,
    };
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
            Permit Renewals
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Submit renewal requests for your fleet vehicles. Fleet managers
            review and approve.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Request Renewal
        </button>
      </header>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
          {error}
        </div>
      )}

      <RenewalsList renewals={renewals} loading={loading} />

      {showModal && user?.operatorId && (
        <RenewalRequestModal
          operatorId={user.operatorId}
          operatorName={user.fullName}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
