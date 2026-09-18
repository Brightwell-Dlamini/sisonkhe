/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FleetOperator, OperatorMasterCard, OperatorMasterCardTransaction, VehicleVirtualCard } from "../types";
import { getAllVirtualCards, topUpVirtualCard, saveAllVirtualCards } from "./virtualCards";

const OPERATORS_STORAGE_KEY = "sisonkhe_fleet_operators";
const MASTER_CARDS_STORAGE_KEY = "sisonkhe_operator_master_cards";

// Default seed operators based on fleet registrations
export const INITIAL_OPERATORS: FleetOperator[] = [
  {
    id: "op_cyril_kunene",
    name: "Cyril Kunene",
    companyName: "Kunene Express & Transit Services",
    phone: "+268 7602 8899",
    email: "cyril.kunene@transit.co.sz",
    nationalId: "7405185120899",
    taxNumber: "TIN-SZ-992140",
    association: "Hhohho Kombi Association (HKA)",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    bankAccountRef: "FNB Eswatini • Acc ending 4901",
    operatorLicenseNumber: "OP-HHO-2024-0012"
  },
  {
    id: "op_dumisa_mamba",
    name: "Dumisa Mamba",
    companyName: "Mamba Metro Commuter Fleet",
    phone: "+268 7614 3300",
    email: "dumisa.mamba@mambatransit.sz",
    nationalId: "7809125130841",
    taxNumber: "TIN-SZ-883192",
    association: "Hhohho Kombi Association (HKA)",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    bankAccountRef: "Standard Bank SZ • Acc ending 8810",
    operatorLicenseNumber: "OP-HHO-2023-0094"
  },
  {
    id: "op_sabelo_hlophe",
    name: "Sabelo Hlophe",
    companyName: "Hlophe Inter-City Logistics",
    phone: "+268 7642 7711",
    email: "sabelo.hlophe@hlophetransit.sz",
    nationalId: "8103155110901",
    taxNumber: "TIN-SZ-774109",
    association: "Hhohho Kombi Association (HKA)",
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200",
    bankAccountRef: "Nedbank Eswatini • Acc ending 1204",
    operatorLicenseNumber: "OP-HHO-2025-0142"
  },
  {
    id: "op_melusi_simelane",
    name: "Melusi Simelane",
    companyName: "Simelane Brothers Transit",
    phone: "+268 7605 9911",
    email: "melusi@simelanetransit.co.sz",
    nationalId: "9004125130922",
    taxNumber: "TIN-SZ-663189",
    association: "Manzini Kombi Association (MKA)",
    avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200",
    bankAccountRef: "FNB Eswatini • Acc ending 3190",
    operatorLicenseNumber: "OP-MNZ-2024-0055"
  },
  {
    id: "op_sandile_mamba",
    name: "Sandile Mamba",
    companyName: "Lubombo Coastal Express",
    phone: "+268 7635 1100",
    email: "sandile.mamba@lubombotransit.sz",
    nationalId: "8507205160822",
    taxNumber: "TIN-SZ-551029",
    association: "Lubombo Regional Transport (LRT)",
    avatarUrl: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200",
    bankAccountRef: "Standard Bank SZ • Acc ending 7731",
    operatorLicenseNumber: "OP-LUB-2023-0081"
  },
  {
    id: "op_mandla_ndlangamandla",
    name: "Mandla Ndlangamandla",
    companyName: "Nhlangano Metro Shuttle",
    phone: "+268 7655 7788",
    email: "mandla@nhlanganotransit.sz",
    nationalId: "8909105150882",
    taxNumber: "TIN-SZ-449102",
    association: "Shiselweni Transport Union (STU)",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    bankAccountRef: "FNB Eswatini • Acc ending 9942",
    operatorLicenseNumber: "OP-SHI-2024-0033"
  }
];

// Helper to deterministic 16-digit card number for an operator master card
function generateMaster16DigitCardNumber(opId: string): string {
  const clean = opId.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  let hash = 9182;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const pos = Math.abs(hash);
  const part2 = String(1000 + (pos % 9000));
  const part3 = String(1000 + (Math.floor(pos / 10) % 9000));
  const part4 = String(1000 + (Math.floor(pos / 100) % 9000));
  return `5342 99${part2.substring(2)} ${part3} ${part4}`;
}

export function getAllOperators(): FleetOperator[] {
  try {
    const raw = localStorage.getItem(OPERATORS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(INITIAL_OPERATORS));
      return INITIAL_OPERATORS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_OPERATORS;
  } catch (e) {
    console.error("Error loading fleet operators:", e);
    return INITIAL_OPERATORS;
  }
}

export function saveAllOperators(operators: FleetOperator[]): void {
  try {
    localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(operators));
    window.dispatchEvent(new CustomEvent("sisonkhe_operators_updated"));
  } catch (e) {
    console.error("Error saving fleet operators:", e);
  }
}

export function getAllOperatorMasterCards(): Record<string, OperatorMasterCard> {
  try {
    const raw = localStorage.getItem(MASTER_CARDS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading operator master cards from storage:", e);
    return {};
  }
}

export function saveAllOperatorMasterCards(cards: Record<string, OperatorMasterCard>): void {
  try {
    localStorage.setItem(MASTER_CARDS_STORAGE_KEY, JSON.stringify(cards));
    window.dispatchEvent(new CustomEvent("sisonkhe_operator_cards_updated"));
  } catch (e) {
    console.error("Error saving operator master cards to storage:", e);
  }
}

export function getOrCreateOperatorMasterCard(operator: FleetOperator): OperatorMasterCard {
  if (!operator || !operator.id) {
    throw new Error("Operator is required to get or create Master Card");
  }

  const allCards = getAllOperatorMasterCards();
  if (allCards[operator.id]) {
    return allCards[operator.id];
  }

  // Create new Master Card with generous enterprise seed balance
  const now = new Date();
  const cardId = `MCARD-${operator.id.toUpperCase()}`;
  const cardNumber = generateMaster16DigitCardNumber(operator.id);
  const initialBalance = 15000.0; // E 15,000.00 initial enterprise balance

  const initialTxs: OperatorMasterCardTransaction[] = [
    {
      id: "tx_op_topup_" + Date.now(),
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      type: "MASTER_TOP_UP",
      description: "Enterprise Fleet Account Deposit (FNB Eswatini EFT Direct)",
      category: "Other",
      amountSZL: 20000.0,
      direction: "CREDIT",
      receiptNumber: "EFT-SZ-2026-" + Math.floor(100000 + Math.random() * 900000),
      paymentMethod: "FNB Bank EFT",
      status: "Completed"
    },
    {
      id: "tx_op_disburse_prev_" + Date.now(),
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      type: "VEHICLE_DISBURSEMENT",
      description: "Weekly Fuel Allowance disbursement to fleet",
      targetVehicleReg: "HSD 101 BM",
      targetDriverName: "Melusi Simelane",
      category: "Fuel Allowance",
      amountSZL: 5000.0,
      direction: "DEBIT",
      receiptNumber: "DISB-FLT-" + Math.floor(100000 + Math.random() * 900000),
      status: "Completed"
    }
  ];

  const newCard: OperatorMasterCard = {
    id: cardId,
    cardNumber,
    cvv: "841",
    expiryDate: "12/29",
    operatorId: operator.id,
    operatorName: operator.name,
    companyName: operator.companyName,
    balanceSZL: initialBalance,
    status: "Active",
    cardTier: "Enterprise Master Concession",
    dailyTransferLimitSZL: 25000.0,
    createdAt: now.toISOString(),
    transactions: initialTxs
  };

  allCards[operator.id] = newCard;
  saveAllOperatorMasterCards(allCards);
  return newCard;
}

// Top-up Master Card
export function topUpOperatorMasterCard(
  operatorId: string,
  amount: number,
  paymentMethod: string = "MTN MoMo Business",
  reference?: string
): { success: boolean; card: OperatorMasterCard; receiptRef: string } {
  const allCards = getAllOperatorMasterCards();
  const card = allCards[operatorId];
  if (!card) {
    throw new Error(`Master card not found for operator ${operatorId}`);
  }

  const receiptRef = reference || ("TOP-OP-" + Math.floor(100000 + Math.random() * 900000));
  const newTx: OperatorMasterCardTransaction = {
    id: "tx_op_top_" + Date.now(),
    timestamp: new Date().toISOString(),
    type: "MASTER_TOP_UP",
    description: `Master Account Top-Up via ${paymentMethod}`,
    amountSZL: amount,
    direction: "CREDIT",
    receiptNumber: receiptRef,
    paymentMethod,
    status: "Completed"
  };

  card.balanceSZL += amount;
  card.transactions.unshift(newTx);

  allCards[operatorId] = card;
  saveAllOperatorMasterCards(allCards);

  return { success: true, card, receiptRef };
}

// Disburse money from Master Card to a specific Vehicle Virtual Card
export function disburseFundsToVehicle(
  operatorId: string,
  vehicleReg: string,
  driverName: string,
  amount: number,
  category: "Fuel Allowance" | "Daily Rank Fee Budget" | "Maintenance" | "Emergency Driver Cash" | "Permit Renewal" | "Other" = "Fuel Allowance",
  note?: string
): {
  success: boolean;
  masterCard: OperatorMasterCard;
  vehicleCard?: VehicleVirtualCard;
  receiptRef?: string;
  error?: string;
} {
  const allMasterCards = getAllOperatorMasterCards();
  const masterCard = allMasterCards[operatorId];

  if (!masterCard) {
    return { success: false, masterCard: null as any, error: "Operator Master Card not found" };
  }

  if (masterCard.status !== "Active") {
    return { success: false, masterCard, error: "Master Card is currently frozen" };
  }

  if (masterCard.balanceSZL < amount) {
    return {
      success: false,
      masterCard,
      error: `Insufficient Master Card balance (E${masterCard.balanceSZL.toFixed(2)} available, E${amount.toFixed(2)} requested)`
    };
  }

  const receiptRef = "DISB-" + Math.floor(100000 + Math.random() * 900000);
  const regNorm = vehicleReg.trim().toUpperCase();

  // 1. Debit Master Card
  const masterTx: OperatorMasterCardTransaction = {
    id: "tx_disb_" + Date.now(),
    timestamp: new Date().toISOString(),
    type: "VEHICLE_DISBURSEMENT",
    description: note || `Disbursement: ${category} for vehicle ${regNorm}`,
    targetVehicleReg: regNorm,
    targetDriverName: driverName,
    category,
    amountSZL: amount,
    direction: "DEBIT",
    receiptNumber: receiptRef,
    status: "Completed"
  };

  masterCard.balanceSZL -= amount;
  masterCard.transactions.unshift(masterTx);
  allMasterCards[operatorId] = masterCard;
  saveAllOperatorMasterCards(allMasterCards);

  // 2. Credit Vehicle Virtual Card
  try {
    const updatedVehicleCard = topUpVirtualCard(
      regNorm,
      amount,
      `Master Card Transfer: ${category} (${receiptRef})`
    );

    return {
      success: true,
      masterCard,
      vehicleCard: updatedVehicleCard,
      receiptRef
    };
  } catch (err: any) {
    // If vehicle card didn't exist, we still debited master card or we can catch it
    return {
      success: true,
      masterCard,
      receiptRef,
      error: err?.message
    };
  }
}

// Pay Permit Renewal with Master Card
export function payPermitRenewalWithMasterCard(
  operatorId: string,
  vehicleReg: string,
  amount: number,
  renewalId: string
): {
  success: boolean;
  masterCard: OperatorMasterCard;
  receiptRef?: string;
  error?: string;
} {
  const allMasterCards = getAllOperatorMasterCards();
  const masterCard = allMasterCards[operatorId];

  if (!masterCard) {
    return { success: false, masterCard: null as any, error: "Operator Master Card not found" };
  }

  if (masterCard.balanceSZL < amount) {
    return {
      success: false,
      masterCard,
      error: `Insufficient Master Card balance for permit renewal (E${masterCard.balanceSZL.toFixed(2)} available, E${amount.toFixed(2)} required)`
    };
  }

  const receiptRef = "REN-PAY-" + Math.floor(100000 + Math.random() * 900000);
  const masterTx: OperatorMasterCardTransaction = {
    id: "tx_ren_pay_" + Date.now(),
    timestamp: new Date().toISOString(),
    type: "PERMIT_RENEWAL_FEE",
    description: `Official NRTC Road Permit Renewal Fee for ${vehicleReg} (${renewalId})`,
    targetVehicleReg: vehicleReg,
    category: "Permit Renewal",
    amountSZL: amount,
    direction: "DEBIT",
    receiptNumber: receiptRef,
    status: "Completed"
  };

  masterCard.balanceSZL -= amount;
  masterCard.transactions.unshift(masterTx);
  allMasterCards[operatorId] = masterCard;
  saveAllOperatorMasterCards(allMasterCards);

  return { success: true, masterCard, receiptRef };
}

// Toggle Freeze / Active on Master Card
export function toggleFreezeOperatorMasterCard(operatorId: string): OperatorMasterCard {
  const allCards = getAllOperatorMasterCards();
  const card = allCards[operatorId];
  if (!card) {
    throw new Error(`Master card not found for operator ${operatorId}`);
  }

  card.status = card.status === "Active" ? "Frozen" : "Active";
  allCards[operatorId] = card;
  saveAllOperatorMasterCards(allCards);
  return card;
}
