/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Best-effort logging of verified payment webhook deliveries.
 * Table may not exist until migration is applied — never throws.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { log } from "@/lib/observability/log";

export type WebhookEventOutcome =
  | "applied"
  | "ignored"
  | "already_terminal"
  | "unparseable"
  | "error";

export interface WebhookEventInput {
  providerId: "momo" | "emlangeni";
  providerReference: string | null;
  status: string | null;
  outcome: WebhookEventOutcome;
  applied: boolean;
  errorMessage?: string | null;
  rawPayload?: Record<string, unknown> | null;
}

export async function logWebhookEvent(input: WebhookEventInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const id = `whe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    await admin.from("payment_webhook_events").insert({
      id,
      provider_id: input.providerId,
      provider_reference: input.providerReference,
      status: input.status,
      outcome: input.outcome,
      applied: input.applied,
      error_message: input.errorMessage ?? null,
      raw_payload: input.rawPayload ?? null,
      received_at: new Date().toISOString(),
    });
  } catch (err) {
    // Table may not exist yet; never break the webhook response path.
    log.warn("webhook.event_log_failed", {
      provider: input.providerId,
      err: err instanceof Error ? err.message : "unknown",
    });
  }
}

export async function listRecentWebhookEvents(
  limit: number = 40
): Promise<
  Array<{
    id: string;
    providerId: string;
    providerReference: string | null;
    status: string | null;
    outcome: string;
    applied: boolean;
    errorMessage: string | null;
    receivedAt: string;
  }>
> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("payment_webhook_events")
      .select(
        "id, provider_id, provider_reference, status, outcome, applied, error_message, received_at"
      )
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id as string,
      providerId: r.provider_id as string,
      providerReference: (r.provider_reference as string | null) ?? null,
      status: (r.status as string | null) ?? null,
      outcome: r.outcome as string,
      applied: Boolean(r.applied),
      errorMessage: (r.error_message as string | null) ?? null,
      receivedAt: r.received_at as string,
    }));
  } catch {
    return [];
  }
}
