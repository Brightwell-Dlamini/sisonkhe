/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { ResolvedUser } from "../auth/roles";
import { isNationalScope } from "../auth/permissions";
import { matchesRegion } from "../auth/region";
import {
  daysUntil,
  expirySeverity,
  formatDaysUntil,
  rankScore,
  WINDOWS,
} from "./rules";
import type {
  IntelligenceKpis,
  IntelligenceSnapshot,
  RiskSignal,
  WorkItem,
} from "./types";
import { DeepLink } from "./deepLinks";

function emptyKpis(): IntelligenceKpis {
  return {
    vehiclesTotal: 0,
    driversTotal: 0,
    operatorsTotal: 0,
    permitsExpired: 0,
    permitsExpiring30d: 0,
    cofExpired: 0,
    cofExpiring30d: 0,
    renewalsPending: 0,
    printQueueOpen: 0,
    driversUnassigned: 0,
    vehiclesUnassigned: 0,
    driversSuspended: 0,
    masterCardsFrozen: 0,
  };
}

function buildBriefing(kpis: IntelligenceKpis, queueLen: number): string {
  const crises: string[] = [];
  if (kpis.permitsExpired > 0)
    crises.push(`${kpis.permitsExpired} expired permit${kpis.permitsExpired === 1 ? "" : "s"}`);
  if (kpis.cofExpired > 0)
    crises.push(`${kpis.cofExpired} expired COF${kpis.cofExpired === 1 ? "" : "s"}`);
  if (kpis.renewalsPending > 0)
    crises.push(`${kpis.renewalsPending} renewal${kpis.renewalsPending === 1 ? "" : "s"} waiting`);
  if (kpis.printQueueOpen > 0) crises.push(`${kpis.printQueueOpen} ready to print`);
  if (crises.length === 0 && queueLen === 0)
    return "All clear within the 30-day horizon. Registry is quiet — use the time for audits and roster hygiene.";
  if (crises.length === 0)
    return `${queueLen} item${queueLen === 1 ? "" : "s"} need attention before they become blockers.`;
  return `Focus now: ${crises.slice(0, 3).join(" · ")}.`;
}

function pickPrimary(
  queue: WorkItem[],
  kpis: IntelligenceKpis
): IntelligenceSnapshot["primaryAction"] {
  if (queue.length === 0) return null;
  const top = queue[0];
  if (kpis.renewalsPending > 0 && top.kind === "renewal_pending") {
    return {
      label: `Review ${kpis.renewalsPending} renewal${kpis.renewalsPending === 1 ? "" : "s"}`,
      href: DeepLink.permitsPending,
      reason: "Approvals unblock print and keep vehicles legal on the rank.",
    };
  }
  if (top.kind === "permit_expired" || top.kind === "cof_expired") {
    return { label: "Clear expired compliance", href: top.href, reason: top.detail };
  }
  if (kpis.printQueueOpen > 0) {
    return {
      label: `Print ${kpis.printQueueOpen} permit${kpis.printQueueOpen === 1 ? "" : "s"}`,
      href: DeepLink.permitsPrint,
      reason: "Approved renewals are waiting on paper with signed QR.",
    };
  }
  return { label: top.title, href: top.href, reason: top.detail };
}

export async function buildIntelligenceSnapshot(
  user: ResolvedUser
): Promise<IntelligenceSnapshot> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const national = isNationalScope(user);
  const regionScope = national ? null : (user.region ?? null);
  if (!national && !regionScope) throw new Error("REGION_REQUIRED");

  const kpis = emptyKpis();
  const queue: WorkItem[] = [];
  const risks: RiskSignal[] = [];

  const [vehiclesRes, driversRes, operatorsCountRes, renewalsRes, masterCardsRes, routesRes] =
    await Promise.all([
      admin
        .from("vehicles")
        .select(
          "registration_number, vic, make, model, owner_name, permit_number, permit_status, permit_expiry_date, cof_number, cof_expiry_date, driver_id, status, roadworthiness_expiry, insurance_expiry, route_assignment_id"
        )
        .limit(5000),
      admin
        .from("drivers")
        .select(
          "id, full_name, status, assigned_vehicle_reg, pdp_expiry_date, pdp_status, license_number, region"
        )
        .limit(5000),
      admin.from("fleet_operators").select("*", { count: "exact", head: true }),
      admin
        .from("permit_renewal_requests")
        .select("id, vehicle_reg, operator, status, request_date, current_expiry_date, region")
        .eq("status", "Pending Admin Approval")
        .order("request_date", { ascending: true })
        .limit(200),
      admin.from("operator_master_cards").select("id, operator_id, status").eq("status", "Frozen").limit(200),
      admin.from("routes").select("id, region_code").limit(2000),
    ]);

  const routeRegion = new Map<string, string>();
  for (const r of routesRes.data ?? []) {
    if (r.id && r.region_code) routeRegion.set(String(r.id), String(r.region_code));
  }

  let vehicles = vehiclesRes.data ?? [];
  let drivers = driversRes.data ?? [];
  let renewals = renewalsRes.data ?? [];
  const frozenCards = masterCardsRes.data ?? [];

  if (regionScope) {
    vehicles = vehicles.filter((v) => {
      const rid = v.route_assignment_id ? routeRegion.get(String(v.route_assignment_id)) : null;
      return matchesRegion(regionScope, rid);
    });
    drivers = drivers.filter((d) => matchesRegion(regionScope, d.region as string | null));
    renewals = renewals.filter(
      (r) => matchesRegion(regionScope, r.region as string | null) || !r.region
    );
  }

  kpis.vehiclesTotal = vehicles.length;
  kpis.driversTotal = drivers.length;
  kpis.operatorsTotal = operatorsCountRes.count ?? 0;
  kpis.renewalsPending = renewals.length;
  kpis.masterCardsFrozen = national ? frozenCards.length : 0;

  try {
    const { count: approvedReady } = await admin
      .from("permit_renewal_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Approved");
    kpis.printQueueOpen = Math.min(approvedReady ?? 0, 50);
  } catch {
    kpis.printQueueOpen = 0;
  }

  for (const v of vehicles) {
    const reg = (v.registration_number as string) || "UNKNOWN";
    const label = v.vic ? `${reg} (${v.vic})` : reg;
    const owner = (v.owner_name as string) || "Unknown owner";
    const permitDays = daysUntil(v.permit_expiry_date as string | null, now);
    const cofDays = daysUntil(v.cof_expiry_date as string | null, now);

    if (permitDays !== null && permitDays < 0) {
      kpis.permitsExpired += 1;
      queue.push({
        id: `permit-expired-${reg}`,
        kind: "permit_expired",
        severity: "critical",
        score: rankScore("permit_expired", permitDays),
        title: `Expired permit — ${reg}`,
        detail: `${owner} · ${formatDaysUntil(permitDays)} · #${v.permit_number ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        entityLabel: label,
        href: DeepLink.permitsExpired,
        dueAt: v.permit_expiry_date as string,
        daysUntil: permitDays,
        meta: { owner },
      });
    } else if (permitDays !== null && permitDays <= WINDOWS.horizonDays) {
      kpis.permitsExpiring30d += 1;
      queue.push({
        id: `permit-expiring-${reg}`,
        kind: "permit_expiring",
        severity: expirySeverity(permitDays),
        score: rankScore("permit_expiring", permitDays),
        title: `Permit ${formatDaysUntil(permitDays)} — ${reg}`,
        detail: `${owner} · #${v.permit_number ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        entityLabel: label,
        href: DeepLink.permitsExpiring,
        dueAt: v.permit_expiry_date as string,
        daysUntil: permitDays,
        meta: { owner },
      });
    }

    if (cofDays !== null && cofDays < 0) {
      kpis.cofExpired += 1;
      queue.push({
        id: `cof-expired-${reg}`,
        kind: "cof_expired",
        severity: "critical",
        score: rankScore("cof_expired", cofDays),
        title: `Expired COF — ${reg}`,
        detail: `${owner} · ${formatDaysUntil(cofDays)} · #${v.cof_number ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        entityLabel: label,
        href: DeepLink.vehiclesCofExpired,
        dueAt: v.cof_expiry_date as string,
        daysUntil: cofDays,
      });
    } else if (cofDays !== null && cofDays <= WINDOWS.horizonDays) {
      kpis.cofExpiring30d += 1;
      queue.push({
        id: `cof-expiring-${reg}`,
        kind: "cof_expiring",
        severity: expirySeverity(cofDays),
        score: rankScore("cof_expiring", cofDays),
        title: `COF ${formatDaysUntil(cofDays)} — ${reg}`,
        detail: `${owner} · #${v.cof_number ?? "—"}`,
        entityType: "vehicle",
        entityId: reg,
        entityLabel: label,
        href: DeepLink.vehiclesCofExpiring,
        dueAt: v.cof_expiry_date as string,
        daysUntil: cofDays,
      });
    }

    const hasDriver =
      v.driver_id != null && String(v.driver_id).trim() !== "" && String(v.driver_id) !== "null";
    if (!hasDriver) kpis.vehiclesUnassigned += 1;
  }

  for (const v of vehicles
    .filter(
      (v) => !v.driver_id || String(v.driver_id).trim() === "" || String(v.driver_id) === "null"
    )
    .slice(0, 15)) {
    const reg = v.registration_number as string;
    queue.push({
      id: `veh-unassigned-${reg}`,
      kind: "unassigned_vehicle",
      severity: "medium",
      score: rankScore("unassigned_vehicle"),
      title: `No driver on ${reg}`,
      detail: `${v.owner_name ?? "Owner unknown"} · cannot legally load without assignment`,
      entityType: "vehicle",
      entityId: reg,
      entityLabel: reg,
      href: DeepLink.vehiclesUnassigned,
    });
  }

  for (const d of drivers) {
    const id = d.id as string;
    const name = (d.full_name as string) || "Driver";
    const status = (d.status as string) || "Active";
    const assigned = (d.assigned_vehicle_reg as string | null) || null;

    if (status === "Suspended") {
      kpis.driversSuspended += 1;
      queue.push({
        id: `driver-suspended-${id}`,
        kind: "suspended_driver",
        severity: "high",
        score: rankScore("suspended_driver"),
        title: `Suspended — ${name}`,
        detail: assigned ? `Released from ${assigned}` : "No vehicle linked",
        entityType: "driver",
        entityId: id,
        entityLabel: name,
        href: DeepLink.driversSuspended,
      });
    }

    if (!assigned || assigned.trim() === "") kpis.driversUnassigned += 1;

    const pdpDays = daysUntil(d.pdp_expiry_date as string | null, now);
    if (pdpDays !== null && pdpDays < 0) {
      queue.push({
        id: `pdp-expired-${id}`,
        kind: "pdp_expired",
        severity: "critical",
        score: rankScore("pdp_expired", pdpDays),
        title: `Expired PDP — ${name}`,
        detail: formatDaysUntil(pdpDays),
        entityType: "driver",
        entityId: id,
        entityLabel: name,
        href: DeepLink.driversPdpExpired,
        dueAt: d.pdp_expiry_date as string,
        daysUntil: pdpDays,
      });
    } else if (pdpDays !== null && pdpDays <= WINDOWS.horizonDays) {
      queue.push({
        id: `pdp-expiring-${id}`,
        kind: "pdp_expiring",
        severity: expirySeverity(pdpDays),
        score: rankScore("pdp_expiring", pdpDays),
        title: `PDP ${formatDaysUntil(pdpDays)} — ${name}`,
        detail: assigned ? `Vehicle ${assigned}` : "Unassigned",
        entityType: "driver",
        entityId: id,
        entityLabel: name,
        href: DeepLink.driversUnassigned,
        dueAt: d.pdp_expiry_date as string,
        daysUntil: pdpDays,
      });
    }
  }

  const unassignedDrivers = drivers.filter(
    (d) => !d.assigned_vehicle_reg || String(d.assigned_vehicle_reg).trim() === ""
  );
  if (unassignedDrivers.length > 5) {
    queue.push({
      id: "drivers-unassigned-summary",
      kind: "unassigned_driver",
      severity: "medium",
      score: rankScore("unassigned_driver") + Math.min(unassignedDrivers.length, 40),
      title: `${unassignedDrivers.length} drivers without vehicles`,
      detail: "Assignment gaps reduce rank throughput and break roster integrity",
      entityType: "driver",
      entityId: "batch",
      entityLabel: "Unassigned drivers",
      href: DeepLink.driversUnassigned,
    });
  }

  for (const r of renewals) {
    const id = r.id as string;
    const reg = (r.vehicle_reg as string) || "—";
    const ageDays = daysUntil(r.request_date as string | null, now);
    const waitingDays = ageDays === null ? null : ageDays > 0 ? 0 : Math.abs(ageDays);
    queue.push({
      id: `renewal-${id}`,
      kind: "renewal_pending",
      severity: waitingDays !== null && waitingDays >= 3 ? "high" : "medium",
      score: rankScore("renewal_pending", waitingDays !== null ? -waitingDays : null),
      title: `Renewal pending — ${reg}`,
      detail: `${r.operator ?? "Operator"} · requested ${r.request_date ?? "—"}`,
      entityType: "renewal",
      entityId: id,
      entityLabel: reg,
      href: DeepLink.permitsPending,
      dueAt: r.current_expiry_date as string | null,
      daysUntil: daysUntil(r.current_expiry_date as string | null, now),
      meta: { operator: (r.operator as string) ?? "" },
    });
  }

  if (national) {
    for (const c of frozenCards.slice(0, 20)) {
      const opId = String(c.operator_id ?? c.id);
      queue.push({
        id: `mcard-frozen-${c.id}`,
        kind: "frozen_master_card",
        severity: "high",
        score: rankScore("frozen_master_card"),
        title: `Frozen Master Card — ${opId}`,
        detail: "Disbursements and renewal payments blocked",
        entityType: "operator",
        entityId: opId,
        entityLabel: opId,
        href: DeepLink.operatorsFrozen,
      });
    }
  }

  if (kpis.printQueueOpen > 0) {
    queue.push({
      id: "print-backlog",
      kind: "print_backlog",
      severity: kpis.printQueueOpen >= 10 ? "high" : "medium",
      score: rankScore("print_backlog") + kpis.printQueueOpen,
      title: `${kpis.printQueueOpen} approved permit${kpis.printQueueOpen === 1 ? "" : "s"} may need print`,
      detail: "Open the print queue and clear A4 + signed QR for the rank",
      entityType: "print",
      entityId: "queue",
      entityLabel: "Print queue",
      href: DeepLink.permitsPrint,
    });
  }

  queue.sort((a, b) => b.score - a.score);
  const trimmed = queue.slice(0, 40);

  const pushRisk = (
    id: string,
    label: string,
    value: number,
    severity: RiskSignal["severity"],
    detail: string,
    href?: string
  ) => {
    if (value <= 0) return;
    risks.push({ id, label, value, severity, detail, href });
  };

  pushRisk("risk-permit-expired", "Expired permits", kpis.permitsExpired, "critical", "Permit exposure", DeepLink.permitsExpired);
  pushRisk("risk-cof-expired", "Expired COF", kpis.cofExpired, "critical", "Roadworthiness liability", DeepLink.vehiclesCofExpired);
  pushRisk("risk-permit-window", "Permits ≤30 days", kpis.permitsExpiring30d, kpis.permitsExpiring30d > 10 ? "high" : "medium", "Renewal pipeline", DeepLink.permitsExpiring);
  pushRisk("risk-renewals", "Pending renewals", kpis.renewalsPending, kpis.renewalsPending > 5 ? "high" : "medium", "Approval queue", DeepLink.permitsPending);
  pushRisk("risk-unassigned-veh", "Vehicles without drivers", kpis.vehiclesUnassigned, kpis.vehiclesUnassigned > 10 ? "high" : "medium", "Assignment gaps", DeepLink.vehiclesUnassigned);
  pushRisk("risk-suspended", "Suspended drivers", kpis.driversSuspended, "high", "Confirm still intended", DeepLink.driversSuspended);
  if (national) {
    pushRisk("risk-frozen-cards", "Frozen Master Cards", kpis.masterCardsFrozen, "high", "Money movement halted", DeepLink.operatorsFrozen);
  }

  risks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity] || b.value - a.value;
  });

  return {
    generatedAt: now.toISOString(),
    scope: national ? "national" : "region",
    region: regionScope,
    kpis,
    queue: trimmed,
    risks,
    briefing: buildBriefing(kpis, trimmed.length),
    primaryAction: pickPrimary(trimmed, kpis),
  };
}
