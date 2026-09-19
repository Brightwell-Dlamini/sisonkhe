/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role resolution. Given an authenticated Supabase user, determine their
 * domain role by querying the appropriate table.
 *
 * Uses the ADMIN client (service role). Server-side only.
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
  {
    const { data: staff, error: staffErr } = await admin
      .from("staff")
      .select("id, full_name, role, region, terminal_id, is_active")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (staffErr) {
      console.warn("[resolveUserRole] staff query error:", staffErr.message);
    } else if (staff && staff.is_active !== false) {
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
  }

  // 2. Marshal
  // Portal schema may not have assigned_route_id / terminal_id / profile_picture_url.
  // Select only columns known to exist on the registration portal table.
  {
    const { data: marshal, error: marshalErr } = await admin
      .from("marshals")
      .select("id, first_name, surname, region, is_active, auth_user_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (marshalErr) {
      console.error("[resolveUserRole] marshal query error:", marshalErr.message);
    } else if (marshal) {
      // Portal often leaves is_active NULL; treat NULL as active (same as claim verify RPC)
      if (marshal.is_active === false) {
        console.warn("[resolveUserRole] marshal found but is_active=false", marshal.id);
      } else {
        return {
          authUserId,
          email,
          phone,
          role: "marshal",
          roleDisplay: "Rank Marshal",
          marshalId: marshal.id,
          fullName: `${marshal.first_name ?? ""} ${marshal.surname ?? ""}`.trim() || "Marshal",
          region: marshal.region ?? undefined,
        };
      }
    } else {
      // Diagnostic: is auth_user_id stored under a different type/format?
      const { data: byText } = await admin
        .from("marshals")
        .select("id, auth_user_id, is_active, first_name, surname")
        .filter("auth_user_id", "eq", authUserId)
        .limit(1);

      console.log("[resolveUserRole] marshal not found for", authUserId, "sample:", byText);
    }
  }

  // 3. Driver
  {
    const { data: driver, error: driverErr } = await admin
      .from("drivers")
      .select("id, full_name, assigned_vehicle_reg, status, profile_picture_url")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (driverErr) {
      console.warn("[resolveUserRole] driver query error:", driverErr.message);
    } else if (driver && driver.status !== "Suspended") {
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
  }

  // 4. Operator
  {
    const { data: operator, error: operatorErr } = await admin
      .from("fleet_operators")
      .select("id, name, company_name, association, avatar_url")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (operatorErr) {
      console.warn("[resolveUserRole] operator query error:", operatorErr.message);
    } else if (operator) {
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
  }

  console.log("[resolveUserRole] NO ROLE FOUND for", authUserId);
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
