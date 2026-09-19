/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role resolution. Given an authenticated Supabase user, determine their
 * domain role by querying the appropriate table.
 *
 * IMPORTANT: This uses the ADMIN client (service role key).
 * It runs server-side only, after auth is verified.
 * RLS is bypassed intentionally — we filter by auth_user_id explicitly.
 */

import { createSupabaseAdminClient } from "../supabase/server";

export type AuthRole =
  | "super-admin"
  | "admin"
  | "fleet-manager"
  | "inspector"
  | "marshal"
  | "driver"
  | "operator";

export interface ResolvedUser {
  authUserId: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  roleDisplay: string;
  staffId?: string;
  marshalId?: string;
  driverId?: string;
  operatorId?: string;
  fullName: string;
  avatarUrl?: string;
  region?: string;
  terminalId?: string;
  assignedRouteId?: string;
  assignedVehicleReg?: string;
}

/**
 * Resolve a Supabase auth user to their domain role.
 * Tries staff → marshal → driver → operator in that order.
 */
export async function resolveUserRole(
  authUserId: string,
  email: string | null,
  phone: string | null
): Promise<ResolvedUser | null> {
  const admin = createSupabaseAdminClient();

  // 1. Staff (highest priority)
  const { data: staff, error: staffErr } = await admin
    .from("staff")
    .select("id, full_name, role, region, terminal_id, is_active")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (staffErr) console.error("[resolveUserRole] staff error:", staffErr);

  if (staff) {
    return {
      authUserId,
      email,
      phone,
      role: staff.role as AuthRole,
      roleDisplay: staffRoleDisplay(staff.role),
      staffId: staff.id,
      fullName: staff.full_name,
      region: staff.region ?? undefined,
      terminalId: staff.terminal_id ?? undefined,
    };
  }

  // 2. Marshal
  const { data: marshal, error: marshalErr } = await admin
    .from("marshals")
    .select(
      "id, first_name, surname, region, is_active, profile_picture_url, assigned_route_id, terminal_id"
    )
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (marshalErr) console.error("[resolveUserRole] marshal error:", marshalErr);

  if (marshal) {
    return {
      authUserId,
      email,
      phone,
      role: "marshal",
      roleDisplay: "Rank Marshal",
      marshalId: marshal.id,
      fullName: `${marshal.first_name} ${marshal.surname}`.trim(),
      region: marshal.region,
      terminalId: marshal.terminal_id ?? undefined,
      assignedRouteId: marshal.assigned_route_id ?? undefined,
      avatarUrl: marshal.profile_picture_url ?? undefined,
    };
  }

  // 3. Driver
  const { data: driver, error: driverErr } = await admin
    .from("drivers")
    .select("id, full_name, assigned_vehicle_reg, status, profile_picture_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (driverErr) console.error("[resolveUserRole] driver error:", driverErr);

  if (driver && driver.status !== "Suspended") {
    return {
      authUserId,
      email,
      phone,
      role: "driver",
      roleDisplay: "Kombi Driver",
      driverId: driver.id,
      fullName: driver.full_name,
      assignedVehicleReg: driver.assigned_vehicle_reg ?? undefined,
      avatarUrl: driver.profile_picture_url ?? undefined,
    };
  }

  // 4. Operator
  const { data: operator, error: operatorErr } = await admin
    .from("fleet_operators")
    .select("id, name, company_name, association, avatar_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (operatorErr) console.error("[resolveUserRole] operator error:", operatorErr);

  if (operator) {
    return {
      authUserId,
      email,
      phone,
      role: "operator",
      roleDisplay: `Operator • ${operator.company_name}`,
      operatorId: operator.id,
      fullName: operator.name,
      avatarUrl: operator.avatar_url ?? undefined,
    };
  }

  return null;
}

function staffRoleDisplay(role: string): string {
  switch (role) {
    case "super-admin":
      return "Super Administrator";
    case "admin":
      return "Rank Administrator";
    case "fleet-manager":
      return "Fleet Manager";
    case "inspector":
      return "Traffic Inspector";
    default:
      return role;
  }
}
