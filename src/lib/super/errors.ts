/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface SystemError {
  id: string;
  timestamp: string;
  module: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  message: string;
  affectedUser: string | null;
  context: Record<string, unknown>;
  status: "Pending" | "Investigating" | "Resolved";
}

export async function listSystemErrors(limit: number = 100): Promise<SystemError[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("system_errors")
    .select(
      "id, timestamp, module, severity, message, affected_user, context, status"
    )
    .order("timestamp", { ascending: false })
    .limit(limit);

  return (data ?? []).map((e) => ({
    id: e.id as string,
    timestamp: e.timestamp as string,
    module: e.module as string,
    severity: e.severity as SystemError["severity"],
    message: e.message as string,
    affectedUser: (e.affected_user as string | null) ?? null,
    context: (e.context as Record<string, unknown>) ?? {},
    status: e.status as SystemError["status"],
  }));
}

export async function logSystemError(input: {
  module: string;
  severity: SystemError["severity"];
  message: string;
  affectedUser?: string;
  context?: Record<string, unknown>;
}): Promise<{ success: boolean; id?: string }> {
  const admin = createSupabaseAdminClient();
  const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await admin.from("system_errors").insert({
    id,
    module: input.module,
    severity: input.severity,
    message: input.message,
    affected_user: input.affectedUser ?? null,
    context: input.context ?? {},
    status: "Pending",
  });
  return { success: !error, id };
}

export async function updateErrorStatus(
  id: string,
  status: SystemError["status"]
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = { status };
  if (status === "Resolved") patch.resolved_at = new Date().toISOString();
  const { error } = await admin.from("system_errors").update(patch).eq("id", id);
  return { success: !error, error: error?.message };
}
