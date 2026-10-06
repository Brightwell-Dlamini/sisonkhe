"use client";

import { useMemo, useState } from "react";
import { Modal, Button, Input, Select, useToast } from "@/components/ui";
import type { Vehicle, Route, Driver } from "@/types";
import type { CreateVehicleRequest } from "@/hooks/useVehicleRegistry";
import {
  filterAssignableDrivers,
  driverOptionLabel,
  driverAssignableToVehicle,
} from "@/lib/domain/eligibility";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    input: CreateVehicleRequest
  ) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
  editingVehicle?: Vehicle | null;
  routes: Route[];
  drivers: Driver[];
  associations: string[];
}

export default function VehicleFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingVehicle,
  routes,
  drivers,
}: Props) {
  const isEditing = !!editingVehicle;
  const toast = useToast();

  const [form, setForm] = useState<CreateVehicleRequest>({
    registrationNumber: editingVehicle?.registrationNumber ?? "",
    vic: editingVehicle?.vic ?? "",
    make: editingVehicle?.make ?? "",
    model: editingVehicle?.model ?? "",
    seatingCapacity: editingVehicle?.seatingCapacity ?? 15,
    classification: editingVehicle?.classification ?? "kombi",
    routeAssignmentId: editingVehicle?.routeAssignmentId ?? "",
    loadingBay: editingVehicle?.loadingBay ?? "Bay 01",
    ownerName: editingVehicle?.ownerName ?? "",
    ownerPhone: editingVehicle?.ownerPhone ?? "",
    ownerOperatorId: (editingVehicle as { ownerOperatorId?: string })?.ownerOperatorId ?? "",
    driverId: editingVehicle?.driverId ?? "",
    permitNumber: editingVehicle?.permitNumber ?? "",
    permitStatus: editingVehicle?.permitStatus ?? "Active",
    permitIssueDate: editingVehicle?.permitIssueDate ?? "",
    permitExpiryDate: editingVehicle?.permitExpiryDate ?? "",
    cofNumber: editingVehicle?.cofNumber ?? "",
    cofIssueDate: editingVehicle?.cofIssueDate ?? "",
    cofExpiryDate: editingVehicle?.cofExpiryDate ?? "",
    lastInspectionDate: editingVehicle?.lastInspectionDate ?? "",
    association: editingVehicle?.association ?? "",
    insuranceExpiry: editingVehicle?.insuranceExpiry ?? "",
    roadworthinessExpiry: editingVehicle?.roadworthinessExpiry ?? "",
    isMidMonthAddition: editingVehicle?.isMidMonthAddition ?? false,
    monthRegistered: editingVehicle?.monthRegistered ?? "",
    midMonthJoinDay: editingVehicle?.midMonthJoinDay ?? undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const eligibleDrivers = useMemo(() => {
    const mapped = drivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      status: d.status ?? "Active",
      assignedVehicleReg: d.assignedVehicleReg ?? null,
      pdpStatus: (d as { pdpStatus?: string }).pdpStatus ?? null,
      pdpExpiryDate: (d as { pdpExpiryDate?: string }).pdpExpiryDate ?? null,
    }));
    return filterAssignableDrivers(
      mapped,
      form.registrationNumber || editingVehicle?.registrationNumber,
      form.driverId || editingVehicle?.driverId
    );
  }, [drivers, form.registrationNumber, form.driverId, editingVehicle]);

  const driverHint = useMemo(() => {
    if (!form.driverId) return null;
    const d = drivers.find((x) => x.id === form.driverId);
    if (!d) return null;
    const r = driverAssignableToVehicle(
      {
        id: d.id,
        fullName: d.fullName,
        status: d.status,
        assignedVehicleReg: d.assignedVehicleReg,
        pdpStatus: (d as { pdpStatus?: string }).pdpStatus,
        pdpExpiryDate: (d as { pdpExpiryDate?: string }).pdpExpiryDate,
      },
      form.registrationNumber || editingVehicle?.registrationNumber
    );
    return r.warning || (!r.eligible ? r.reason : null);
  }, [form.driverId, form.registrationNumber, drivers, editingVehicle]);

  const update = <K extends keyof CreateVehicleRequest>(
    key: K,
    value: CreateVehicleRequest[K]
  ) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    if (form.driverId) {
      const d = drivers.find((x) => x.id === form.driverId);
      if (d) {
        const check = driverAssignableToVehicle(
          {
            id: d.id,
            fullName: d.fullName,
            status: d.status,
            assignedVehicleReg: d.assignedVehicleReg,
            pdpStatus: (d as { pdpStatus?: string }).pdpStatus,
            pdpExpiryDate: (d as { pdpExpiryDate?: string }).pdpExpiryDate,
          },
          form.registrationNumber || editingVehicle?.registrationNumber
        );
        const sameVehicle =
          d.assignedVehicleReg &&
          form.registrationNumber &&
          d.assignedVehicleReg.replace(/\s+/g, " ").toUpperCase() ===
            form.registrationNumber.replace(/\s+/g, " ").toUpperCase();
        if (!check.eligible && !sameVehicle && d.id !== editingVehicle?.driverId) {
          setSubmitting(false);
          toast.error(check.reason ?? "Driver not eligible");
          return;
        }
      }
    }

    const res = await onSubmit(form);
    setSubmitting(false);

    if (!res.success) {
      if (res.issues) setErrors(res.issues);
      toast.error(res.error ?? "Save failed");
      return;
    }
    onClose();
  };

  // Edit = linking only (self-register already collected particulars)
  if (isEditing) {
    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Link vehicle"
        description="Route, driver, and owner. Registration data came from the portal."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              form="vehicle-form"
              type="submit"
            >
              Save links
            </Button>
          </>
        }
      >
        <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs">
            <div className="font-mono font-bold text-white">
              {editingVehicle.registrationNumber}
            </div>
            <div className="text-zinc-500 mt-0.5">
              {[editingVehicle.make, editingVehicle.model]
                .filter(Boolean)
                .join(" ")}
              {editingVehicle.vic ? ` · VIC ${editingVehicle.vic}` : ""}
            </div>
          </div>

          <Section title="Links">
            <div className="grid grid-cols-1 gap-3">
              <Field label="Corridor / Route">
                <Select
                  value={form.routeAssignmentId}
                  onChange={(e) => update("routeAssignmentId", e.target.value)}
                >
                  <option value="">— Select route —</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.origin} to {r.destination}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assigned Driver">
                <Select
                  value={form.driverId}
                  onChange={(e) => update("driverId", e.target.value)}
                >
                  <option value="">— No driver —</option>
                  {eligibleDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {driverOptionLabel(d)}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Only free, eligible drivers. {eligibleDrivers.length} of{" "}
                  {drivers.length} shown.
                </p>
                {driverHint && (
                  <p className="mt-1 text-[10px] text-amber-400 font-medium">
                    {driverHint}
                  </p>
                )}
              </Field>
              <Field label="Owner / operator name">
                <Input
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  placeholder="Fleet owner display name"
                />
              </Field>
              <Field label="Owner phone">
                <Input
                  value={form.ownerPhone}
                  onChange={(e) => update("ownerPhone", e.target.value)}
                  className="font-mono"
                  placeholder="+268 …"
                />
              </Field>
              <Field label="Loading bay">
                <Input
                  value={form.loadingBay}
                  onChange={(e) => update("loadingBay", e.target.value)}
                  className="font-mono"
                  placeholder="Bay 01"
                />
              </Field>
            </div>
          </Section>
        </form>
      </Modal>
    );
  }

  // Create remains available for rare admin-only registration
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Register Vehicle"
      description="Prefer /register/vehicle for operators. This form is for staff-only exceptions."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            form="vehicle-form"
            type="submit"
          >
            Register Vehicle
          </Button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-5">
        <Section title="Identification">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Registration *" error={errors.registrationNumber?.[0]}>
              <Input
                required
                value={form.registrationNumber}
                onChange={(e) =>
                  update("registrationNumber", e.target.value.toUpperCase())
                }
                placeholder="HSD 101 BM"
                className="font-mono"
              />
            </Field>
            <Field label="Make *">
              <Input
                required
                value={form.make}
                onChange={(e) => update("make", e.target.value)}
              />
            </Field>
            <Field label="Model *">
              <Input
                required
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
              />
            </Field>
          </div>
        </Section>
        <Section title="Assignment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Route">
              <Select
                value={form.routeAssignmentId}
                onChange={(e) => update("routeAssignmentId", e.target.value)}
              >
                <option value="">— Select route —</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.origin} to {r.destination}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Driver">
              <Select
                value={form.driverId}
                onChange={(e) => update("driverId", e.target.value)}
              >
                <option value="">— No driver —</option>
                {eligibleDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {driverOptionLabel(d)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>
      </form>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[10px] text-rose-400 font-medium">{error}</p>
      )}
    </div>
  );
}
