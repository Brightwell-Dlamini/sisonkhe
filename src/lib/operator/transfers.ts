/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Master Card → Vehicle Card transfers.
 *
 * Atomic operation:
 *   1. Verify master card has balance
 *   2. Debit master card + write master transaction
 *   3. Credit vehicle card + write vehicle transaction
 *
 * If step 3 fails, we roll back step 2.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface TransferInput {
  operatorId: string;
  vehicleReg: string;
  amountSzl: number;
  category: string;
  description?: string;
}

export interface TransferResult {
  success: boolean;
  error?: string;
  masterReceiptRef?: string;
  vehicleReceiptRef?: string;
  newMasterBalance?: number;
  newVehicleBalance?: number;
}

export async function transferToVehicle(
  input: TransferInput
): Promise<TransferResult> {
  const admin = createSupabaseAdminClient();
  const reg = input.vehicleReg.trim().toUpperCase();

  if (input.amountSzl <= 0) {
    return { success: false, error: "Amount must be positive." };
  }

  // 1. Load master card
  const { data: masterCard } = await admin
    .from("operator_master_cards")
    .select("id, balance_szl, status")
    .eq("operator_id", input.operatorId)
    .maybeSingle();

  if (!masterCard) {
    return { success: false, error: "Master card not found." };
  }

  if (masterCard.status === "Frozen") {
    return { success: false, error: "Master card is frozen." };
  }

  const masterBalance = Number(masterCard.balance_szl ?? 0);
  if (masterBalance < input.amountSzl) {
    return {
      success: false,
      error: `Insufficient balance (E${masterBalance.toFixed(2)} available).`,
    };
  }

  // 2. Load vehicle card
  const { data: vehicleCard } = await admin
    .from("vehicle_virtual_cards")
    .select("id, balance_szl, status, vehicle_reg")
    .eq("vehicle_reg", reg)
    .maybeSingle();

  if (!vehicleCard) {
    return { success: false, error: `No card for ${reg}.` };
  }

  if (vehicleCard.status !== "Active") {
    return { success: false, error: `Vehicle card is ${vehicleCard.status}.` };
  }

  // 3. Verify vehicle belongs to this operator
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("owner_operator_id, driver_id")
    .eq("registration_number", reg)
    .maybeSingle();

  if (!vehicle || vehicle.owner_operator_id !== input.operatorId) {
    return { success: false, error: "You don't own this vehicle." };
  }

  const vehicleBalance = Number(vehicleCard.balance_szl ?? 0);
  const now = new Date();
  const masterReceipt = `DISB-${Math.floor(100000 + Math.random() * 900000)}`;
  const vehicleReceipt = `RCV-${Math.floor(100000 + Math.random() * 900000)}`;

  // Driver name for reference
  let driverName: string | null = null;
  if (vehicle.driver_id) {
    const { data: drv } = await admin
      .from("drivers")
      .select("full_name")
      .eq("id", vehicle.driver_id as string)
      .maybeSingle();
    driverName = (drv?.full_name as string | undefined) ?? null;
  }

  const newMasterBalance = masterBalance - input.amountSzl;
  const newVehicleBalance = vehicleBalance + input.amountSzl;

  // 4. Debit master card
  const { error: masterErr } = await admin
    .from("operator_master_cards")
    .update({ balance_szl: newMasterBalance })
    .eq("id", masterCard.id as string);

  if (masterErr) {
    return { success: false, error: `Master debit failed: ${masterErr.message}` };
  }

  // 5. Write master transaction
  const masterTxId = `tx-disb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await admin.from("operator_card_transactions").insert({
    id: masterTxId,
    card_id: masterCard.id as string,
    timestamp: now.toISOString(),
    type: "VEHICLE_DISBURSEMENT",
    description:
      input.description ?? `${input.category} sent to ${reg}`,
    target_vehicle_reg: reg,
    target_driver_name: driverName,
    category: input.category,
    amount_szl: input.amountSzl,
    direction: "DEBIT",
    receipt_number: masterReceipt,
    status: "Completed",
  });

  // 6. Credit vehicle card
  const { error: vehicleErr } = await admin
    .from("vehicle_virtual_cards")
    .update({ balance_szl: newVehicleBalance })
    .eq("id", vehicleCard.id as string);

  if (vehicleErr) {
    // Rollback master card
    await admin
      .from("operator_master_cards")
      .update({ balance_szl: masterBalance })
      .eq("id", masterCard.id as string);
    await admin
      .from("operator_card_transactions")
      .delete()
      .eq("id", masterTxId);

    return {
      success: false,
      error: `Vehicle credit failed, rolled back: ${vehicleErr.message}`,
    };
  }

  // 7. Write vehicle transaction
  await admin.from("virtual_card_transactions").insert({
    id: `tx-rcv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    card_id: vehicleCard.id as string,
    timestamp: now.toISOString(),
    type: "TOP_UP",
    description: `${input.category} from operator master card`,
    amount_szl: input.amountSzl,
    direction: "CREDIT",
    receipt_number: vehicleReceipt,
    status: "Completed",
  });

  return {
    success: true,
    masterReceiptRef: masterReceipt,
    vehicleReceiptRef: vehicleReceipt,
    newMasterBalance,
    newVehicleBalance,
  };
}
