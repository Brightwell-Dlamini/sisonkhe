/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manual provider — ledger-only top-ups.
 *
 * When PAYMENTS_LIVE=false or no provider credentials are configured, this
 * provider simulates a top-up. It is credited immediately and recorded in
 * the DB. Used for development and for regions where mobile money isn't
 * available yet.
 */

import "server-only";
import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  ProviderStatusResult,
} from "../types";

export const manualProvider: PaymentProvider = {
  id: "manual",
  displayName: "Ledger Top-Up (Instant)",
  supportsWebhooks: false,
  requiresPayerPhone: false,

  enabled() {
    // Always enabled as a fallback.
    return true;
  },

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const ref = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      providerReference: ref,
      status: "completed",
      instructions: `E${params.amountSzl.toFixed(2)} credited instantly to the target card.`,
      rawResponse: { mode: "manual", ref },
    };
  },

  async checkStatus(): Promise<ProviderStatusResult> {
    return {
      status: "completed",
      rawResponse: { mode: "manual" },
    };
  },
};
