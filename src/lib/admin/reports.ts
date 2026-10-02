/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compliance report CSV exports.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export type ReportType =
  | "expiring-permits"
  | "expired-permits"
  | "cof-expiry"
  | "renewals"
  | "fleet-status";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(values: unknown[]): string {
  return values.map(esc).join(",");
}

export async function generateComplianceReport(type: ReportType): Promise<{
  filename: string;
  csv: string;
}> {
  const admin = createSupabaseAdminClient();
  const lines: string[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const in30Days = new Date(today.getTime() + 30 * 86400000)
    .toISOString()
    .split("T")[0];

  if (type === "expiring-permits") {
    const { data } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, make, model, permit_number, permit_expiry_date, owner_name, permit_status"
      )
      .gte("permit_expiry_date", todayStr)
      .lte("permit_expiry_date", in30Days)
      .order("permit_expiry_date");

    lines.push(row([
      "Registration",
      "VIC",
      "Vehicle",
      "Permit #",
      "Expiry",
      "Owner",
      "Status",
    ]));
    for (const v of data ?? []) {
      lines.push(
        row([
          v.registration_number,
          v.vic,
          `${v.make} ${v.model}`,
          v.permit_number,
          v.permit_expiry_date,
          v.owner_name,
          v.permit_status,
        ])
      );
    }
    return { filename: `expiring-permits-${todayStr}.csv`, csv: "\uFEFF" + lines.join("\r\n") };
  }

  if (type === "expired-permits") {
    const { data } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, make, model, permit_number, permit_expiry_date, owner_name, permit_status"
      )
      .lt("permit_expiry_date", todayStr)
      .order("permit_expiry_date");

    lines.push(row([
      "Registration",
      "VIC",
      "Vehicle",
      "Permit #",
      "Expired On",
      "Owner",
      "Status",
    ]));
    for (const v of data ?? []) {
      lines.push(
        row([
          v.registration_number,
          v.vic,
          `${v.make} ${v.model}`,
          v.permit_number,
          v.permit_expiry_date,
          v.owner_name,
          v.permit_status,
        ])
      );
    }
    return { filename: `expired-permits-${todayStr}.csv`, csv: "\uFEFF" + lines.join("\r\n") };
  }

  if (type === "cof-expiry") {
    const { data } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, make, model, cof_number, cof_expiry_date, owner_name"
      )
      .order("cof_expiry_date");

    lines.push(row([
      "Registration",
      "VIC",
      "Vehicle",
      "COF #",
      "Expiry",
      "Owner",
    ]));
    for (const v of data ?? []) {
      lines.push(
        row([
          v.registration_number,
          v.vic,
          `${v.make} ${v.model}`,
          v.cof_number,
          v.cof_expiry_date,
          v.owner_name,
        ])
      );
    }
    return { filename: `cof-expiry-${todayStr}.csv`, csv: "\uFEFF" + lines.join("\r\n") };
  }

  if (type === "renewals") {
    const { data } = await admin
      .from("permit_renewal_requests")
      .select(
        "id, vehicle_reg, operator, status, request_date, approval_date, approved_by, renewal_fee_amount_szl"
      )
      .order("request_date", { ascending: false })
      .limit(500);

    lines.push(row([
      "Request ID",
      "Vehicle",
      "Operator",
      "Status",
      "Requested",
      "Approved On",
      "Approved By",
      "Fee (SZL)",
    ]));
    for (const r of data ?? []) {
      lines.push(
        row([
          r.id,
          r.vehicle_reg,
          r.operator,
          r.status,
          r.request_date,
          r.approval_date,
          r.approved_by,
          r.renewal_fee_amount_szl,
        ])
      );
    }
    return { filename: `renewals-${todayStr}.csv`, csv: "\uFEFF" + lines.join("\r\n") };
  }

  if (type === "fleet-status") {
    const { data } = await admin
      .from("vehicles")
      .select(
        "registration_number, vic, make, model, classification, status, permit_status, permit_expiry_date, cof_expiry_date, owner_name"
      )
      .order("registration_number");

    lines.push(row([
      "Registration",
      "VIC",
      "Vehicle",
      "Class",
      "Queue Status",
      "Permit Status",
      "Permit Expiry",
      "COF Expiry",
      "Owner",
    ]));
    for (const v of data ?? []) {
      lines.push(
        row([
          v.registration_number,
          v.vic,
          `${v.make} ${v.model}`,
          v.classification,
          v.status,
          v.permit_status,
          v.permit_expiry_date,
          v.cof_expiry_date,
          v.owner_name,
        ])
      );
    }
    return { filename: `fleet-status-${todayStr}.csv`, csv: "\uFEFF" + lines.join("\r\n") };
  }

  return { filename: "unknown.csv", csv: "" };
}
