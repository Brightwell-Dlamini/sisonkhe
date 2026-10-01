/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Provider registry.
 */

import "server-only";
import { momoProvider } from "./momo";
import { emlangeniProvider } from "./emlangeni";
import { manualProvider } from "./manual";
import type { PaymentProvider, ProviderId } from "../types";

const ALL_PROVIDERS: PaymentProvider[] = [
  momoProvider,
  emlangeniProvider,
  manualProvider,
];

export function getProvider(id: ProviderId): PaymentProvider | null {
  return ALL_PROVIDERS.find((p) => p.id === id) ?? null;
}

export function listEnabledProviders(): PaymentProvider[] {
  const live = process.env.PAYMENTS_LIVE === "true";

  return ALL_PROVIDERS.filter((p) => {
    if (p.id === "manual") return true; // manual always available as fallback
    if (!live) return false; // only manual when payments aren't live
    return p.enabled();
  });
}

export function isLive(): boolean {
  return (
    process.env.PAYMENTS_LIVE === "true" &&
    (momoProvider.enabled() || emlangeniProvider.enabled())
  );
}
