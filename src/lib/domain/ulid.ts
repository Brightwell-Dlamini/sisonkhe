/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ULID-ish id: monotonic-ish, sortable, offline-safe.
 * Not spec-perfect ULID — good enough, zero deps, no crypto requirement.
 */

export function newId(prefix: string): string {
  const t = Date.now().toString(36);
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${t}_${r}`;
}
