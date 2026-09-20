/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side CSV builders. Escape every field, use CRLF line endings.
 */

import type { TripRow, SettlementSummary } from "./queries";

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: unknown[]): string {
  return values.map(esc).join(",");
}

export function tripsToCsv(trips: TripRow[]): string {
  const lines: string[] = [];
  lines.push(
    row([
      "Trip ID",
      "Date",
      "Departure",
      "Arrival",
      "Region",
      "Route",
      "Vehicle",
      "Driver",
      "Passengers",
      "Revenue (SZL)",
      "Status",
    ])
  );

  for (const t of trips) {
    lines.push(
      row([
        t.id,
        t.date,
        t.departureTime,
        t.arrivalTime ?? "",
        t.region ?? "",
        t.routeOrigin && t.routeDestination
          ? `${t.routeOrigin} → ${t.routeDestination}`
          : "",
        t.vehicleReg,
        t.driverName ?? "",
        t.passengerCount,
        t.revenueSzl.toFixed(2),
        t.status,
      ])
    );
  }

  return "\uFEFF" + lines.join("\r\n"); // UTF-8 BOM for Excel
}

export function settlementToCsv(summary: SettlementSummary): string {
  const lines: string[] = [];

  // Section 1: Overview
  lines.push("SECTION,SUMMARY");
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["Total Dispatches", summary.totalDispatches]));
  lines.push(row(["Total Collected (SZL)", summary.totalCollected.toFixed(2)]));
  lines.push(row(["Allocated Operational (SZL)", summary.allocationOperational.toFixed(2)]));
  lines.push(row(["Allocated NRTC (SZL)", summary.allocationNrtc.toFixed(2)]));
  lines.push(row(["Allocated Maintenance (SZL)", summary.allocationMaintenance.toFixed(2)]));
  lines.push(row(["Total Distributed (SZL)", summary.totalDistributed.toFixed(2)]));
  lines.push(row(["Balance (SZL)", summary.balance.toFixed(2)]));
  lines.push("");

  // Section 2: By Marshal
  lines.push("SECTION,BY_MARSHAL");
  lines.push(row(["Marshal", "Region", "Dispatches", "Collected (SZL)"]));
  for (const m of summary.byMarshal) {
    lines.push(row([m.marshalName, m.region, m.dispatchCount, m.totalCollected.toFixed(2)]));
  }
  lines.push("");

  // Section 3: By Vehicle
  lines.push("SECTION,BY_VEHICLE");
  lines.push(row(["Vehicle", "VIC", "Dispatches", "Collected (SZL)"]));
  for (const v of summary.byVehicle) {
    lines.push(row([v.vehicleReg, v.vic ?? "", v.dispatchCount, v.totalCollected.toFixed(2)]));
  }
  lines.push("");

  // Section 4: By Route
  lines.push("SECTION,BY_ROUTE");
  lines.push(row(["Route", "Region", "Dispatches", "Revenue (SZL)"]));
  for (const r of summary.byRoute) {
    lines.push(
      row([
        `${r.origin} → ${r.destination}`,
        r.region,
        r.dispatchCount,
        r.totalCollected.toFixed(2),
      ])
    );
  }

  return "\uFEFF" + lines.join("\r\n");
}
