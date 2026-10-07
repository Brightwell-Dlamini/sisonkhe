/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cryptographically random entity ids.
 * Never Date.now + Math.random for anything that hits the database or ledger.
 */

import { randomBytes } from "crypto";

function token(bytes = 10): string {
  return randomBytes(bytes).toString("hex");
}

export function newDriverId(): string {
  return `drv_${token()}`;
}

export function newOperatorId(): string {
  return `op_${token()}`;
}

export function newMarshalId(): string {
  return `mshl_${token()}`;
}

export function newStaffId(): string {
  return `staff_${token()}`;
}

export function newPaymentIntentId(): string {
  return `pi_${token(12)}`;
}

export function newClientReference(): string {
  return `cref_${token(12)}`;
}

export function newCreditId(intentId: string): string {
  return `cr_${intentId}`;
}

export function newCardTxId(intentId: string): string {
  return `tx_${intentId}`;
}

export function newAuditId(): string {
  return `aud_${token(12)}`;
}

export function newEntityId(prefix: string): string {
  const clean = prefix.replace(/[^a-z0-9_]/gi, "").slice(0, 12) || "ent";
  return `${clean}_${token()}`;
}
