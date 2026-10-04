/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure domain rules. No I/O. Same answers in UI, API, and tests.
 */

import type { Severity, WorkItemKind } from "./types";

const MS_DAY = 86_400_000;

/** Calendar days from `now` to `dateStr` (YYYY-MM-DD). Negative = past. */
export function daysUntil(dateStr: string | null | undefined, now = new Date()): number | null {
  if (!dateStr) return null;
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const today = startOfDay(now);
  return Math.round((d.getTime() - today.getTime()) / MS_DAY);
}

export function parseDateOnly(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(Date.UTC(y, mo, day));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Severity from days-until for compliance documents. */
export function expirySeverity(days: number | null): Severity {
  if (days === null) return "info";
  if (days < 0) return "critical";
  if (days <= 7) return "high";
  if (days <= 14) return "medium";
  if (days <= 30) return "low";
  return "info";
}

/**
 * Priority score for ranking work items.
 * Critical overdue >> near expiry >> soft warnings.
 */
export function scoreExpiry(days: number | null, weight = 1): number {
  if (days === null) return 0;
  if (days < 0) return Math.round((1000 + Math.min(365, Math.abs(days)) * 2) * weight);
  if (days <= 7) return Math.round((700 - days * 20) * weight);
  if (days <= 14) return Math.round((500 - days * 10) * weight);
  if (days <= 30) return Math.round((300 - days * 4) * weight);
  return 0;
}

export function scoreKind(kind: WorkItemKind): number {
  switch (kind) {
    case "permit_expired":
      return 900;
    case "cof_expired":
      return 850;
    case "pdp_expired":
      return 800;
    case "renewal_pending":
      return 750;
    case "print_backlog":
      return 650;
    case "permit_expiring":
      return 600;
    case "cof_expiring":
      return 550;
    case "pdp_expiring":
      return 500;
    case "suspended_driver":
      return 450;
    case "frozen_master_card":
      return 400;
    case "unassigned_vehicle":
      return 350;
    case "unassigned_driver":
      return 300;
    case "incomplete_registration":
      return 250;
    case "compliance_gap":
      return 200;
    default:
      return 100;
  }
}

/** Combine kind base + expiry urgency. */
export function rankScore(kind: WorkItemKind, days: number | null = null): number {
  return scoreKind(kind) + scoreExpiry(days, 0.35);
}

export function isPermitActiveStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  const s = status.toUpperCase();
  return s === "A" || s === "ACTIVE" || s === "VALID";
}

export function isExpiredStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === "E" || s === "EXPIRED";
}

export function isSuspendedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === "S" || s === "SUSPENDED" || s === "FROZEN";
}

/** Human label for days-until. */
export function formatDaysUntil(days: number | null): string {
  if (days === null) return "unknown date";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "expires today";
  if (days === 1) return "expires tomorrow";
  return `expires in ${days} days`;
}

export const WINDOWS = {
  criticalDays: 7,
  warningDays: 14,
  horizonDays: 30,
} as const;
