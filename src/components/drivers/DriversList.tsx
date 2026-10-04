/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useDrivers, type CreateDriverRequest } from "@/hooks/useDrivers";
import type { DriverRow } from "@/lib/drivers/queries";
import { driverHealth } from "@/lib/intelligence/entityHealth";
import { HealthChips } from "@/components/intelligence/HealthChips";
import DriverFormModal from "./DriverFormModal";
import DriverActionsMenu from "./DriverActionsMenu";
import DriverCredentialsDialog from "./DriverCredentialsDialog";

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  Suspended: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
  "On Leave": "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  "Off-Duty": "bg-white/[0.06] text-zinc-400 border border-white/[0.08]",
};

export default function DriversList() {
  const {
    drivers,
    loading,
    error,
    refresh,
    createDriver,
    updateDriver,
    deactivateDriver,
    resetPassword,
  } = useDrivers();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthOnly, setHealthOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverRow | null>(null);
  const [credentials, setCredentials] = useState<{
    fullName: string;
    username: string;
    password: string;
    isReset?: boolean;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (healthOnly) {
        const signals = driverHealth({
          status: d.status,
          assignedVehicleReg: d.assignedVehicleReg,
          pdpExpiryDate: d.pdpExpiryDate,
          pdpStatus: d.pdpStatus,
        });
        if (signals.length === 0) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.fullName.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q) ||
          (d.nationalId ?? "").toLowerCase().includes(q) ||
          (d.licenseNumber ?? "").toLowerCase().includes(q) ||
          (d.assignedVehicleReg ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [drivers, statusFilter, searchQuery, healthOnly]);

  const attentionCount = useMemo(
    () =>
      drivers.filter(
        (d) =>
          driverHealth({
            status: d.status,
            assignedVehicleReg: d.assignedVehicleReg,
            pdpExpiryDate: d.pdpExpiryDate,
            pdpStatus: d.pdpStatus,
          }).length > 0
      ).length,
    [drivers]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (input: CreateDriverRequest) => {
    const result = await createDriver(input);
    if (result.success && result.credentials) {
      setShowCreateModal(false);
      setCredentials({
        fullName: input.fullName,
        username: result.credentials.username,
        password: result.credentials.password,
      });
      return { success: true };
    }
    return {
      success: false,
      error: result.error,
      issues: result.issues,
    };
  };

  const handleUpdate = async (id: string, input: Partial<CreateDriverRequest>) => {
    const ok = await updateDriver(id, input);
    if (ok) {
      showToast("Driver updated");
      setEditingDriver(null);
    }
    return ok;
  };

  const handleDeactivate = async (driver: DriverRow) => {
    const ok = await deactivateDriver(driver.id);
    if (ok) showToast(`Suspended ${driver.fullName}`);
  };

  const handleResetPassword = async (driver: DriverRow) => {
    const result = await resetPassword(driver.id);
    if (result.success && result.tempPassword && result.fullName) {
      setCredentials({
        fullName: result.fullName,
        username: driver.username ?? "(unknown)",
        password: result.tempPassword,
        isReset: true,
      });
      return result;
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 min-w-0 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone, ID, licence, or vehicle…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-bold text-zinc-300"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="On Leave">On Leave</option>
            <option value="Off-Duty">Off-Duty</option>
          </select>
          <button
            type="button"
            onClick={() => setHealthOnly((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
              healthOnly
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-zinc-200"
            }`}
          >
            Needs attention{attentionCount > 0 ? ` (${attentionCount})` : ""}
          </button>
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
            Register Driver
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
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
        {loading && drivers.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-sm font-bold text-zinc-300">
              {drivers.length === 0 ? "No drivers registered yet" : "No matching drivers"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {drivers.length === 0
                ? "Click 'Register Driver' to add the first one."
                : "Try a different search or filter."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Licence / PDP</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const signals = driverHealth({
                    status: d.status,
                    assignedVehicleReg: d.assignedVehicleReg,
                    pdpExpiryDate: d.pdpExpiryDate,
                    pdpStatus: d.pdpStatus,
                  });
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-white/[0.06] hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{d.fullName}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <div className="font-mono text-[11px]">{d.phone}</div>
                        {d.nationalId && (
                          <div className="font-mono text-[10px] text-zinc-500">
                            ID: {d.nationalId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        <div className="font-mono text-[11px]">
                          {d.licenseNumber ?? "—"}
                        </div>
                        {d.pdpStatus && (
                          <div className="text-[10px]">
                            PDP:{" "}
                            <span
                              className={
                                d.pdpStatus === "Valid"
                                  ? "text-emerald-400"
                                  : d.pdpStatus === "Expired"
                                    ? "text-rose-400"
                                    : "text-amber-400"
                              }
                            >
                              {d.pdpStatus}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {d.assignedVehicleReg ? (
                          <span className="font-mono text-[11px] font-bold text-white">
                            {d.assignedVehicleReg}
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <HealthChips signals={signals} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            STATUS_COLORS[d.status] ??
                            "bg-white/[0.06] text-zinc-400 border border-white/[0.08]"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DriverActionsMenu
                          driver={d}
                          onEdit={() => setEditingDriver(d)}
                          onDeactivate={() => handleDeactivate(d)}
                          onResetPassword={() => handleResetPassword(d)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <DriverFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingDriver && (
        <DriverFormModal
          mode="edit"
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSubmit={async (input) => {
            const ok = await handleUpdate(editingDriver.id, input);
            return { success: ok };
          }}
        />
      )}

      {credentials && (
        <DriverCredentialsDialog
          fullName={credentials.fullName}
          username={credentials.username}
          password={credentials.password}
          isReset={credentials.isReset}
          onClose={() => setCredentials(null)}
        />
      )}
    </div>
  );
}
