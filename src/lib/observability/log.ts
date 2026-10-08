/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lightweight structured logger for server-side operational telemetry.
 * Emits JSON lines so Vercel / platform log drains can index fields.
 *
 * Usage:
 *   log.info("sync.push.accepted", { count: accepted.length, clientId });
 *   log.warn("fleet.legacy.used", { method: "POST", ip });
 *   log.error("payment.webhook.failed", { provider: "momo", err: message });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: string | number | boolean | null | undefined;
}

function emit(level: LogLevel, event: string, fields?: LogFields): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development" || process.env.LOG_DEBUG === "true") {
        console.debug(line);
      }
      break;
    default:
      console.log(line);
  }
}

export const log = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};
