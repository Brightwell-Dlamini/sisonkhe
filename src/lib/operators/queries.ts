/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { matchesRegion } from "../auth/region";

export interface OperatorRow {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  taxNumber: string | null;
  association: string | null;
  region: string | null;
  avatarUrl: string | null;
  bankAccountRef: string | null;
  operatorLicenseNumber: string | null;
  authUserId: string | null;
  username: string | null;
  masterCard: {
    id: string;
    cardNumber: string;
    balanceSzl: number;
    status: string;
    tier: string;
  } | null;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

const SELECT_COLUMNS = `
  id, name, company_name, phone, email, national_id, tax_number,
  association, region, avatar_url, bank_account_ref, operator_license_number,
  auth_user_id, created_at, updated_at
`;

function mapRow(
  row: Record<string, unknown>
): Omit<OperatorRow, "username" | "masterCard" | "vehicleCount"> {
  return {
    id: row.id as string,
    name: row.name as string,
    companyName: row.company_name as string,
    phone: row.phone as string,
    email: (row.email as string | null) ?? null,
    nationalId: (row.national_id as string | null) ?? null,
    taxNumber: (row.tax_number as string | null) ?? null,
    association: (row.association as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    bankAccountRef: (row.bank_account_ref as string | null) ?? null,
    operatorLicenseNumber: (row.operator_license_number as string | null) ?? null,
    authUserId: (row.auth_user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** @param regionScope null = national */
export async function listOperators(
  regionScope: string | null = null
): Promise<OperatorRow[]> {
  const admin = createSupabaseAdminClient();

  // region column may not exist yet — fall back to unscoped select
  let data: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;

  {
    let q = admin
      .from("fleet_operators")
      .select(SELECT_COLUMNS)
      .order("created_at", { ascending: false });
    if (regionScope) q = q.ilike("region", regionScope);
    const res = await q;
    if (res.error && res.error.message.includes("region")) {
      const fallback = await admin
        .from("fleet_operators")
        .select(
          `id, name, company_name, phone, email, national_id, tax_number,
           association, avatar_url, bank_account_ref, operator_license_number,
           auth_user_id, created_at, updated_at`
        )
        .order("created_at", { ascending: false });
      data = (fallback.data as Record<string, unknown>[] | null) ?? [];
      error = fallback.error;
    } else {
      data = (res.data as Record<string, unknown>[] | null) ?? [];
      error = res.error;
    }
  }

  if (error) throw new Error(`Failed to list operators: ${error.message}`);
  if (!data || data.length === 0) return [];

  let rows = data;
  if (regionScope) {
    rows = data.filter((d) =>
      matchesRegion(regionScope, (d.region as string | null) ?? null)
    );
    // If no region column populated, include operators who own vehicles on regional routes
    if (rows.length === 0) {
      const { data: routes } = await admin
        .from("routes")
        .select("id")
        .ilike("region_code", regionScope);
      const routeIds = (routes ?? []).map((r) => r.id as string);
      if (routeIds.length > 0) {
        const { data: vehs } = await admin
          .from("vehicles")
          .select("owner_operator_id")
          .in("route_assignment_id", routeIds);
        const opIds = new Set(
          (vehs ?? [])
            .map((v) => v.owner_operator_id as string | null)
            .filter((id): id is string => !!id)
        );
        rows = data.filter((d) => opIds.has(d.id as string));
      }
    }
  }

  const operatorIds = rows.map((o) => o.id as string);

  const authIds = rows
    .map((o) => o.auth_user_id as string | null)
    .filter((id): id is string => !!id);

  const usernameMap = new Map<string, string>();
  if (authIds.length > 0) {
    try {
      const { data: usersData } = await admin.auth.admin.listUsers({
        perPage: 1000,
      });
      for (const u of usersData?.users ?? []) {
        if (authIds.includes(u.id)) {
          const uname = u.user_metadata?.username as string | undefined;
          if (uname) usernameMap.set(u.id, uname);
        }
      }
    } catch {
      /* */
    }
  }

  const { data: cards } = await admin
    .from("operator_master_cards")
    .select("id, card_number, balance_szl, status, card_tier, operator_id")
    .in("operator_id", operatorIds);

  const cardMap = new Map<string, OperatorRow["masterCard"]>();
  for (const c of cards ?? []) {
    cardMap.set(c.operator_id as string, {
      id: c.id as string,
      cardNumber: c.card_number as string,
      balanceSzl: Number(c.balance_szl ?? 0),
      status: c.status as string,
      tier: c.card_tier as string,
    });
  }

  const { data: vehicles } = await admin
    .from("vehicles")
    .select("owner_operator_id")
    .in("owner_operator_id", operatorIds);

  const vehicleCountMap = new Map<string, number>();
  for (const v of vehicles ?? []) {
    const opId = v.owner_operator_id as string | null;
    if (opId) vehicleCountMap.set(opId, (vehicleCountMap.get(opId) ?? 0) + 1);
  }

  return rows.map((row) => {
    const base = mapRow(row);
    const authUserId = base.authUserId;
    return {
      ...base,
      username: authUserId ? usernameMap.get(authUserId) ?? null : null,
      masterCard: cardMap.get(base.id) ?? null,
      vehicleCount: vehicleCountMap.get(base.id) ?? 0,
    };
  });
}

export async function getOperatorById(id: string): Promise<OperatorRow | null> {
  const admin = createSupabaseAdminClient();

  let data: Record<string, unknown> | null = null;
  const res = await admin
    .from("fleet_operators")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (res.error && res.error.message.includes("region")) {
    const fb = await admin
      .from("fleet_operators")
      .select(
        `id, name, company_name, phone, email, national_id, tax_number,
         association, avatar_url, bank_account_ref, operator_license_number,
         auth_user_id, created_at, updated_at`
      )
      .eq("id", id)
      .maybeSingle();
    data = fb.data as Record<string, unknown> | null;
  } else {
    data = res.data as Record<string, unknown> | null;
  }

  if (!data) return null;

  const base = mapRow(data);

  let username: string | null = null;
  if (base.authUserId) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(
        base.authUserId
      );
      username =
        (userData?.user?.user_metadata?.username as string | undefined) ?? null;
    } catch {
      /* */
    }
  }

  const { data: card } = await admin
    .from("operator_master_cards")
    .select("id, card_number, balance_szl, status, card_tier")
    .eq("operator_id", id)
    .maybeSingle();

  const { count } = await admin
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("owner_operator_id", id);

  return {
    ...base,
    username,
    masterCard: card
      ? {
          id: card.id as string,
          cardNumber: card.card_number as string,
          balanceSzl: Number(card.balance_szl ?? 0),
          status: card.status as string,
          tier: card.card_tier as string,
        }
      : null,
    vehicleCount: count ?? 0,
  };
}
