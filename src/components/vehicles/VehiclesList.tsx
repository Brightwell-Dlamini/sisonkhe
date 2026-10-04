"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Car,
  QrCode,
  Printer,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useVehicleRegistry, type CreateVehicleRequest } from "@/hooks/useVehicleRegistry";
import type { VehicleRow } from "@/lib/vehicles/queries";
import {
  Button,
  IconButton,
  Input,
  Select,
  Badge,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
  PageHeader,
  EmptyState,
  TableSkeleton,
  ConfirmDialog,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import VehicleFormModal from "./VehicleFormModal";
import OfficialPlaqueQRModal from "@/components/fleet/OfficialPlaqueQRModal";
import A4PermitPrintModal from "@/components/fleet/A4PermitPrintModal";
import { Vehicle, Route, Driver } from "@/types";

interface Props {
  routes?: Route[];
  drivers?: Driver[];
}

const CLASSIFICATION_LABEL: Record<string, string> = {
  kombi: "Kombi",
  midbus: "Midbus",
  bus: "Bus",
};

const PERMIT_TONE: Record<string, "success" | "danger" | "warning"> = {
  Active: "success",
  Expired: "danger",
  Suspended: "warning",
};

export default function VehiclesList({ routes = [], drivers = [] }: Props) {
  const {
    vehicles,
    loading,
    error,
    refresh,
    createVehicle,
    updateVehicle,
    deactivateVehicle,
  } = useVehicleRegistry();

  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [permitFilter, setPermitFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRow | null>(null);
  const [qrVehicle, setQrVehicle] = useState<Vehicle | null>(null);
  const [printVehicle, setPrintVehicle] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (permitFilter !== "all" && (v.permitStatus ?? "") !== permitFilter)
        return false;
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

  const toFullVehicle = (row: VehicleRow): Vehicle =>
    ({
      registrationNumber: row.registrationNumber,
      fleetNumber: row.vic ?? row.registrationNumber,
      vic: row.vic ?? undefined,
      make: row.make,
      model: row.model,
      seatingCapacity: row.seatingCapacity,
      classification: row.classification as Vehicle["classification"],
      routeAssignmentId: row.routeAssignmentId ?? "",
      loadingBay: row.loadingBay ?? "Bay 01",
      ownerName: row.ownerName ?? "",
      ownerPhone: row.ownerPhone ?? "",
      driverId: row.driverId ?? "",
      status: (row as any).status ?? "Waiting",
      currentQueuePosition: row.currentQueuePosition ?? 0,
      tripsToday: 0,
      lastActive: new Date().toISOString(),
      permitNumber: row.permitNumber ?? undefined,
      permitStatus: (row.permitStatus as Vehicle["permitStatus"]) ?? "Active",
      permitIssueDate: row.permitIssueDate ?? undefined,
      permitExpiryDate: row.permitExpiryDate ?? undefined,
      cofNumber: row.cofNumber ?? undefined,
      cofIssueDate: row.cofIssueDate ?? undefined,
      cofExpiryDate: row.cofExpiryDate ?? undefined,
      lastInspectionDate: row.lastInspectionDate ?? undefined,
      association: row.association ?? undefined,
      insuranceExpiry: row.insuranceExpiry ?? undefined,
      roadworthinessExpiry: row.roadworthinessExpiry ?? undefined,
      isMidMonthAddition: row.isMidMonthAddition,
      monthRegistered: row.monthRegistered ?? undefined,
      midMonthJoinDay: row.midMonthJoinDay ?? undefined,
    }) as Vehicle;

  const handleCreate = async (input: CreateVehicleRequest) => {
    const result = await createVehicle(input);
    if (result.success) {
      toast.success(
        "Vehicle registered",
        `${result.registrationNumber} · VIC ${result.vic}. Virtual card issued.`
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
      toast.success("Vehicle updated", reg);
      setEditingVehicle(null);
    } else {
      toast.error("Update failed", reg);
    }
    return ok;
  };

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    const ok = await deactivateVehicle(deleteTarget.registrationNumber);
    if (ok) {
      toast.success("Vehicle deactivated", deleteTarget.registrationNumber);
    } else {
      toast.error("Deactivate failed");
    }
    setDeleteTarget(null);
  };

  return (
    <div>
      <PageHeader
        title="Vehicle Registry"
        description="Register commercial vehicles, manage permits, fitness, and driver assignments."
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            leadingIcon={Plus}
          >
            Register Vehicle
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <Input
              leadingIcon={Search}
              placeholder="Search by plate, VIC, make, model, permit, or owner…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">All Types</option>
              <option value="kombi">Kombi</option>
              <option value="midbus">Midbus</option>
              <option value="bus">Bus</option>
            </Select>

            <Select
              value={permitFilter}
              onChange={(e) => setPermitFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">All Permits</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
            </Select>

            <IconButton
              icon={RefreshCw}
              label="Refresh"
              onClick={refresh}
              disabled={loading}
              className={loading ? "[&_svg]:animate-spin" : ""}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
          {error}
        </div>
      )}

      {loading && vehicles.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Car}
          title={
            vehicles.length === 0
              ? "No vehicles registered"
              : "No matching vehicles"
          }
          description={
            vehicles.length === 0
              ? "Register your first commercial vehicle to enable dispatch, permits, and tracking."
              : "Try adjusting your search or filters."
          }
          action={
            vehicles.length === 0 ? (
              <Button onClick={() => setShowCreateModal(true)} leadingIcon={Plus}>
                Register Vehicle
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <Th>Vehicle</Th>
              <Th>VIC</Th>
              <Th>Driver</Th>
              <Th>Permit</Th>
              <Th>Bay</Th>
              <Th>Type</Th>
              <Th align="right">Actions</Th>
            </TableHead>
            <TableBody>
              {filtered.map((v) => (
                <Tr key={v.registrationNumber}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono font-black text-white text-sm tracking-wider truncate">
                          {v.registrationNumber}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {v.make} {v.model} · {v.seatingCapacity} seats
                        </div>
                      </div>
                    </div>
                  </Td>

                  <Td>
                    {v.vic ? (
                      <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                        {v.vic}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </Td>

                  <Td>
                    {v.driverName ? (
                      <span className="text-zinc-300 text-xs truncate block max-w-[140px]">
                        {v.driverName}
                      </span>
                    ) : (
                      <span className="text-zinc-600 italic text-xs">
                        Unassigned
                      </span>
                    )}
                  </Td>

                  <Td>
                    <div className="space-y-1">
                      <div className="font-mono text-[11px] text-zinc-400">
                        {v.permitNumber ?? "—"}
                      </div>
                      {v.permitStatus && (
                        <Badge
                          variant={PERMIT_TONE[v.permitStatus] ?? "default"}
                          size="sm"
                        >
                          {v.permitStatus}
                        </Badge>
                      )}
                    </div>
                  </Td>

                  <Td>
                    <span className="font-mono text-[11px] text-zinc-300">
                      {v.loadingBay ?? "—"}
                    </span>
                  </Td>

                  <Td>
                    <span className="text-[11px] text-zinc-500">
                      {CLASSIFICATION_LABEL[v.classification] ?? v.classification}
                    </span>
                  </Td>

                  <Td align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconButton
                        icon={QrCode}
                        label="View QR plaque"
                        onClick={() => setQrVehicle(toFullVehicle(v))}
                        tone="emerald"
                      />
                      <IconButton
                        icon={Printer}
                        label="Print A4 permit"
                        onClick={() => setPrintVehicle(toFullVehicle(v))}
                      />
                      <IconButton
                        icon={Edit2}
                        label="Edit vehicle"
                        onClick={() => setEditingVehicle(v)}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Deactivate vehicle"
                        onClick={() => setDeleteTarget(v)}
                        tone="danger"
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      <VehicleFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        routes={routes}
        drivers={drivers}
        associations={[]}
      />

      <VehicleFormModal
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        onSubmit={async (input) => {
          if (!editingVehicle) return { success: false };
          const ok = await handleUpdate(editingVehicle.registrationNumber, input);
          return { success: ok };
        }}
        editingVehicle={
          editingVehicle
            ? (toFullVehicle(editingVehicle) as Vehicle)
            : null
        }
        routes={routes}
        drivers={drivers}
        associations={[]}
      />

      {qrVehicle && (
        <OfficialPlaqueQRModal
          vehicle={qrVehicle}
          vehicles={vehicles.map(toFullVehicle)}
          routes={routes}
          drivers={drivers}
          onClose={() => setQrVehicle(null)}
          onPrintA4={(v) => {
            setQrVehicle(null);
            setPrintVehicle(v);
          }}
        />
      )}

      {printVehicle && (
        <A4PermitPrintModal
          vehicle={printVehicle}
          routes={routes}
          drivers={drivers}
          onClose={() => setPrintVehicle(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Deactivate Vehicle?"
        description={
          deleteTarget
            ? `${deleteTarget.registrationNumber} will be marked Offline, removed from any active queue, and unassigned from its driver. Its history remains intact.`
            : ""
        }
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
