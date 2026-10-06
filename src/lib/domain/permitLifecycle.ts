/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Permit lifecycle — single mental model for rank + inspector + print queue.
 */

export type PermitLifecycleState =
  | "none"
  | "active"
  | "expiring_soon"
  | "expired"
  | "suspended"
  | "renewal_pending_approval"
  | "approved_pending_print"
  | "printed";

export type PermitLifecycleInput = {
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  /** Open renewal request status if any */
  renewalStatus?: string | null;
};

function isExpired(dateStr: string | null | undefined, now = Date.now()): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return !Number.isNaN(t) && t <= now;
}

function daysUntil(dateStr: string | null | undefined, now = Date.now()): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / 86400000);
}

export function resolvePermitLifecycle(
  input: PermitLifecycleInput
): { state: PermitLifecycleState; blocksRankLoad: boolean; reason?: string } {
  const renewal = (input.renewalStatus ?? "").trim();
  if (renewal === "Pending Admin Approval") {
    return {
      state: "renewal_pending_approval",
      blocksRankLoad: isExpired(input.permitExpiryDate) || input.permitStatus === "Expired",
      reason: "Renewal awaiting admin approval.",
    };
  }
  if (renewal === "Approved") {
    return {
      state: "approved_pending_print",
      blocksRankLoad: true,
      reason: "Approved permit must be printed before rank load.",
    };
  }

  const st = (input.permitStatus ?? "").trim();
  if (st === "Suspended") {
    return {
      state: "suspended",
      blocksRankLoad: true,
      reason: "Permit suspended.",
    };
  }
  if (st === "Expired" || isExpired(input.permitExpiryDate)) {
    return {
      state: "expired",
      blocksRankLoad: true,
      reason: "Permit expired.",
    };
  }

  const days = daysUntil(input.permitExpiryDate);
  if (days !== null && days <= 14) {
    return {
      state: "expiring_soon",
      blocksRankLoad: false,
      reason: `Permit expires in ${days} day(s).`,
    };
  }

  if (st === "Active" || st === "Valid" || !st) {
    return { state: st ? "active" : "none", blocksRankLoad: false };
  }

  return { state: "none", blocksRankLoad: false };
}

/** Block route reassignment while vehicle is in active rank motion. */
export function canChangeRoute(
  vehicleStatus: string | null | undefined
): { allowed: boolean; reason?: string } {
  const st = (vehicleStatus ?? "").trim();
  if (st === "Loading" || st === "Departed") {
    return {
      allowed: false,
      reason: `Cannot change route while vehicle is ${st}. Reset to Waiting first.`,
    };
  }
  return { allowed: true };
}

export function canChangeOperatorOwnership(
  vehicleStatus: string | null | undefined,
  hasDriver: boolean
): { allowed: boolean; reason?: string } {
  if (hasDriver) {
    return {
      allowed: false,
      reason: "Unlink driver before transferring ownership.",
    };
  }
  return canChangeRoute(vehicleStatus);
}
