/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Payment provider abstraction.
 *
 * Every provider implements PaymentProvider. Adding a new one = one new file
 * + one registry entry.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ProviderId = "momo" | "emlangeni" | "manual";

export interface PaymentIntent {
  id: string;
  providerId: ProviderId;
  amountSzl: number;
  currency: "SZL";
  status: PaymentStatus;
  purpose: PaymentPurpose;
  targetEntityId: string; // master card id, vehicle reg, etc.
  initiatedBy: string; // auth user id
  clientReference: string; // our idempotency key
  providerReference: string | null; // MoMo's financialTransactionId
  providerPayload: Record<string, unknown>;
  redirectUrl: string | null; // for USSD/redirect flows
  instructions: string | null; // for manual flows ("Send E100 to X, ref: Y")
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failureReason: string | null;
}

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export type PaymentPurpose =
  | "master_card_topup"
  | "vehicle_card_topup"
  | "rank_fee"
  | "renewal_fee";

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface InitiateParams {
  amountSzl: number;
  currency: "SZL";
  purpose: PaymentPurpose;
  targetEntityId: string;
  clientReference: string;
  payerPhone?: string; // required for MoMo/e-Mlangeni
  payerName?: string;
  description?: string;
}

export interface InitiateResult {
  providerReference: string;
  status: PaymentStatus;
  redirectUrl?: string;
  instructions?: string;
  rawResponse: Record<string, unknown>;
}

export interface ProviderStatusResult {
  status: PaymentStatus;
  failureReason?: string;
  rawResponse: Record<string, unknown>;
}

export interface PaymentProvider {
  id: ProviderId;
  displayName: string;
  supportsWebhooks: boolean;
  requiresPayerPhone: boolean;
  enabled(): boolean;
  initiate(params: InitiateParams): Promise<InitiateResult>;
  checkStatus(providerReference: string): Promise<ProviderStatusResult>;
  parseWebhook?(payload: unknown): WebhookParseResult | null;
}

export interface WebhookParseResult {
  providerReference: string;
  clientReference?: string;
  status: PaymentStatus;
  failureReason?: string;
  rawPayload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

export interface PaymentIntentRow {
  id: string;
  provider_id: string;
  amount_szl: number;
  currency: string;
  status: string;
  purpose: string;
  target_entity_id: string;
  initiated_by: string;
  client_reference: string;
  provider_reference: string | null;
  provider_payload: Record<string, unknown>;
  redirect_url: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failure_reason: string | null;
}
