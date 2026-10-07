/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Proactive compliance digest.
 * Scans permits, COF, and PDP expiry windows and notifies operators + staff.
 * Designed to run daily via cron; safe to re-run (best-effort notifications).
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  notifyOperatorOfVehicle,
  notifyStaff,
  notifyDriverById,
} from "@/lib/notifications/service";
import { DeepLink } from "@/lib/intelligence/deepLinks";
import { daysUntil, formatDaysUntil, WINDOWS } from "@/lib/intelligence/rules";

export interface DigestSummary {
  ranAt: string;
  vehiclesScanned: number;
  driversScanned: number;
  operatorAlerts: number;
  staffAlerts: number;
  driverAlerts: number;
  expiredPermits: number;
  expiringPermits: number;
  expiredCof: number;
  expiringCof: number;
  expiredPdp: number;
  expiringPdp: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function runComplianceDigest(): Promise<DigestSummary> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const horizon = WINDOWS.horizonDays ?? 30;

  const summary: DigestSummary = {
    ranAt: now.toISOString(),
    vehiclesScanned: 0,
    driversScanned: 0,
    operatorAlerts: 0,
    staffAlerts: 0,
    driverAlerts: 0,
    expiredPermits: 0,
    expiringPermits: 0,
    expiredCof: 0,
    expiringCof: 0,
    expiredPdp: 0,
    expiringPdp: 0,
  };

  const { data: vehicles } = await admin
    .from("vehicles")
    .select(
      "registration_number, owner_name, owner_operator_id, permit_number, permit_expiry_date, cof_number, cof_expiry_date, driver_id, route_assignment_id"
    )
    .limit(8000);

  const vehicleRows = vehicles ?? [];
  summary.vehiclesScanned = vehicleRows.length;

  const regionCritical: Array<{ reg: string; kind: string; days: number }> = [];

  for (const v of vehicleRows) {
    const reg = String(v.registration_number ?? "");
    if (!reg) continue;

    const permitDays = daysUntil(v.permit_expiry_date as string | null, now);
    const cofDays = daysUntil(v.cof_expiry_date as string | null, now);

    if (permitDays !== null && permitDays < 0) {
      summary.expiredPermits += 1;
      regionCritical.push({ reg, kind: "permit_expired", days: permitDays });
      await notifyOperatorOfVehicle(reg, {
        type: "compliance.permit_expired",
        title: `Permit expired — ${reg}`,
        message: `Permit #${v.permit_number ?? "—"} expired ${formatDaysUntil(permitDays)}. Submit a renewal to stay legal on the rank.`,
        href: "/operator/renewals",
        entityType: "vehicle",
        entityId: reg,
      });
      summary.operatorAlerts += 1;
    } else if (permitDays !== null && permitDays <= horizon) {
      summary.expiringPermits += 1;
      if ([30, 14, 7, 3, 1].includes(permitDays)) {
        await notifyOperatorOfVehicle(reg, {
          type: "compliance.permit_expiring",
          title: `Permit ${formatDaysUntil(permitDays)} — ${reg}`,
          message: `Permit #${v.permit_number ?? "—"} expires on ${v.permit_expiry_date}. Start renewal early.`,
          href: "/operator/renewals",
          entityType: "vehicle",
          entityId: reg,
        });
        summary.operatorAlerts += 1;
      }
    }

    if (cofDays !== null && cofDays < 0) {
      summary.expiredCof += 1;
      regionCritical.push({ reg, kind: "cof_expired", days: cofDays });
      await notifyOperatorOfVehicle(reg, {
        type: "compliance.cof_expired",
        title: `COF expired — ${reg}`,
        message: `Certificate of fitness #${v.cof_number ?? "—"} expired ${formatDaysUntil(cofDays)}. Vehicle should not load until renewed.`,
        href: "/operator/fleet",
        entityType: "vehicle",
        entityId: reg,
      });
      summary.operatorAlerts += 1;
    } else if (cofDays !== null && cofDays <= horizon && [30, 14, 7, 3, 1].includes(cofDays)) {
      summary.expiringCof += 1;
      await notifyOperatorOfVehicle(reg, {
        type: "compliance.cof_expiring",
        title: `COF ${formatDaysUntil(cofDays)} — ${reg}`,
        message: `COF #${v.cof_number ?? "—"} expires on ${v.cof_expiry_date}.`,
        href: "/operator/fleet",
        entityType: "vehicle",
        entityId: reg,
      });
      summary.operatorAlerts += 1;
    }
  }

  const { data: drivers } = await admin
    .from("drivers")
    .select("id, full_name, pdp_expiry_date, pdp_status, assigned_vehicle_reg, status")
    .limit(8000);

  const driverRows = drivers ?? [];
  summary.driversScanned = driverRows.length;

  for (const d of driverRows) {
    const id = String(d.id ?? "");
    if (!id) continue;
    const pdpDays = daysUntil(d.pdp_expiry_date as string | null, now);
    if (pdpDays !== null && pdpDays < 0) {
      summary.expiredPdp += 1;
      await notifyDriverById(id, {
        type: "compliance.pdp_expired",
        title: "PDP expired",
        message: `Your professional driving permit expired ${formatDaysUntil(pdpDays)}. Contact administration before driving.`,
        href: "/driver",
        entityType: "driver",
        entityId: id,
      });
      summary.driverAlerts += 1;
    } else if (pdpDays !== null && pdpDays <= horizon && [30, 14, 7, 3, 1].includes(pdpDays)) {
      summary.expiringPdp += 1;
      await notifyDriverById(id, {
        type: "compliance.pdp_expiring",
        title: `PDP ${formatDaysUntil(pdpDays)}`,
        message: `Your PDP expires on ${d.pdp_expiry_date}. Renew before it lapses.`,
        href: "/driver",
        entityType: "driver",
        entityId: id,
      });
      summary.driverAlerts += 1;
    }
  }

  if (regionCritical.length > 0 || summary.expiredPermits + summary.expiredCof > 0) {
    const top = regionCritical.slice(0, 8);
    await notifyStaff(
      { roles: ["super-admin", "admin", "fleet-manager"] },
      {
        type: "compliance.digest",
        title: `Compliance digest — ${isoDate(now)}`,
        message: `${summary.expiredPermits} expired permits · ${summary.expiredCof} expired COF · ${summary.expiredPdp} expired PDP. ${summary.expiringPermits} permits and ${summary.expiringCof} COF within ${horizon} days.`,
        href: DeepLink.permitsExpired,
        entityType: "digest",
        entityId: isoDate(now),
      }
    );
    summary.staffAlerts += 1;

    if (top.length > 0) {
      await notifyStaff(
        { roles: ["super-admin", "admin"] },
        {
          type: "compliance.digest",
          title: "Critical compliance items",
          message: top
            .map((t) => `${t.reg}: ${t.kind.replace("_", " ")} (${formatDaysUntil(t.days)})`)
            .join(" · "),
          href: DeepLink.permitsExpired,
          entityType: "digest",
          entityId: `${isoDate(now)}-critical`,
        }
      );
      summary.staffAlerts += 1;
    }
  }

  return summary;
}
