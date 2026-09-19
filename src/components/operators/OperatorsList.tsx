/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  CreditCard,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { useOperators, type CreateOperatorRequest } from "@/hooks/useOperators";
import type { OperatorRow } from "@/lib/operators/queries";
import OperatorFormModal from "./OperatorFormModal";
import OperatorActionsMenu from "./OperatorActionsMenu";
import OperatorCredentialsDialog from "./OperatorCredentialsDialog";

export default function OperatorsList() {
  const {
    operators,
    loading,
    error,
    refresh,
    createOperator,
    updateOperator,
    deactivateOperator,
    resetPassword,
  } = useOperators();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorRow | null>(null);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    username: string;
    password: string;
    masterCardNumber?: string;
    initialBalance?: number;
    isReset?: boolean;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return operators.filter((o) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          o.name.toLowerCase().includes(q) ||
          o.companyName.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          (o.email ?? "").toLowerCase().includes(q) ||
          (o.nationalId ?? "").toLowerCase().includes(q) ||
          (o.taxNumber ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [operators, searchQuery]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (input: CreateOperatorRequest) => {
    const result = await createOperator(input);
    if (result.success && result.credentials) {
      setShowCreateModal(false);
      setCredentials({
        name: input.name,
        email: result.credentials.email,
        username: result.credentials.username,
        password: result.credentials.password,
        masterCardNumber: result.masterCard?.cardNumber,
        initialBalance: result.masterCard?.initialBalance,
      });
      return { success: true };
    }
    return {
      success: false,
      error: result.error,
      issues: result.issues,
    };
  };

  const handleUpdate = async (
    id: string,
    input: Partial<CreateOperatorRequest>
  ) => {
    const ok = await updateOperator(id, input);
    if (ok) {
      showToast("Operator updated");
      setEditingOperator(null);
    }
    return ok;
  };

  const handleDeactivate = async (op: OperatorRow) => {
    const ok = await deactivateOperator(op.id);
    if (ok) showToast(`Deactivated ${op.name}`);
  };

  const handleResetPassword = async (op: OperatorRow) => {
    const result = await resetPassword(op.id);
    if (result.success && result.tempPassword && result.name) {
      setCredentials({
        name: result.name,
        email: op.email ?? "",
        username: op.username ?? "(unknown)",
        password: result.tempPassword,
        isReset: true,
      });
      return result;
    }
    return result;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, company, phone, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Operator
          </button>
        </div>
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

      {loading && operators.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 px-4">
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
            {operators.length === 0
              ? "No operators registered yet"
              : "No matching operators"}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {operators.length === 0
              ? "Click 'Register Operator' to add the first one."
              : "Try a different search."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((op) => (
            <div
              key={op.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {op.avatarUrl ? (
                    <img
                      src={op.avatarUrl}
                      alt={op.name}
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-zinc-900 dark:text-white truncate">
                      {op.name}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider truncate">
                      {op.companyName}
                    </div>
                    {op.username && (
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        @{op.username}
                      </div>
                    )}
                  </div>
                </div>
                <OperatorActionsMenu
                  operator={op}
                  onEdit={() => setEditingOperator(op)}
                  onDeactivate={() => handleDeactivate(op)}
                  onResetPassword={() => handleResetPassword(op)}
                />
              </div>

              {/* Contact strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono">
                  <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{op.phone}</span>
                </div>
                {op.email && (
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono">
                    <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate">{op.email}</span>
                  </div>
                )}
              </div>

              {/* Master Card Summary */}
              {op.masterCard ? (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold text-zinc-500">
                        Master Card
                      </div>
                      <div className="font-mono text-[11px] font-bold text-zinc-900 dark:text-white truncate">
                        {op.masterCard.cardNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-[10px] text-zinc-400 font-sans uppercase font-bold">
                      Balance
                    </div>
                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      E {op.masterCard.balanceSzl.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
                  No Master Card issued
                </div>
              )}

              {/* Footer info strip */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="text-[11px] text-zinc-500">
                  {op.vehicleCount}{" "}
                  {op.vehicleCount === 1 ? "vehicle" : "vehicles"} owned
                </div>
                {op.association && (
                  <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider truncate max-w-[60%]">
                    {op.association}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <OperatorFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingOperator && (
        <OperatorFormModal
          mode="edit"
          operator={editingOperator}
          onClose={() => setEditingOperator(null)}
          onSubmit={async (input) => {
            const ok = await handleUpdate(editingOperator.id, input);
            return { success: ok };
          }}
        />
      )}

      {credentials && (
        <OperatorCredentialsDialog
          name={credentials.name}
          email={credentials.email}
          username={credentials.username}
          password={credentials.password}
          masterCardNumber={credentials.masterCardNumber}
          initialBalance={credentials.initialBalance}
          isReset={credentials.isReset}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
