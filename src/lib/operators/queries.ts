/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface OperatorRow {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
  taxNumber: string | null;
  association: string | null;
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
  association, avatar_url, bank_account_ref, operator_license_number,
  auth_user_id, created_at, updated_at
`;

function mapRow(row: Record<string, unknown>): Omit<OperatorRow, "username" | "masterCard" | "vehicleCount"> {
  return {
    id: row.id as string,
    name: row.name as string,
    companyName: row.company_name as string,
    phone: row.phone as string,
    email: (row.email as string | null) ?? null,
    nationalId: (row.national_id as string | null) ?? null,
    taxNumber: (row.tax_number as string | null) ?? null,
    association: (row.association as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    bankAccountRef: (row.bank_account_ref as string | null) ?? null,
    operatorLicenseNumber: (row.operator_license_number as string | null) ?? null,
    authUserId: (row.auth_user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listOperators(): Promise<OperatorRow[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("fleet_operators")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list operators: ${error.message}`);
  if (!data || data.length === 0) return [];

  const operatorIds = data.map((o) => o.id as string);

  // Fetch usernames for those with auth_user_id
  const authIds = data
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
    } catch (err) {
      console.warn("[operators] could not fetch usernames:", err);
    }
  }

  // Fetch master cards
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

  // Count vehicles per operator
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("owner_operator_id")
    .in("owner_operator_id", operatorIds);

  const vehicleCountMap = new Map<string, number>();
  for (const v of vehicles ?? []) {
    const opId = v.owner_operator_id as string | null;
    if (opId) vehicleCountMap.set(opId, (vehicleCountMap.get(opId) ?? 0) + 1);
  }

  return data.map((row) => {
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

  const { data, error } = await admin
    .from("fleet_operators")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch operator: ${error.message}`);
  if (!data) return null;

  const base = mapRow(data);

  let username: string | null = null;
  if (base.authUserId) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(base.authUserId);
      username = (userData?.user?.user_metadata?.username as string | undefined) ?? null;
    } catch (err) {
      console.warn("[operators] could not fetch username:", err);
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
