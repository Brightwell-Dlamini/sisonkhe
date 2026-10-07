/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sortable offline-safe ids. Crypto only — no Math.random.
 */

import { randomBytes } from "crypto";

/**
 * Time-sortable id: prefix_timestamp36_randomHex.
 * Not a strict ULID; zero deps, collision-resistant, lexicographically ordered by time.
 */
export function newId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = randomBytes(6).toString("hex");
  const clean = prefix.replace(/[^a-z0-9_]/gi, "").slice(0, 12) || "id";
  return `${clean}_${t}_${r}`;
}
