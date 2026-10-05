/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Browser-side helpers for the event-log sync protocol.
 */

"use client";

import type {
  SyncEvent,
  SyncPushResult,
  SyncPullResponse,
} from "./protocol";

export async function pushEvents(
  events: SyncEvent[],
  clientId: string
): Promise<SyncPushResult> {
  const res = await fetch("/api/sync/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events, clientId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Push failed (${res.status})`);
  }

  return res.json();
}

export async function pullEvents(
  sinceSeq: number,
  limit = 100
): Promise<SyncPullResponse> {
  const res = await fetch(
    `/api/sync/pull?since=${sinceSeq}&limit=${limit}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Pull failed (${res.status})`);
  }

  return res.json();
}

export async function getWatermark(): Promise<{ seq: number; ts: number }> {
  const res = await fetch("/api/sync/watermark", { cache: "no-store" });
  if (!res.ok) throw new Error("Watermark fetch failed");
  return res.json();
}
