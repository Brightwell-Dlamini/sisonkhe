/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Actionable compliance work queue for staff — not just a digest report.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { daysUntil, formatDaysUntil, WINDOWS } from "@/lib/intelligence/rules";
import { DeepLink } from "@/lib/intelligence/deepLinks";

export type WorkItemKind =
  | "permit_expired"
  | "permit_expiring"
  | "cof_expired"
  | "cof_expiring"
  | "permit_suspended"
  | "no_driver"
  | "pdp_expired"
  | "pdp_expiring"
  | "print_pending";

export interface WorkItem {
  id: string;
  kind: WorkItemKind;
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  entityType: "vehicle" | "driver" | "renewal";
  entityId: string;
  href: string;
  daysUntil?: number | null;
}

export interface WorkQueueReport {
  generatedAt: string;
  items: WorkItem[];
  counts: Record<WorkItemKind, number>;
}

function emptyCounts(): Record<WorkItemKind, number> {
  return {
    permit_expired: 0,
    permit_expiring: 0,
    cof_expired: 0,
    cof_expiring: 0,
    permit_suspended: 0,
    no_driver: 0,
    pdp_expired: 0,
    pdp_expiring: 0,
    print_pending: 0,
  };
}

export async function buildComplianceWorkQueue(): Promise<WorkQueueReport> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const horizon = WINDOWS.horizonDays ?? 30;
  const items: WorkItem[] = [];
  const counts = emptyCounts();

  const { data: vehicles } = await admin
    .from("vehicles")
    .select(
      "registration_number, permit_number, permit_status, permit_expiry_date, cof_number, cof_expiry_date, driver_id, owner_name"
    )
    .limit(8000);

  for (const v of vehicles ?? []) {
    const reg = String(v.registration_number ?? "");
    if (!reg) continue;

    const status = String(v.permit_status ?? "");
    if (status === "Suspended") {
      items.push({
        id: `suspended-${reg}`,
        kind: "permit_suspended",
        severity: "critical",
        title: `Suspended — ${reg}`,
        detail: `Permit ${v.permit_number ?? "—"} is suspended`,
        entityType: "vehicle",
        entityId: reg,
        href: DeepLink.vehicleDetail(reg),
      });
      counts.permit_suspended += 1;
    }

    const permitDays = daysUntil(v.permit_expiry_date as string | null, now);
    if (permitDays !== null && permitDays < 0) {
      items.push({
        id: `permit-exp-${reg}`,
        kind: "permit_expired",
        severity: "critical",
        title: `Permit expired — ${reg}`,
        detail: `Expired ${formatDaysUntil(permitDays)} · #${v.permit_number ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        href: DeepLink.vehicleDetail(reg),
        daysUntil: permitDays,
      });
      counts.permit_expired += 1;
    } else if (permitDays !== null && permitDays <= horizon) {
      items.push({
        id: `permit-soon-${reg}`,
        kind: "permit_expiring",
        severity: permitDays <= 7 ? "high" : "medium",
        title: `Permit ${formatDaysUntil(permitDays)} — ${reg}`,
        detail: `Expires ${v.permit_expiry_date} · #${v.permit_number ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        href: DeepLink.vehicleDetail(reg),
        daysUntil: permitDays,
      });
      counts.permit_expiring += 1;
    }

    const cofDays = daysUntil(v.cof_expiry_date as string | null, now);
    if (cofDays !== null && cofDays < 0) {
      items.push({
        id: `cof-exp-${reg}`,
        kind: "cof_expired",
        severity: "critical",
        title: `COF expired — ${reg}`,
        detail: `COF ${v.cof_number ?? "—"} expired ${formatDaysUntil(cofDays)}`,
        entityType: "vehicle",
        entityId: reg,
        href: DeepLink.vehicleDetail(reg),
        daysUntil: cofDays,
      });
      counts.cof_expired += 1;
    } else if (cofDays !== null && cofDays <= horizon) {
      items.push({
        id: `cof-soon-${reg}`,
        kind: "cof_expiring",
        severity: cofDays <= 7 ? "high" : "medium",
        title: `COF ${formatDaysUntil(cofDays)} — ${reg}`,
        detail: `Expires ${v.cof_expiry_date}`,
        entityType: "vehicle",
        entityId: reg,
        href: DeepLink.vehicleDetail(reg),
        daysUntil: cofDays,
      });
      counts.cof_expiring += 1;
    }

    if (!v.driver_id) {
      items.push({
        id: `nodriver-${reg}`,
        kind: "no_driver",
        severity: "medium",
        title: `No driver — ${reg}`,
        detail: `Owner ${v.owner_name ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        href: DeepLink.vehicleDetail(reg),
      });
      counts.no_driver += 1;
    }
  }

  const { data: drivers } = await admin
    .from("drivers")
    .select("id, full_name, pdp_expiry_date, pdp_status, status")
    .limit(8000);

  for (const d of drivers ?? []) {
    const id = String(d.id ?? "");
    if (!id) continue;
    const pdpDays = daysUntil(d.pdp_expiry_date as string | null, now);
    if (pdpDays !== null && pdpDays < 0) {
      items.push({
        id: `pdp-exp-${id}`,
        kind: "pdp_expired",
        severity: "high",
        title: `PDP expired — ${d.full_name}`,
        detail: `Expired ${formatDaysUntil(pdpDays)}`,
        entityType: "driver",
        entityId: id,
        href: DeepLink.driverDetail(id),
        daysUntil: pdpDays,
      });
      counts.pdp_expired += 1;
    } else if (pdpDays !== null && pdpDays <= horizon) {
      items.push({
        id: `pdp-soon-${id}`,
        kind: "pdp_expiring",
        severity: pdpDays <= 7 ? "high" : "medium",
        title: `PDP ${formatDaysUntil(pdpDays)} — ${d.full_name}`,
        detail: `Expires ${d.pdp_expiry_date}`,
        entityType: "driver",
        entityId: id,
        href: DeepLink.driverDetail(id),
        daysUntil: pdpDays,
      });
      counts.pdp_expiring += 1;
    }
  }

  const { data: printPending } = await admin
    .from("permit_renewal_requests")
    .select("id, vehicle_reg, new_permit_number, approval_date")
    .eq("status", "Approved")
    .limit(500);

  for (const r of printPending ?? []) {
    const reg = String(r.vehicle_reg ?? "");
    items.push({
      id: `print-${r.id}`,
      kind: "print_pending",
      severity: "high",
      title: `Print pending — ${reg}`,
      detail: `Permit ${r.new_permit_number ?? "—"} approved ${r.approval_date ?? ""}`,
      entityType: "renewal",
      entityId: String(r.id),
      href: DeepLink.permitsPrint,
    });
    counts.print_pending += 1;
  }

  const severityOrder = { critical: 0, high: 1, medium: 2 } as const;
  items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    generatedAt: now.toISOString(),
    items: items.slice(0, 200),
    counts,
  };
}
