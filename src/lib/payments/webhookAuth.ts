/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared-secret verification for payment provider webhooks.
 */

import "server-only";
import { AppError } from "@/lib/api/errors";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractProvided(request: Request): string {
  const header =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-callback-secret") ||
    "";
  if (header) return header.trim();

  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}

/**
 * Verify webhook shared secret.
 *
 * Production: secret must be configured; missing secret → reject.
 * Development: if secret env is unset, allow (local testing only).
 */
export function assertWebhookSecret(
  request: Request,
  envKey: string
): void {
  const expected = process.env[envKey]?.trim() ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (!expected) {
    if (isProd) {
      throw AppError.internal(`${envKey} is not configured`);
    }
    console.warn(
      `[webhook] ${envKey} unset — allowing unsigned webhook in non-production`
    );
    return;
  }

  const provided = extractProvided(request);
  if (!provided || !timingSafeEqual(provided, expected)) {
    throw AppError.unauthenticated("Invalid webhook signature");
  }
}
