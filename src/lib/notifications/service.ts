/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * In-app notifications for authenticated system users.
 * Best-effort: never throws into domain flows.
 */

import "server-only";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "../supabase/server";
import type { AuthRole } from "../auth/roles";

export type NotificationType =
  | "assignment.link"
  | "assignment.unlink"
  | "marshal.route"
  | "permit.approved"
  | "permit.rejected"
  | "permit.printed"
  | "dispatch.load"
  | "dispatch.depart"
  | "dispatch.breakdown"
  | "ticket.issue"
  | "renewal.submitted"
  | "system";

export interface NotifyInput {
  authUserId: string;
  role?: AuthRole | string | null;
  type: NotificationType | string;
  title: string;
  message: string;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  timestamp: string;
}

function newId(): string {
  return `ntf_${randomBytes(8).toString("hex")}`;
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  if (!input.authUserId) return;
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("user_notifications").insert({
      id: newId(),
      auth_user_id: input.authUserId,
      role: input.role ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      read_at: null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[notifications] notifyUser failed:", err);
  }
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    const admin = createSupabaseAdminClient();
    const rows = inputs
      .filter((i) => !!i.authUserId)
      .map((i) => ({
        id: newId(),
        auth_user_id: i.authUserId,
        role: i.role ?? null,
        type: i.type,
        title: i.title,
        message: i.message,
        href: i.href ?? null,
        entity_type: i.entityType ?? null,
        entity_id: i.entityId ?? null,
        read_at: null,
        created_at: new Date().toISOString(),
      }));
    if (rows.length === 0) return;
    await admin.from("user_notifications").insert(rows);
  } catch (err) {
    console.warn("[notifications] notifyMany failed:", err);
  }
}

export async function notifyDriverById(
  driverId: string | null | undefined,
  payload: Omit<NotifyInput, "authUserId" | "role">
): Promise<void> {
  if (!driverId) return;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("drivers")
      .select("auth_user_id")
      .eq("id", driverId)
      .maybeSingle();
    const authId = data?.auth_user_id as string | null;
    if (!authId) return;
    await notifyUser({ ...payload, authUserId: authId, role: "driver" });
  } catch (err) {
    console.warn("[notifications] notifyDriver failed:", err);
  }
}

export async function notifyMarshalById(
  marshalId: string | null | undefined,
  payload: Omit<NotifyInput, "authUserId" | "role">
): Promise<void> {
  if (!marshalId) return;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("marshals")
      .select("auth_user_id")
      .eq("id", marshalId)
      .maybeSingle();
    const authId = data?.auth_user_id as string | null;
    if (!authId) return;
    await notifyUser({ ...payload, authUserId: authId, role: "marshal" });
  } catch (err) {
    console.warn("[notifications] notifyMarshal failed:", err);
  }
}

/** Notify operator who owns a vehicle (by plate). */
export async function notifyOperatorOfVehicle(
  vehicleReg: string | null | undefined,
  payload: Omit<NotifyInput, "authUserId" | "role">
): Promise<void> {
  if (!vehicleReg) return;
  try {
    const admin = createSupabaseAdminClient();
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("owner_operator_id")
      .eq("registration_number", vehicleReg)
      .maybeSingle();
    const opId = vehicle?.owner_operator_id as string | null;
    if (!opId) return;
    const { data: op } = await admin
      .from("fleet_operators")
      .select("auth_user_id")
      .eq("id", opId)
      .maybeSingle();
    const authId = op?.auth_user_id as string | null;
    if (!authId) return;
    await notifyUser({ ...payload, authUserId: authId, role: "operator" });
  } catch (err) {
    console.warn("[notifications] notifyOperator failed:", err);
  }
}

/** Staff in a region (admin) + national super-admins / fleet managers. */
export async function notifyStaff(
  opts: {
    region?: string | null;
    roles?: AuthRole[];
  },
  payload: Omit<NotifyInput, "authUserId" | "role">
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const roles = opts.roles ?? ["super-admin", "admin", "fleet-manager"];
    let q = admin
      .from("staff")
      .select("auth_user_id, role, region")
      .eq("is_active", true)
      .in("role", roles);

    const { data } = await q;
    const targets = (data ?? []).filter((s) => {
      const role = s.role as string;
      if (role === "super-admin" || role === "fleet-manager") return true;
      if (!opts.region) return true;
      const r = ((s.region as string) ?? "").toLowerCase();
      return r === opts.region.toLowerCase();
    });

    await notifyMany(
      targets
        .map((s) => s.auth_user_id as string | null)
        .filter((id): id is string => !!id)
        .map((authUserId) => ({
          ...payload,
          authUserId,
          role: "admin",
        }))
    );
  } catch (err) {
    console.warn("[notifications] notifyStaff failed:", err);
  }
}

export async function listNotificationsForUser(
  authUserId: string,
  limit = 20
): Promise<NotificationRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_notifications")
    .select(
      "id, type, title, message, href, entity_type, entity_id, read_at, created_at"
    )
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Table missing → empty list, not a hard crash
    console.warn("[notifications] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((n) => ({
    id: n.id as string,
    type: n.type as string,
    title: (n.title as string) ?? "",
    message: n.message as string,
    href: (n.href as string | null) ?? null,
    entityType: (n.entity_type as string | null) ?? null,
    entityId: (n.entity_id as string | null) ?? null,
    read: !!(n.read_at as string | null),
    timestamp: n.created_at as string,
  }));
}

export async function countUnread(authUserId: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("auth_user_id", authUserId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(
  authUserId: string,
  id: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("auth_user_id", authUserId)
    .is("read_at", null);
}

export async function markAllNotificationsRead(
  authUserId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("auth_user_id", authUserId)
    .is("read_at", null);
}
