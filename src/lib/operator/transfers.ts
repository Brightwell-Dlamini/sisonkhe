/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { canTransferToVehicle } from "@/lib/domain/operatorRules";
import { normalizePlate } from "@/lib/domain/identity";
import { nextReceiptNumber } from "@/lib/domain/serials";
import { writeAudit } from "@/lib/domain/audit";

export interface TransferInput {
  operatorId: string;
  vehicleReg: string;
  amountSzl: number;
  category: string;
  description?: string;
  actorUserId?: string;
}

export interface TransferResult {
  success: boolean;
  error?: string;
  warning?: string;
  masterReceiptRef?: string;
  vehicleReceiptRef?: string;
  newMasterBalance?: number;
  newVehicleBalance?: number;
}

export async function transferToVehicle(
  input: TransferInput
): Promise<TransferResult> {
  const admin = createSupabaseAdminClient();
  const reg = normalizePlate(input.vehicleReg);

  const { data: masterCard } = await admin
    .from("operator_master_cards")
    .select("id, balance_szl, status, card_tier")
    .eq("operator_id", input.operatorId)
    .maybeSingle();

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("owner_operator_id, driver_id, status")
    .eq("registration_number", reg)
    .maybeSingle();

  const rule = canTransferToVehicle(
    masterCard
      ? {
          status: masterCard.status as string,
          balanceSzl: Number(masterCard.balance_szl ?? 0),
          tier: (masterCard.card_tier as string) ?? null,
        }
      : null,
    input.amountSzl,
    (vehicle?.owner_operator_id as string | null) ?? null,
    input.operatorId
  );

  if (!rule.allowed) {
    return { success: false, error: rule.reason };
  }

  if (!masterCard) {
    return { success: false, error: "Master card not found." };
  }

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

  const masterBalance = Number(masterCard.balance_szl ?? 0);
  const vehicleBalance = Number(vehicleCard.balance_szl ?? 0);
  const now = new Date();
  const masterReceipt = await nextReceiptNumber(admin, "DISB");
  const vehicleReceipt = await nextReceiptNumber(admin, "RCV");

  let driverName: string | null = null;
  if (vehicle?.driver_id) {
    const { data: drv } = await admin
      .from("drivers")
      .select("full_name")
      .eq("id", vehicle.driver_id as string)
      .maybeSingle();
    driverName = (drv?.full_name as string | undefined) ?? null;
  }

  const newMasterBalance = masterBalance - input.amountSzl;
  const newVehicleBalance = vehicleBalance + input.amountSzl;

  // Optimistic concurrency on master balance
  const { data: debited, error: masterErr } = await admin
    .from("operator_master_cards")
    .update({ balance_szl: newMasterBalance })
    .eq("id", masterCard.id as string)
    .eq("balance_szl", masterBalance)
    .select("id")
    .maybeSingle();

  if (masterErr || !debited) {
    return {
      success: false,
      error: "Master debit failed (balance changed). Retry.",
    };
  }

  const masterTxId = `tx_disb_${Date.now()}_${reg.replace(/\s+/g, "").slice(0, 6)}`;
  await admin.from("operator_card_transactions").insert({
    id: masterTxId,
    card_id: masterCard.id as string,
    timestamp: now.toISOString(),
    type: "VEHICLE_DISBURSEMENT",
    description: input.description ?? `${input.category} sent to ${reg}`,
    target_vehicle_reg: reg,
    target_driver_name: driverName,
    category: input.category,
    amount_szl: input.amountSzl,
    direction: "DEBIT",
    receipt_number: masterReceipt,
    status: "Completed",
  });

  const { error: vehicleErr } = await admin
    .from("vehicle_virtual_cards")
    .update({ balance_szl: newVehicleBalance })
    .eq("id", vehicleCard.id as string);

  if (vehicleErr) {
    await admin
      .from("operator_master_cards")
      .update({ balance_szl: masterBalance })
      .eq("id", masterCard.id as string);
    await admin.from("operator_card_transactions").delete().eq("id", masterTxId);

    return {
      success: false,
      error: `Vehicle credit failed, rolled back: ${vehicleErr.message}`,
    };
  }

  await admin.from("virtual_card_transactions").insert({
    id: `tx_rcv_${Date.now()}_${reg.replace(/\s+/g, "").slice(0, 6)}`,
    card_id: vehicleCard.id as string,
    timestamp: now.toISOString(),
    type: "TOP_UP",
    description: `${input.category} from operator master card`,
    amount_szl: input.amountSzl,
    direction: "CREDIT",
    receipt_number: vehicleReceipt,
    status: "Completed",
  });

  await writeAudit(admin, {
    action: "ledger.adjust",
    actorId: input.actorUserId,
    entityType: "vehicle",
    entityId: reg,
    summary: `Transfer E${input.amountSzl.toFixed(2)} to ${reg}`,
    meta: { masterReceipt, vehicleReceipt },
  });

  return {
    success: true,
    warning: rule.warning,
    masterReceiptRef: masterReceipt,
    vehicleReceiptRef: vehicleReceipt,
    newMasterBalance,
    newVehicleBalance,
  };
}
