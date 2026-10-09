/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recent payment webhook deliveries for ops.
 */

import { requireAdminScope } from "@/lib/auth/session";
import { listRecentWebhookEvents } from "@/lib/payments/webhookEvents";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireAdminScope();
  const events = await listRecentWebhookEvents(50);
  return ok({ events, generatedAt: new Date().toISOString() });
});
