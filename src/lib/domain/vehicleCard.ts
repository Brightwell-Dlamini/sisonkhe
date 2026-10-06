/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vehicle virtual card issuance — money truth (zero balance until funded).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { nextReceiptNumber, nextVirtualCardNumber } from "./serials";
import { normalizePlate } from "./identity";

export type IssueCardInput = {
  registrationNumber: string;
  vic: string | null;
  cardholderName: string;
  registrationFeeAmount?: number;
  /** Only true when a real settlement was recorded */
  registrationFeePaid?: boolean;
};

export async function issueVehicleVirtualCard(
  admin: SupabaseClient,
  input: IssueCardInput
): Promise<{ cardId: string; cardNumber: string; receiptRef: string | null }> {
  const plate = normalizePlate(input.registrationNumber);
  const cardId = `VCARD-${plate.replace(/\s+/g, "-")}`;
  const cardNumber = await nextVirtualCardNumber(admin);
  const feePaid = input.registrationFeePaid === true;
  const feeAmount = input.registrationFeeAmount ?? 450;
  const receiptRef = feePaid
    ? await nextReceiptNumber(admin, "RCP-REG")
    : null;

  const now = new Date();
  const y = now.getFullYear() % 100;
  const m = String((now.getMonth() + 48) % 12 || 12).padStart(2, "0"); // +4y expiry display

  await admin.from("vehicle_virtual_cards").upsert(
    {
      id: cardId,
      card_number: cardNumber,
      cvv_hash: null,
      expiry_date: `${m}/${String(y + 4).padStart(2, "0")}`,
      vehicle_reg: plate,
      vic: input.vic,
      cardholder_name: input.cardholderName || "Fleet Operator",
      status: "Active",
      balance_szl: 0,
      registration_fee_paid: feePaid,
      registration_fee_amount: feeAmount,
      registration_fee_date: feePaid ? now.toISOString().split("T")[0] : null,
      registration_receipt_ref: receiptRef,
      card_tier: "Commercial Concession",
      daily_spend_limit_szl: 1500.0,
      qr_payload: null,
    },
    { onConflict: "id" }
  );

  return { cardId, cardNumber, receiptRef };
}
