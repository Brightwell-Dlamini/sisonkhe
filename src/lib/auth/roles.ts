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

/** Short-lived cache so every API call does not re-hit 4 role tables. */
const ROLE_CACHE_TTL_MS = 45_000;
const roleCache = new Map<
  string,
  { user: ResolvedUser | null; expiresAt: number }
>();

export function invalidateRoleCache(authUserId?: string): void {
  if (authUserId) roleCache.delete(authUserId);
  else roleCache.clear();
}

async function findStaffMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("staff")
    .select("id, full_name, role, region, terminal_id, is_active, avatar_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new RoleResolutionError(`staff query: ${error.message}`, "NO_ROLE");
  if (!data) return null;

  if (data.is_active === false) {
    throw new RoleResolutionError(`staff ${data.id} is not active`, "INACTIVE");
  }

  if (!isAuthRole(data.role)) {
    throw new RoleResolutionError(
      `staff ${data.id} has unknown role "${data.role}" — CHECK constraint violated`,
      "UNKNOWN_STAFF_ROLE"
    );
  }

  return {
    kind: "staff",
    id: data.id as string,
    fullName: data.full_name as string,
    role: data.role as AuthRole,
    region: (data.region as string | null) ?? undefined,
    terminalId: (data.terminal_id as string | null) ?? undefined,
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
  };
}

async function findMarshalMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("marshals")
    .select("id, first_name, surname, region, is_active, avatar_url, photo_storage_path")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new RoleResolutionError(`marshal query: ${error.message}`, "NO_ROLE");
  if (!data) return null;

  if (data.is_active === false) {
    throw new RoleResolutionError(`marshal ${data.id} is not active`, "INACTIVE");
  }

  const avatarUrl =
    (data.avatar_url as string | null) ??
    (data.photo_storage_path as string | null) ??
    undefined;

  return {
    kind: "marshal",
    id: data.id as string,
    fullName:
      `${data.first_name ?? ""} ${data.surname ?? ""}`.trim() || "Marshal",
    region: (data.region as string | null) ?? undefined,
    avatarUrl,
  };
}

async function findDriverMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("drivers")
    .select("id, full_name, status, assigned_vehicle_reg, profile_picture_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new RoleResolutionError(`driver query: ${error.message}`, "NO_ROLE");
  if (!data) return null;

  if (data.status === "Suspended") {
    throw new RoleResolutionError(`driver ${data.id} is suspended`, "INACTIVE");
  }

  return {
    kind: "driver",
    id: data.id as string,
    fullName: data.full_name as string,
    assignedVehicleReg: (data.assigned_vehicle_reg as string | null) ?? undefined,
    avatarUrl: (data.profile_picture_url as string | null) ?? undefined,
  };
}

async function findOperatorMatch(authUserId: string): Promise<TableMatch | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("fleet_operators")
    .select("id, name, company_name, avatar_url")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new RoleResolutionError(`operator query: ${error.message}`, "NO_ROLE");
  if (!data) return null;

  return {
    kind: "operator",
    id: data.id as string,
    fullName: (data.name as string) || (data.company_name as string) || "Operator",
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
  };
}

async function resolveUserRoleUncached(
  authUserId: string,
  email: string | null,
  phone: string | null
): Promise<ResolvedUser | null> {
  const [staff, marshal, driver, operator] = await Promise.all([
    findStaffMatch(authUserId),
    findMarshalMatch(authUserId),
    findDriverMatch(authUserId),
    findOperatorMatch(authUserId),
  ]);

  const matches = [staff, marshal, driver, operator].filter(
    (m): m is TableMatch => m !== null
  );

  if (matches.length === 0) return null;

  if (matches.length > 1) {
    throw new RoleResolutionError(
      `auth user ${authUserId} is claimed by multiple role tables: ${matches
        .map((m) => m.kind)
        .join(", ")}. Resolve the data conflict before allowing sign-in.`,
      "MULTI_ROLE"
    );
  }

  const m = matches[0];
  const base: ResolvedUser = {
    authUserId,
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

  const user = await resolveUserRoleUncached(authUserId, email, phone);
  roleCache.set(authUserId, {
    user,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
  return user;
}

export function primaryEntityId(user: ResolvedUser): string {
  return (
    user.staffId ??
    user.marshalId ??
    user.driverId ??
    user.operatorId ??
    user.authUserId
  );
}
