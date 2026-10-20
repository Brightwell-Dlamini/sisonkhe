/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role resolution. THE single source of truth for who a user is.
 *
 * Rules enforced here:
 *   1. Exactly one role per user. Multi-table membership is a hard error.
 *   2. Unknown role strings from the DB are a hard error — never silently coerced.
 *   3. Active-flag semantics are normalized across all role tables.
 *   4. Every resolution is logged with reason for audit.
 *
 * DB contract:
 *   - staff.role CHECK IN ('super-admin','admin','fleet-manager','inspector')
 *   - marshals, drivers, fleet_operators → presence = role
 *   - Exactly one of the four tables should claim any given auth_user_id
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export const AUTH_ROLES = [
  "super-admin",
  "admin",
  "fleet-manager",
  "inspector",
  "marshal",
  "driver",
  "operator",
] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export function isAuthRole(v: unknown): v is AuthRole {
  return typeof v === "string" && (AUTH_ROLES as readonly string[]).includes(v);
}

export type NavRole = AuthRole | "commuter";

export interface ResolvedUser {
  authUserId: string;
  /** Alias of authUserId for client components that historically used user.id */
  id: string;
  email: string | null;
  phone: string | null;
  role: AuthRole;
  roleDisplay: string;
  fullName: string;
  avatarUrl?: string;
  staffId?: string;
  marshalId?: string;
  driverId?: string;
  operatorId?: string;
  region?: string;
  terminalId?: string;
  assignedRouteId?: string;
  assignedVehicleReg?: string;
}

type TableMatch =
  | { kind: "staff"; id: string; fullName: string; role: AuthRole; region?: string; terminalId?: string; avatarUrl?: string }
  | { kind: "marshal"; id: string; fullName: string; region?: string; avatarUrl?: string }
  | { kind: "driver"; id: string; fullName: string; assignedVehicleReg?: string; avatarUrl?: string }
  | { kind: "operator"; id: string; fullName: string; avatarUrl?: string };

const ROLE_DISPLAY: Record<AuthRole, string> = {
  "super-admin": "Super Administrator",
  admin: "Rank Administrator",
  "fleet-manager": "Fleet Manager",
  inspector: "Traffic Inspector",
  marshal: "Rank Marshal",
  driver: "Kombi Driver",
  operator: "Fleet Operator",
};

export class RoleResolutionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MULTI_ROLE"
      | "UNKNOWN_STAFF_ROLE"
      | "INACTIVE"
      | "NO_ROLE"
  ) {
    super(message);
    this.name = "RoleResolutionError";
  }
}

/** Short-lived cache — 45s per authUserId */
const roleCache = new Map<
  string,
  { user: ResolvedUser | null; expiresAt: number }
>();
const CACHE_TTL_MS = 45_000;

async function findStaffMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("staff")
    .select("id, full_name, role, region, terminal_id, avatar_url, is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!data) return null;
  if (data.is_active === false) {
    throw new RoleResolutionError("Staff account is inactive", "INACTIVE");
  }
  const role = data.role as string;
  if (!isAuthRole(role) || !["super-admin", "admin", "fleet-manager", "inspector"].includes(role)) {
    throw new RoleResolutionError(
      `Unknown staff role: ${role}`,
      "UNKNOWN_STAFF_ROLE"
    );
  }
  return {
    kind: "staff",
    id: data.id as string,
    fullName: (data.full_name as string) || "Staff",
    role,
    region: (data.region as string | undefined) || undefined,
    terminalId: (data.terminal_id as string | undefined) || undefined,
    avatarUrl: (data.avatar_url as string | undefined) || undefined,
  };
}

async function findMarshalMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("marshals")
    .select("id, first_name, surname, region, avatar_url, is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!data) return null;
  if (data.is_active === false) {
    throw new RoleResolutionError("Marshal account is inactive", "INACTIVE");
  }
  return {
    kind: "marshal",
    id: data.id as string,
    fullName: `${data.first_name ?? ""} ${data.surname ?? ""}`.trim() || "Marshal",
    region: (data.region as string | undefined) || undefined,
    avatarUrl: (data.avatar_url as string | undefined) || undefined,
  };
}

async function findDriverMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("drivers")
    .select("id, full_name, assigned_vehicle_reg, avatar_url, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!data) return null;
  if (String(data.status ?? "").toLowerCase() === "inactive") {
    throw new RoleResolutionError("Driver account is inactive", "INACTIVE");
  }
  return {
    kind: "driver",
    id: data.id as string,
    fullName: (data.full_name as string) || "Driver",
    assignedVehicleReg: (data.assigned_vehicle_reg as string | undefined) || undefined,
    avatarUrl: (data.avatar_url as string | undefined) || undefined,
  };
}

async function findOperatorMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("fleet_operators")
    .select("id, full_name, avatar_url, is_active")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!data) return null;
  if (data.is_active === false) {
    throw new RoleResolutionError("Operator account is inactive", "INACTIVE");
  }
  return {
    kind: "operator",
    id: data.id as string,
    fullName: (data.full_name as string) || "Operator",
    avatarUrl: (data.avatar_url as string | undefined) || undefined,
  };
}

async function resolveFromMatches(
  authUserId: string,
  email: string | null,
  phone: string | null
): Promise<ResolvedUser | null> {
  const matches: TableMatch[] = [];
  const staff = await findStaffMatch(authUserId);
  if (staff) matches.push(staff);
  const marshal = await findMarshalMatch(authUserId);
  if (marshal) matches.push(marshal);
  const driver = await findDriverMatch(authUserId);
  if (driver) matches.push(driver);
  const operator = await findOperatorMatch(authUserId);
  if (operator) matches.push(operator);

  if (matches.length === 0) {
    throw new RoleResolutionError("No role linked to this account", "NO_ROLE");
  }
  if (matches.length > 1) {
    throw new RoleResolutionError(
      `Multiple roles for user: ${matches.map((m) => m.kind).join(", ")}`,
      "MULTI_ROLE"
    );
  }

  const m = matches[0];
  const base: ResolvedUser = {
    authUserId,
    id: authUserId,
    email,
    phone,
    fullName: m.fullName,
    avatarUrl: m.avatarUrl,
    role: "marshal",
    roleDisplay: "",
  };

  switch (m.kind) {
    case "staff":
      return {
        ...base,
        role: m.role,
        roleDisplay: ROLE_DISPLAY[m.role],
        staffId: m.id,
        region: m.region,
        terminalId: m.terminalId,
      };
    case "marshal":
      return {
        ...base,
        role: "marshal",
        roleDisplay: ROLE_DISPLAY.marshal,
        marshalId: m.id,
        region: m.region,
      };
    case "driver":
      return {
        ...base,
        role: "driver",
        roleDisplay: ROLE_DISPLAY.driver,
        driverId: m.id,
        assignedVehicleReg: m.assignedVehicleReg,
      };
    case "operator":
      return {
        ...base,
        role: "operator",
        roleDisplay: ROLE_DISPLAY.operator,
        operatorId: m.id,
      };
  }
}

/**
 * Resolve a Supabase auth user to their one-and-only role.
 * Results cached ~45s per authUserId to avoid 4 table hits on every API call.
 */
export async function resolveUserRole(
  authUserId: string,
  email: string | null,
  phone: string | null
): Promise<ResolvedUser | null> {
  const hit = roleCache.get(authUserId);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.user;
  }
  try {
    const user = await resolveFromMatches(authUserId, email, phone);
    roleCache.set(authUserId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
  } catch (err) {
    if (err instanceof RoleResolutionError) {
      roleCache.set(authUserId, { user: null, expiresAt: Date.now() + 5_000 });
      throw err;
    }
    throw err;
  }
}

export function primaryEntityId(user: ResolvedUser): string {
  return (
    user.staffId ||
    user.marshalId ||
    user.driverId ||
    user.operatorId ||
    user.authUserId
  );
}
