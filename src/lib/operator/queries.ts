/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Operator-scoped queries. All operations resolve to the authenticated
 * operator's own master card and vehicle fleet.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

// ---------------------------------------------------------------------------
// Master Card
// ---------------------------------------------------------------------------

export interface OperatorMasterCard {
  id: string;
  cardNumber: string;
  expiryDate: string;
  operatorId: string;
  operatorName: string;
  companyName: string;
  balanceSzl: number;
  status: "Active" | "Frozen";
  cardTier: string;
  dailyTransferLimitSzl: number;
  createdAt: string;
}

export interface OperatorMasterCardTransaction {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  targetVehicleReg: string | null;
  targetDriverName: string | null;
  category: string | null;
  amountSzl: number;
  direction: "DEBIT" | "CREDIT";
  receiptNumber: string;
  paymentMethod: string | null;
  status: string;
}

export async function getOperatorMasterCard(
  operatorId: string
): Promise<OperatorMasterCard | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("operator_master_cards")
    .select(
      "id, card_number, expiry_date, operator_id, operator_name, company_name, balance_szl, status, card_tier, daily_transfer_limit_szl, created_at"
    )
    .eq("operator_id", operatorId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    cardNumber: data.card_number as string,
    expiryDate: data.expiry_date as string,
    operatorId: data.operator_id as string,
    operatorName: data.operator_name as string,
    companyName: data.company_name as string,
    balanceSzl: Number(data.balance_szl ?? 0),
    status: data.status as "Active" | "Frozen",
    cardTier: (data.card_tier as string) ?? "Enterprise Master Concession",
    dailyTransferLimitSzl: Number(data.daily_transfer_limit_szl ?? 0),
    createdAt: data.created_at as string,
  };
}

export async function listMasterCardTransactions(
  operatorId: string,
  limit: number = 100
): Promise<OperatorMasterCardTransaction[]> {
  const admin = createSupabaseAdminClient();

  const { data: card } = await admin
    .from("operator_master_cards")
    .select("id")
    .eq("operator_id", operatorId)
    .maybeSingle();

  if (!card) return [];

  const { data, error } = await admin
    .from("operator_card_transactions")
    .select(
      "id, timestamp, type, description, target_vehicle_reg, target_driver_name, category, amount_szl, direction, receipt_number, payment_method, status"
    )
    .eq("card_id", card.id as string)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((t) => ({
    id: t.id as string,
    timestamp: t.timestamp as string,
    type: t.type as string,
    description: t.description as string,
    targetVehicleReg: (t.target_vehicle_reg as string | null) ?? null,
    targetDriverName: (t.target_driver_name as string | null) ?? null,
    category: (t.category as string | null) ?? null,
    amountSzl: Number(t.amount_szl ?? 0),
    direction: t.direction as "DEBIT" | "CREDIT",
    receiptNumber: t.receipt_number as string,
    paymentMethod: (t.payment_method as string | null) ?? null,
    status: t.status as string,
  }));
}

// ---------------------------------------------------------------------------
// Fleet vehicle cards
// ---------------------------------------------------------------------------

export interface VehicleCardSummary {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  cardId: string | null;
  cardNumber: string | null;
  cardStatus: string | null;
  balanceSzl: number;
  registrationFeePaid: boolean;
  driverName: string | null;
  driverPhone: string | null;
}

export async function listOperatorVehicleCards(
  operatorId: string
): Promise<VehicleCardSummary[]> {
  const admin = createSupabaseAdminClient();

  // 1. Vehicles owned by this operator
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("registration_number, vic, make, model, driver_id")
    .eq("owner_operator_id", operatorId);

  const list = vehicles ?? [];
  if (list.length === 0) return [];

  const regs = list.map((v) => v.registration_number as string);
  const driverIds = list
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  // 2. Their virtual cards
  const { data: cards } = await admin
    .from("vehicle_virtual_cards")
    .select(
      "id, card_number, vehicle_reg, balance_szl, status, registration_fee_paid"
    )
    .in("vehicle_reg", regs);

  const cardMap = new Map<string, Record<string, unknown>>();
  for (const c of cards ?? []) {
    cardMap.set(c.vehicle_reg as string, c);
  }

  // 3. Driver names
  const driverMap = new Map<string, { name: string; phone: string | null }>();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name, phone")
      .in("id", driverIds);
    for (const d of drivers ?? []) {
      driverMap.set(d.id as string, {
        name: d.full_name as string,
        phone: (d.phone as string | null) ?? null,
      });
    }
  }

  return list.map((v) => {
    const card = cardMap.get(v.registration_number as string);
    const driverId = v.driver_id as string | null;
    const driver = driverId ? driverMap.get(driverId) : undefined;
    return {
      registrationNumber: v.registration_number as string,
      vic: (v.vic as string | null) ?? null,
      make: v.make as string,
      model: v.model as string,
      cardId: card ? (card.id as string) : null,
      cardNumber: card ? (card.card_number as string) : null,
      cardStatus: card ? (card.status as string) : null,
      balanceSzl: card ? Number(card.balance_szl ?? 0) : 0,
      registrationFeePaid: card ? Boolean(card.registration_fee_paid) : false,
      driverName: driver?.name ?? null,
      driverPhone: driver?.phone ?? null,
    };
  });
}

export interface VehicleCardDetail extends VehicleCardSummary {
  expiryDate: string | null;
  cardTier: string | null;
  transactions: Array<{
    id: string;
    timestamp: string;
    type: string;
    description: string;
    amountSzl: number;
    direction: "DEBIT" | "CREDIT";
    receiptNumber: string;
    status: string;
  }>;
}

export async function getOperatorVehicleCard(
  operatorId: string,
  registrationNumber: string
): Promise<VehicleCardDetail | null> {
  const admin = createSupabaseAdminClient();
  const reg = registrationNumber.trim().toUpperCase();

  // Verify ownership
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("registration_number, vic, make, model, driver_id")
    .eq("registration_number", reg)
    .eq("owner_operator_id", operatorId)
    .maybeSingle();

  if (!vehicle) return null;

  const { data: card } = await admin
    .from("vehicle_virtual_cards")
    .select(
      "id, card_number, expiry_date, balance_szl, status, card_tier, registration_fee_paid, registration_fee_amount"
    )
    .eq("vehicle_reg", reg)
    .maybeSingle();

  let transactions: VehicleCardDetail["transactions"] = [];
  if (card) {
    const { data: txs } = await admin
      .from("virtual_card_transactions")
      .select(
        "id, timestamp, type, description, amount_szl, direction, receipt_number, status"
      )
      .eq("card_id", card.id as string)
      .order("timestamp", { ascending: false })
      .limit(50);

    transactions = (txs ?? []).map((t) => ({
      id: t.id as string,
      timestamp: t.timestamp as string,
      type: t.type as string,
      description: t.description as string,
      amountSzl: Number(t.amount_szl ?? 0),
      direction: t.direction as "DEBIT" | "CREDIT",
      receiptNumber: t.receipt_number as string,
      status: t.status as string,
    }));
  }

  // Driver
  let driverName: string | null = null;
  let driverPhone: string | null = null;
  if (vehicle.driver_id) {
    const { data: drv } = await admin
      .from("drivers")
      .select("full_name, phone")
      .eq("id", vehicle.driver_id as string)
      .maybeSingle();
    if (drv) {
      driverName = drv.full_name as string;
      driverPhone = (drv.phone as string | null) ?? null;
    }
  }

  return {
    registrationNumber: vehicle.registration_number as string,
    vic: (vehicle.vic as string | null) ?? null,
    make: vehicle.make as string,
    model: vehicle.model as string,
    cardId: card ? (card.id as string) : null,
    cardNumber: card ? (card.card_number as string) : null,
    cardStatus: card ? (card.status as string) : null,
    balanceSzl: card ? Number(card.balance_szl ?? 0) : 0,
    registrationFeePaid: card ? Boolean(card.registration_fee_paid) : false,
    driverName,
    driverPhone,
    expiryDate: card ? (card.expiry_date as string) : null,
    cardTier: card ? ((card.card_tier as string) ?? null) : null,
    transactions,
  };
}
