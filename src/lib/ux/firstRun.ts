/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight first-run flags (client localStorage).
 */

const PREFIX = "sisonkhe:firstrun:";

export type FirstRunRole =
  | "driver"
  | "marshal"
  | "operator"
  | "inspector"
  | "admin";

export function hasCompletedFirstRun(role: FirstRunRole, userId?: string): boolean {
  if (typeof window === "undefined") return true;
  const key = `${PREFIX}${role}:${userId ?? "anon"}`;
  return window.localStorage.getItem(key) === "1";
}

export function markFirstRunComplete(role: FirstRunRole, userId?: string): void {
  if (typeof window === "undefined") return;
  const key = `${PREFIX}${role}:${userId ?? "anon"}`;
  window.localStorage.setItem(key, "1");
}

export function resetFirstRun(role: FirstRunRole, userId?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${PREFIX}${role}:${userId ?? "anon"}`);
}
