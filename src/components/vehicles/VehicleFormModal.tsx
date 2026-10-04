"use client";

import { useState } from "react";
import { Modal, Button, Input, Textarea, Select, Checkbox, useToast } from "@/components/ui";
import type { Vehicle, Route, Driver } from "@/types";
import type { CreateVehicleRequest } from "@/hooks/useVehicleRegistry";

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
  associations,
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
    ownerOperatorId: "",
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

  const update = <K extends keyof CreateVehicleRequest>(
    key: K,
    value: CreateVehicleRequest[K]
  ) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const res = await onSubmit(form);
    setSubmitting(false);

    if (!res.success) {
      if (res.issues) setErrors(res.issues);
      toast.error(res.error ?? "Save failed");
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Vehicle" : "Register Vehicle"}
      description={
        isEditing
          ? "Update vehicle particulars and assignments."
          : "A Virtual Transit Card will be issued automatically with the registration fee recorded."
      }
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
            {isEditing ? "Save Changes" : "Register Vehicle"}
          </Button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Identification */}
        <Section title="Identification">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Registration Number *" error={errors.registrationNumber?.[0]}>
              <Input
                required
                value={form.registrationNumber}
                onChange={(e) =>
                  update("registrationNumber", e.target.value.toUpperCase())
                }
                disabled={isEditing}
                placeholder="HSD 101 BM"
                className="font-mono"
              />
            </Field>

            <Field label="FLEET-VIC" error={errors.vic?.[0]}>
              <Input
                value={form.vic ?? ""}
                onChange={(e) => update("vic", e.target.value.toUpperCase())}
                placeholder="Auto-generated"
                className="font-mono"
              />
            </Field>

            <Field label="Classification *">
              <Select
                value={form.classification}
                onChange={(e) => update("classification", e.target.value)}
              >
                <option value="kombi">Kombi</option>
                <option value="midbus">Midibus</option>
                <option value="bus">Bus</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="Make *" error={errors.make?.[0]}>
              <Input
                required
                value={form.make}
                onChange={(e) => update("make", e.target.value)}
                placeholder="Toyota"
              />
            </Field>
            <Field label="Model *" error={errors.model?.[0]}>
              <Input
                required
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="Quantum"
              />
            </Field>
            <Field label="Seats *" error={errors.seatingCapacity?.[0]}>
              <Input
                type="number"
                required
                min={1}
                max={120}
                value={form.seatingCapacity}
                onChange={(e) =>
                  update("seatingCapacity", Number(e.target.value) || 0)
                }
                className="font-mono"
              />
            </Field>
            <Field label="Loading Bay">
              <Input
                value={form.loadingBay}
                onChange={(e) => update("loadingBay", e.target.value)}
                placeholder="Bay 01"
                className="font-mono"
              />
            </Field>
          </div>
        </Section>

        {/* Assignment */}
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
                    {r.origin} → {r.destination}
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
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        {/* Ownership */}
        <Section title="Ownership">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Owner Name">
              <Input
                value={form.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
                placeholder="e.g. Cyril Kunene"
              />
            </Field>
            <Field label="Owner Phone">
              <Input
                value={form.ownerPhone}
                onChange={(e) => update("ownerPhone", e.target.value)}
                placeholder="+268 7600 0000"
                className="font-mono"
              />
            </Field>
            <Field label="Association" className="sm:col-span-2">
              <Input
                value={form.association}
                onChange={(e) => update("association", e.target.value)}
                placeholder="Transport Association"
              />
            </Field>
          </div>
        </Section>

        {/* Permit */}
        <Section title="Permit & Compliance">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="Permit #">
              <Input
                value={form.permitNumber}
                onChange={(e) => update("permitNumber", e.target.value)}
                placeholder="G1090/2026"
                className="font-mono"
              />
            </Field>
            <Field label="Permit Status">
              <Select
                value={form.permitStatus}
                onChange={(e) => update("permitStatus", e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </Select>
            </Field>
            <Field label="Issue">
              <Input
                type="date"
                value={form.permitIssueDate ?? ""}
                onChange={(e) => update("permitIssueDate", e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Expiry">
              <Input
                type="date"
                value={form.permitExpiryDate ?? ""}
                onChange={(e) => update("permitExpiryDate", e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="COF #">
              <Input
                value={form.cofNumber}
                onChange={(e) => update("cofNumber", e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="COF Expiry">
              <Input
                type="date"
                value={form.cofExpiryDate ?? ""}
                onChange={(e) => update("cofExpiryDate", e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Insurance Expiry">
              <Input
                type="date"
                value={form.insuranceExpiry ?? ""}
                onChange={(e) => update("insuranceExpiry", e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Roadworthy Expiry">
              <Input
                type="date"
                value={form.roadworthinessExpiry ?? ""}
                onChange={(e) => update("roadworthinessExpiry", e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>
        </Section>

        {/* Mid-month */}
        <Section title="Queue Rotation">
          <Checkbox
            checked={!!form.isMidMonthAddition}
            onChange={(v) => update("isMidMonthAddition", v)}
            label="Added mid-month (tail-lock)"
            description="Vehicle will be pinned to the tail of the queue for the remainder of this 30-day cycle."
          />

          {form.isMidMonthAddition && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Month Registered">
                <Input
                  value={form.monthRegistered}
                  onChange={(e) => update("monthRegistered", e.target.value)}
                  placeholder="2026-09"
                  className="font-mono"
                />
              </Field>
              <Field label="Join Day">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.midMonthJoinDay ?? ""}
                  onChange={(e) =>
                    update(
                      "midMonthJoinDay",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="font-mono"
                />
              </Field>
            </div>
          )}
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
