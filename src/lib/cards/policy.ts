/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Virtual card policy — who holds money, who only views, freeze rules.
 *
 * Model:
 *   Operator master  →  Vehicle card  →  Rank fee / renewals
 *   Drivers see the assigned vehicle card (read-only).
 *   Marshals trigger fees; they do not hold a wallet.
 *   Admins / inspectors never hold balances.
 */

export type CardKind = "master" | "vehicle" | "ops";

export type CardStatus =
  | "Active"
  | "Frozen"
  | "Suspended"
  | "Blocked"
  | "Expired"
  | "Closed"
  | string;

export type CardSnapshot = {
  kind: CardKind;
  status: CardStatus | null | undefined;
  balanceSzl?: number | null;
  id?: string | null;
  number?: string | null;
};

export type CardRuleResult = {
  allowed: boolean;
  reason?: string;
  warning?: string;
};

/** Roles that may hold a spendable balance in product policy. */
export const MONEY_CARD_HOLDERS = {
  operator: "master" as const,
  vehicle: "vehicle" as const,
  /** Optional future: marshal cash float — off by default */
  marshalOps: false as boolean,
};

/** Roles that never get a money card. */
export const NO_MONEY_CARD_ROLES = [
  "driver",
  "admin",
  "super_admin",
  "inspector",
] as const;

const BLOCKED = new Set(["Frozen", "Suspended", "Blocked", "Expired", "Closed"]);

export function isSpendBlocked(status: CardStatus | null | undefined): boolean {
  return BLOCKED.has((status ?? "").trim());
}

/** Inbound top-up allowed while frozen (operator can still fund a frozen vehicle). */
export function canReceiveFunds(card: CardSnapshot | null | undefined): CardRuleResult {
  if (!card) {
    return { allowed: false, reason: "No card on file." };
  }
  const st = (card.status ?? "").trim();
  if (st === "Closed" || st === "Expired") {
    return {
      allowed: false,
      reason: `Card is ${st}. Issue or renew before funding.`,
    };
  }
  return { allowed: true };
}

/** Outbound spend / transfer-out blocked when frozen. */
export function canSpendFromCard(card: CardSnapshot | null | undefined): CardRuleResult {
  if (!card) {
    return { allowed: false, reason: "No card on file." };
  }
  if (isSpendBlocked(card.status)) {
    return {
      allowed: false,
      reason: `Card is ${card.status}. Unfreeze before spend.`,
    };
  }
  return { allowed: true };
}

export function canCoverAmount(
  card: CardSnapshot | null | undefined,
  amountSzl: number
): CardRuleResult {
  const spend = canSpendFromCard(card);
  if (!spend.allowed) return spend;
  if (!(amountSzl > 0)) {
    return { allowed: false, reason: "Amount must be positive." };
  }
  const bal = Number(card?.balanceSzl ?? 0);
  if (bal + 1e-9 < amountSzl) {
    return {
      allowed: false,
      reason: `Insufficient balance (E${bal.toFixed(2)} available, need E${amountSzl.toFixed(2)}).`,
    };
  }
  return { allowed: true };
}

/**
 * Rank fee at depart: vehicle card must be spendable and cover the fee.
 * Hard-block path defaults to requiring a card (depart must pay).
 */
export function canPayRankFee(
  vehicleCard: CardSnapshot | null | undefined,
  feeSzl: number,
  opts?: { requireCard?: boolean }
): CardRuleResult {
  const requireCard = opts?.requireCard !== false;
  if (!vehicleCard) {
    if (requireCard) {
      return {
        allowed: false,
        reason:
          "No vehicle card — operator must issue and fund a card before this kombi can depart.",
      };
    }
    return { allowed: true, warning: "No vehicle card — fee may not post." };
  }
  if (isSpendBlocked(vehicleCard.status)) {
    return {
      allowed: false,
      reason: `Vehicle card is ${vehicleCard.status}. Operator must unfreeze before depart.`,
    };
  }
  const cover = canCoverAmount(vehicleCard, feeSzl);
  if (!cover.allowed) {
    return {
      allowed: false,
      reason:
        cover.reason ??
        `Insufficient card balance for rank fee (E${feeSzl.toFixed(2)}). Operator must top up.`,
    };
  }
  return { allowed: true };
}

export function cardAccountCode(kind: CardKind, key: string): string {
  if (kind === "master") return `card.operator:${key}`;
  if (kind === "vehicle") return `card.vehicle:${key}`;
  return `card.ops:${key}`;
}
