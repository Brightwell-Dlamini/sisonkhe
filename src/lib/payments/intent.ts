/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Payment intent lifecycle.
 *
 * An intent is a request to move money. It has a provider, a status, and a
 * reference. When the provider confirms, we credit the target entity.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { getProvider } from "./providers";
import type {
  PaymentIntent,
  PaymentPurpose,
  PaymentStatus,
  ProviderId,
  PaymentIntentRow,
} from "./types";

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>): PaymentIntent {
  return {
    id: row.id as string,
    providerId: row.provider_id as ProviderId,
    amountSzl: Number(row.amount_szl),
    currency: "SZL",
    status: row.status as PaymentStatus,
    purpose: row.purpose as PaymentPurpose,
    targetEntityId: row.target_entity_id as string,
    initiatedBy: row.initiated_by as string,
    clientReference: row.client_reference as string,
    providerReference: (row.provider_reference as string | null) ?? null,
    providerPayload: (row.provider_payload as Record<string, unknown>) ?? {},
    redirectUrl: (row.redirect_url as string | null) ?? null,
    instructions: (row.instructions as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
    failureReason: (row.failure_reason as string | null) ?? null,
  };
}

const SELECT_COLUMNS =
  "id, provider_id, amount_szl, currency, status, purpose, target_entity_id, initiated_by, client_reference, provider_reference, provider_payload, redirect_url, instructions, created_at, updated_at, completed_at, failure_reason";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateIntentInput {
  providerId: ProviderId;
  amountSzl: number;
  purpose: PaymentPurpose;
  targetEntityId: string;
  initiatedBy: string;
  payerPhone?: string;
  payerName?: string;
  description?: string;
  clientReference?: string;
}

export async function createIntent(
  input: CreateIntentInput
): Promise<{ intent: PaymentIntent; error?: string }> {
  const admin = createSupabaseAdminClient();

  if (input.amountSzl <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const provider = getProvider(input.providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${input.providerId}`);
  }
  if (!provider.enabled()) {
    throw new Error(
      `Provider ${provider.displayName} is not configured on this server.`
    );
  }

  const clientReference =
    input.clientReference ??
    `pi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const id = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Insert initial intent row (pending)
  const { data: inserted, error: insertErr } = await admin
    .from("payment_intents")
    .insert({
      id,
      provider_id: provider.id,
      amount_szl: input.amountSzl,
      currency: "SZL",
      status: "pending",
      purpose: input.purpose,
      target_entity_id: input.targetEntityId,
      initiated_by: input.initiatedBy,
      client_reference: clientReference,
      provider_payload: {},
    })
    .select(SELECT_COLUMNS)
    .single();

  if (insertErr || !inserted) {
    throw new Error(`Failed to create intent: ${insertErr?.message}`);
  }

  // Call provider
  try {
    const initiated = await provider.initiate({
      amountSzl: input.amountSzl,
      currency: "SZL",
      purpose: input.purpose,
      targetEntityId: input.targetEntityId,
      clientReference,
      payerPhone: input.payerPhone,
      payerName: input.payerName,
      description: input.description,
    });

    // Update intent with provider response
    const { data: updated, error: updateErr } = await admin
      .from("payment_intents")
      .update({
        provider_reference: initiated.providerReference,
        status: initiated.status,
        redirect_url: initiated.redirectUrl ?? null,
        instructions: initiated.instructions ?? null,
        provider_payload: initiated.rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update intent: ${updateErr?.message}`);
    }

    const intent = mapRow(updated);

    // If provider said "completed" immediately (manual), credit the target now
    if (intent.status === "completed") {
      await creditTarget(intent);
    }

    return { intent };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Mark intent as failed
    await admin
      .from("payment_intents")
      .update({
        status: "failed",
        failure_reason: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return {
      intent: {
        id,
        providerId: provider.id,
        amountSzl: input.amountSzl,
        currency: "SZL",
        status: "failed",
        purpose: input.purpose,
        targetEntityId: input.targetEntityId,
        initiatedBy: input.initiatedBy,
        clientReference,
        providerReference: null,
        providerPayload: {},
        redirectUrl: null,
        instructions: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        failureReason: message,
      },
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getIntent(id: string): Promise<PaymentIntent | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("payment_intents")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

export async function listIntentsForUser(
  authUserId: string,
  limit: number = 50
): Promise<PaymentIntent[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("payment_intents")
    .select(SELECT_COLUMNS)
    .eq("initiated_by", authUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map(mapRow);
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

/**
 * Called by webhook handler or polling. Idempotent.
 *
 * If the intent is already terminal, no-op.
 * If we're moving into a terminal state, credit the target entity.
 */
export async function applyProviderStatus(
  providerReference: string,
  status: PaymentStatus,
  failureReason?: string,
  rawPayload?: Record<string, unknown>
): Promise<{ applied: boolean; intent?: PaymentIntent }> {
  const admin = createSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("payment_intents")
    .select(SELECT_COLUMNS)
    .eq("provider_reference", providerReference)
    .maybeSingle();

  if (error || !row) return { applied: false };

  const current = mapRow(row);

  // Already terminal — nothing to do
  if (
    current.status === "completed" ||
    current.status === "failed" ||
    current.status === "cancelled" ||
    current.status === "expired"
  ) {
    return { applied: false, intent: current };
  }

  const now = new Date().toISOString();
  const isTerminal =
    status === "completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "expired";

  const { data: updated, error: updateErr } = await admin
    .from("payment_intents")
    .update({
      status,
      failure_reason: failureReason ?? null,
      completed_at: isTerminal ? now : null,
      updated_at: now,
      provider_payload: rawPayload ?? current.providerPayload,
    })
    .eq("id", current.id)
    .select(SELECT_COLUMNS)
    .single();

  if (updateErr || !updated) return { applied: false };

  const intent = mapRow(updated);

  if (intent.status === "completed") {
    await creditTarget(intent);
  }

  return { applied: true, intent };
}

// ---------------------------------------------------------------------------
// Credit the target entity
// ---------------------------------------------------------------------------

async function creditTarget(intent: PaymentIntent): Promise<void> {
  const admin = createSupabaseAdminClient();

  // Prevent double-crediting (idempotency)
  const { data: existingCredit } = await admin
    .from("payment_credits")
    .select("id")
    .eq("intent_id", intent.id)
    .maybeSingle();

  if (existingCredit) return;

  try {
    if (intent.purpose === "master_card_topup") {
      // Credit operator master card
      const { data: card } = await admin
        .from("operator_master_cards")
        .select("id, balance_szl")
        .eq("operator_id", intent.targetEntityId)
        .maybeSingle();

      if (!card) throw new Error("Master card not found.");

      await admin
        .from("operator_master_cards")
        .update({
          balance_szl: Number(card.balance_szl) + intent.amountSzl,
        })
        .eq("id", card.id as string);

      await admin.from("operator_card_transactions").insert({
        id: `tx-${intent.id}`,
        card_id: card.id as string,
        timestamp: new Date().toISOString(),
        type: "MASTER_TOP_UP",
        description: `Top-up via ${intent.providerId}`,
        category: "Other",
        amount_szl: intent.amountSzl,
        direction: "CREDIT",
        receipt_number: intent.clientReference,
        payment_method: intent.providerId,
        status: "Completed",
      });
    } else if (intent.purpose === "vehicle_card_topup") {
      // Credit vehicle virtual card
      const { data: card } = await admin
        .from("vehicle_virtual_cards")
        .select("id, balance_szl")
        .eq("vehicle_reg", intent.targetEntityId)
        .maybeSingle();

      if (!card) throw new Error("Vehicle card not found.");

      await admin
        .from("vehicle_virtual_cards")
        .update({
          balance_szl: Number(card.balance_szl) + intent.amountSzl,
        })
        .eq("id", card.id as string);

      await admin.from("virtual_card_transactions").insert({
        id: `tx-${intent.id}`,
        card_id: card.id as string,
        timestamp: new Date().toISOString(),
        type: "TOP_UP",
        description: `Top-up via ${intent.providerId}`,
        amount_szl: intent.amountSzl,
        direction: "CREDIT",
        receipt_number: intent.clientReference,
        status: "Completed",
      });
    } else {
      // rank_fee, renewal_fee: handled elsewhere (ledger-only for now)
    }

    // Record the credit for idempotency
    await admin.from("payment_credits").insert({
      id: `cr-${intent.id}`,
      intent_id: intent.id,
      amount_szl: intent.amountSzl,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[payments] creditTarget error:", err);
    // We do NOT throw here — the intent is already marked completed.
    // Manual reconciliation can fix any missing credit.
  }
}
