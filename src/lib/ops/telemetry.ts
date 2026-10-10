/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structured JSON telemetry for ops / Vercel log drains.
 * Keep payloads small and free of secrets (no passwords, tokens, full card numbers).
 */

import "server-only";

export type TelemetryLevel = "info" | "warn" | "error";

export type TelemetryEvent = {
  event: string;
  level?: TelemetryLevel;
  /** ISO timestamp filled automatically if omitted */
  at?: string;
  [key: string]: unknown;
};

/** Emit one structured log line. Safe to call from any server path. */
export function logEvent(payload: TelemetryEvent): void {
  const line = {
    ...payload,
    level: payload.level ?? "info",
    at: payload.at ?? new Date().toISOString(),
    service: "sisonkhe",
  };
  const text = JSON.stringify(line);
  if (line.level === "error") console.error(text);
  else if (line.level === "warn") console.warn(text);
  else console.info(text);
}
