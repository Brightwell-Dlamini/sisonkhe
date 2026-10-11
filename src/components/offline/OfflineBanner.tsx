/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Online + outbox status (replaces offline-only banner).
 */

"use client";

import OfflineStatusStrip from "@/components/common/OfflineStatusStrip";

export default function OfflineBanner() {
  return <OfflineStatusStrip />;
}
