/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cryptographically random entity ids — no Date.now + Math.random.
 */

import { randomBytes } from "crypto";

function token(bytes = 8): string {
  return randomBytes(bytes).toString("hex");
}

export function newDriverId(): string {
  return `drv_${token(10)}`;
}

export function newOperatorId(): string {
  return `op_${token(10)}`;
}

export function newMarshalId(): string {
  return `mshl_${token(10)}`;
}

export function newStaffId(): string {
  return `staff_${token(10)}`;
}

export function newEntityId(prefix: string): string {
  return `${prefix}_${token(10)}`;
}
