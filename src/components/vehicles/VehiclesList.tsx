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
} from "lucide-react";
import { useVehicleRegistry, type CreateVehicleRequest } from "@/hooks/useVehicleRegistry";
import type { VehicleRow } from "@/lib/vehicles/queries";
import VehicleFormModal from "./VehicleFormModal";
import VehicleActionsMenu from "./VehicleActionsMenu";

const CLASSIFICATION_LABEL: Record<string, string> = {
  kombi: "Kombi",
  midbus: "Midibus",
  bus: "Bus",
};

const PERMIT_COLORS: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Expired: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  Suspended: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
};

export default function VehiclesList() {
  const {
    vehicles,
    loading,
    error,
    refresh,
    createVehicle,
    updateVehicle,
    deactivateVehicle,
  } = useVehicleRegistry();

  const [searchQuery, setSearchQuery] = useState("");
  const [permitFilter, setPermitFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (permitFilter !== "all" && (v.permitStatus ?? "") !== permitFilter) return false;
      if (classFilter !== "all" && v.classification !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.registrationNumber.toLowerCase().includes(q) ||
          (v.vic ?? "").toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.ownerName ?? "").toLowerCase().includes(q) ||
          (v.permitNumber ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vehicles, permitFilter, classFilter, searchQuery]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreate = async (input: CreateVehicleRequest) => {
    const result = await createVehicle(input);
    if (result.success) {
      showToast(
        `Registered ${result.registrationNumber} (VIC ${result.vic}). Virtual card issued.`
      );
      setShowCreateModal(false);
      return { success: true };
    }
    return {
      success: false,
      error: result.error,
      issues: result.issues,
    };
  };

  const handleUpdate = async (
    reg: string,
    input: Partial<CreateVehicleRequest>
  ) => {
    const ok = await updateVehicle(reg, input);
    if (ok) {
      showToast("Vehicle updated");
      setEditingVehicle(null);
    }
    return ok;
  };

  const handleDeactivate = async (v: VehicleRow) => {
    const ok = await deactivateVehicle(v.registrationNumber);
    if (ok) showToast(`Deactivated ${v.registrationNumber}`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 min-w-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by plate, VIC, make, model, permit…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            <option value="all">All Types</option>
            <option value="kombi">Kombi</option>
            <option value="midbus">Midibus</option>
            <option value="bus">Bus</option>
          </select>
          <select
            value={permitFilter}
            onChange={(e) => setPermitFilter(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300"
          >
            <option value="all">All Permits</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
            <option value="Suspended">Suspended</option>
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
            Register Vehicle
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

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {loading && vehicles.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              {vehicles.length === 0
                ? "No vehicles registered yet"
                : "No matching vehicles"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {vehicles.length === 0
                ? "Click 'Register Vehicle' to add the first one."
                : "Try a different search or filter."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">VIC</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Permit</th>
                  <th className="px-4 py-3">Bay</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.registrationNumber}
                    className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-zinc-900 dark:text-white">
                        {v.registrationNumber}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {v.make} {v.model} • {v.seatingCapacity} seats
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                      {v.vic ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {v.driverName ?? (
                        <span className="italic text-zinc-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                        {v.permitNumber ?? "—"}
                      </div>
                      {v.permitStatus && (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${PERMIT_COLORS[v.permitStatus] ?? ""}`}
                        >
                          {v.permitStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {v.loadingBay ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-[11px]">
                      {CLASSIFICATION_LABEL[v.classification] ?? v.classification}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VehicleActionsMenu
                        vehicle={v}
                        onEdit={() => setEditingVehicle(v)}
                        onDeactivate={() => handleDeactivate(v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <VehicleFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {editingVehicle && (
        <VehicleFormModal
          mode="edit"
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSubmit={async (input) => {
            const ok = await handleUpdate(editingVehicle.registrationNumber, input);
            return { success: ok };
          }}
        />
      )}
    </div>
  );
}
