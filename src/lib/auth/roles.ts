/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role resolution. Given an authenticated Supabase user, determine their
 * domain role by querying the appropriate table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

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
  // Domain-specific record
  staffId?: string;
  marshalId?: string;
  driverId?: string;
  operatorId?: string;
  // Display info
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
 * Returns null if the user is authenticated but has no domain record.
 */
export async function resolveUserRole(
  supabase: SupabaseClient,
  authUserId: string,
  email: string | null,
  phone: string | null
): Promise<ResolvedUser | null> {
  // 1. Staff (highest priority)
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role, region, terminal_id, is_active")
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

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
  const { data: marshal } = await supabase
    .from("marshals")
    .select(
      "id, first_name, surname, position, region, is_active, profile_picture_url, assigned_route_id, terminal_id"
    )
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

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
  const { data: driver } = await supabase
    .from("drivers")
    .select(
      "id, full_name, assigned_vehicle_reg, status, profile_picture_url"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

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
  const { data: operator } = await supabase
    .from("fleet_operators")
    .select("id, name, company_name, association, avatar_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

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
