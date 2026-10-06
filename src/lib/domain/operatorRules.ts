/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Operator / fleet business rules (NOT payment providers).
 * Master card status gates operational privileges only.
 */

export type MasterCardSnapshot = {
  status: string | null | undefined;
  balanceSzl?: number | null;
  tier?: string | null;
};

export type OperatorRuleResult = {
  allowed: boolean;
  reason?: string;
  warning?: string;
};

/** Suspended / frozen master card cannot top-up vehicle cards or renew permits. */
export function canOperatorSpend(card: MasterCardSnapshot | null | undefined): OperatorRuleResult {
  if (!card) {
    return {
      allowed: false,
      reason: "Operator has no Master Card. Issue a card before fleet spend operations.",
    };
  }
  const st = (card.status ?? "").trim();
  if (st === "Suspended" || st === "Frozen" || st === "Blocked") {
    return {
      allowed: false,
      reason: `Master Card is ${st}. Unblock before transfers or renewals.`,
    };
  }
  if (st === "Expired") {
    return {
      allowed: false,
      reason: "Master Card is expired. Renew the card before spend operations.",
    };
  }
  return { allowed: true };
}

export function canTransferToVehicle(
  card: MasterCardSnapshot | null | undefined,
  amountSzl: number,
  vehicleOwnerOperatorId: string | null | undefined,
  operatorId: string
): OperatorRuleResult {
  const spend = canOperatorSpend(card);
  if (!spend.allowed) return spend;

  if (vehicleOwnerOperatorId && vehicleOwnerOperatorId !== operatorId) {
    return {
      allowed: false,
      reason:
        "This vehicle belongs to another operator. You can only fund your own fleet.",
    };
  }

  if (amountSzl <= 0) {
    return { allowed: false, reason: "Transfer amount must be positive." };
  }

  const bal = Number(card?.balanceSzl ?? 0);
  if (bal < amountSzl) {
    return {
      allowed: false,
      reason: `Insufficient Master Card balance (E${bal.toFixed(2)} available).`,
    };
  }

  if (bal - amountSzl < 50) {
    return {
      allowed: true,
      warning: "Balance will drop below E50 after this transfer.",
    };
  }

  return { allowed: true };
}

export function canSubmitPermitRenewal(
  card: MasterCardSnapshot | null | undefined,
  vehicleOwnerOperatorId: string | null | undefined,
  operatorId: string
): OperatorRuleResult {
  if (vehicleOwnerOperatorId && vehicleOwnerOperatorId !== operatorId) {
    return {
      allowed: false,
      reason: "You can only renew permits for vehicles you own.",
    };
  }
  return canOperatorSpend(card);
}
