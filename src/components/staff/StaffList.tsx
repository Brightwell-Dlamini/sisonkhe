/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useStaff, type CreateStaffRequest } from "@/hooks/useStaff";
import type { StaffRow } from "@/lib/staff/queries";
import StaffFormModal from "./StaffFormModal";
import StaffActionsMenu from "./StaffActionsMenu";
import ResetPasswordDialog from "./ResetPasswordDialog";

const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Admin",
  admin: "Admin",
  "fleet-manager": "Fleet Manager",
  inspector: "Inspector",
};

const ROLE_COLORS: Record<string, string> = {
  "super-admin":
    "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  admin:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "fleet-manager":
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  inspector:
    "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export default function StaffList() {
  const {
    staff,
    loading,
    error,
    refresh,
    createStaff,
    updateStaff,
    deactivateStaff,
    resetPassword,
  } = useStaff();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [resetStaff, setResetStaff] = useState<StaffRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phone ?? "").toLowerCase().includes(q) ||
          (s.region ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staff, roleFilter, searchQuery]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (input: CreateStaffRequest) => {
    const result = await createStaff(input);
    if (result.success) {
      showToast(`Created ${result.staff?.fullName ?? "staff member"}`);
      setShowCreateModal(false);
      return { success: true };
    }
    return { success: false, error: result.error, issues: result.issues };
  };

  const handleUpdate = async (id: string, input: Partial<StaffRow>) => {
    const ok = await updateStaff(id, input as never);
    if (ok) {
      showToast("Staff updated");
      setEditingStaff(null);
    }
    return ok;
  };

  const handleDeactivate = async (staff: StaffRow) => {
    const ok = await deactivateStaff(staff.id);
    if (ok) showToast(`Deactivated ${staff.fullName}`);
  };

  const handleResetPassword = async (staff: StaffRow) => {
    const result = await resetPassword(staff.id);
    if (result.success && result.tempPassword) {
      setResetStaff(staff);
      return result;
    }
    return result;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or region…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            <option value="all">All Roles</option>
            <option value="super-admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="fleet-manager">Fleet Manager</option>
            <option value="inspector">Inspector</option>
          </select>
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
            Add Staff
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {loading && staff.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {staff.length === 0 ? "No staff yet" : "No matching staff"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {staff.length === 0
                ? "Click 'Add Staff' to create the first one."
                : "Try a different search or filter."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-zinc-900 dark:text-white">
                        {s.fullName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      <div className="font-mono text-[11px]">{s.email}</div>
                      {s.phone && (
                        <div className="font-mono text-[11px] text-zinc-500">
                          {s.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${ROLE_COLORS[s.role] ?? "bg-zinc-100 text-zinc-700"}`}
                      >
                        {ROLE_LABELS[s.role] ?? s.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {s.region ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-[11px] font-mono">
                      {s.lastLoginAt
                        ? new Date(s.lastLoginAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StaffActionsMenu
                        staff={s}
                        onEdit={() => setEditingStaff(s)}
                        onDeactivate={() => handleDeactivate(s)}
                        onResetPassword={async () => {
                          const res = await handleResetPassword(s);
                          return res;
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <StaffFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingStaff && (
        <StaffFormModal
          mode="edit"
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSubmit={async (input) => {
            const ok = await handleUpdate(editingStaff.id, input as never);
            return { success: ok };
          }}
        />
      )}

      {resetStaff && (
        <ResetPasswordDialog
          staff={resetStaff}
          onClose={() => setResetStaff(null)}
        />
      )}
    </div>
  );
}
