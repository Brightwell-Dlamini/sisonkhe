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
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, company, phone, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-bold hover:bg-white/[0.08] disabled:opacity-50 flex items-center gap-1.5"
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
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && operators.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-zinc-400">No operators found</p>
          <p className="text-xs text-zinc-500 mt-1">Register your first operator to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((op) => (
            <div
              key={op.id}
              className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-3 hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-black text-white text-sm truncate">{op.name}</div>
                  <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider truncate">
                    {op.companyName}
                  </div>
                </div>
                <OperatorActionsMenu
                  operator={op}
                  onEdit={() => setEditingOperator(op)}
                  onDeactivate={() => handleDeactivate(op)}
                  onResetPassword={() => handleResetPassword(op)}
                />
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-400">
                {op.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="font-mono">{op.phone}</span>
                  </div>
                )}
                {op.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{op.email}</span>
                  </div>
                )}
              </div>

              {op.masterCard && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Master Card</div>
                      <div className="font-mono text-xs text-white truncate">{op.masterCard.cardNumber}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">Balance</div>
                    <div className="font-mono font-black text-emerald-400 text-sm">
                      E{(op.masterCard.balance ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  op.isActive
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-zinc-500/15 text-zinc-400"
                }`}>
                  {op.isActive ? "Active" : "Inactive"}
                </span>
                {op.username && (
                  <span className="text-[10px] font-mono text-zinc-500">@{op.username}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <OperatorFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingOperator && (
        <OperatorFormModal
          operator={editingOperator}
          onClose={() => setEditingOperator(null)}
          onSubmit={(input) => handleUpdate(editingOperator.id, input)}
        />
      )}

      {credentials && (
        <OperatorCredentialsDialog
          credentials={credentials}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
