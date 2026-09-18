import { Vehicle, Driver, VehicleVirtualCard, VirtualCardTransaction } from "../types";
import { generateVIC } from "./helper";

const STORAGE_KEY = "sisonkhe_vehicle_virtual_cards";

// Deterministic card number generator from vehicle reg
function generate16DigitCardNumber(vehicleReg: string): string {
  const clean = vehicleReg.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const part2 = String(1000 + (positiveHash % 9000));
  const part3 = String(1000 + (Math.floor(positiveHash / 10) % 9000));
  const part4 = String(1000 + (Math.floor(positiveHash / 100) % 9000));
  return `5342 ${part2} ${part3} ${part4}`;
}

// Generate CVV from vehicle reg
function generateCVV(vehicleReg: string): string {
  const clean = vehicleReg.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
  }
  return String(100 + Math.abs(hash % 900));
}

// Format QR payload for rapid transit scanning
export function generateCardQRPayload(card: VehicleVirtualCard): string {
  const payload = {
    app: "Sisonkhe In Transit",
    type: "VIRTUAL_TRANSIT_CARD",
    cardId: card.id,
    cardNumber: card.cardNumber,
    reg: card.vehicleReg,
    vic: card.vic,
    holder: card.cardholderName,
    balanceSZL: card.balanceSZL,
    status: card.status,
    regFeePaid: card.registrationFeePaid,
    regFeeRef: card.registrationReceiptRef,
    expiry: card.expiryDate,
    sig: "SZ-" + Math.abs(card.cardNumber.split(" ").reduce((acc, part) => acc + Number(part), 0)).toString(16)
  };
  return JSON.stringify(payload);
}

// Get all stored virtual cards
export function getAllVirtualCards(): Record<string, VehicleVirtualCard> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading virtual cards from storage:", e);
    return {};
  }
}

// Save all virtual cards
export function saveAllVirtualCards(cards: Record<string, VehicleVirtualCard>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    window.dispatchEvent(new CustomEvent("sisonkhe_virtual_cards_updated"));
  } catch (e) {
    console.error("Error saving virtual cards to storage:", e);
  }
}

// Get or create a unique virtual card for a vehicle
export function getOrCreateVehicleVirtualCard(vehicle: Vehicle, driver?: Driver): VehicleVirtualCard {
  if (!vehicle || !vehicle.registrationNumber) {
    throw new Error("Vehicle is required to generate a virtual card");
  }

  const allCards = getAllVirtualCards();
  const regNorm = vehicle.registrationNumber.trim().toUpperCase();

  if (allCards[regNorm]) {
    // If driver is provided and cardholder isn't set, update it
    if (driver && (!allCards[regNorm].driverName || allCards[regNorm].driverId !== driver.id)) {
      allCards[regNorm].driverId = driver.id;
      allCards[regNorm].driverName = driver.fullName;
      if (!allCards[regNorm].cardholderName || allCards[regNorm].cardholderName === "Fleet Operator") {
        allCards[regNorm].cardholderName = driver.fullName;
      }
      saveAllVirtualCards(allCards);
    }
    return allCards[regNorm];
  }

  // Create new unique card
  const vic = vehicle.vic || vehicle.fleetNumber || generateVIC(vehicle.registrationNumber);
  const cardNumber = generate16DigitCardNumber(regNorm);
  const cvv = generateCVV(regNorm);
  const cardId = `VCARD-${regNorm.replace(/\s+/g, "-")}`;
  const holderName = driver?.fullName || vehicle.ownerName || "Fleet Operator";
  const regFeeReceipt = `RCP-REG-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  const now = new Date();
  const initialTransactions: VirtualCardTransaction[] = [
    {
      id: "tx_init_" + Date.now(),
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      type: "TOP_UP",
      description: "Initial Fleet Concession Account Preload (MTN MoMo Business)",
      amountSZL: 2000.0,
      direction: "CREDIT",
      receiptNumber: "MOMO-BIZ-" + Math.floor(100000 + Math.random() * 900000),
      status: "Completed"
    },
    {
      id: "tx_reg_" + Date.now(),
      timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      type: "REGISTRATION_FEE",
      description: "Annual Ministry of Transport Concession & Vehicle Registration Fee",
      amountSZL: 450.0,
      direction: "DEBIT",
      terminalOrMarshal: "Ministry Licensing Registry (Mbabane)",
      receiptNumber: regFeeReceipt,
      status: "Completed"
    },
    {
      id: "tx_rank_" + Date.now(),
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      type: "RANK_FEE",
      description: "Municipal Terminal Departure Rank Fee (E 25.00)",
      amountSZL: 25.0,
      direction: "DEBIT",
      terminalOrMarshal: "Marshal Nomvula Gamedze (Bay 01)",
      receiptNumber: "RNK-" + Math.floor(100000 + Math.random() * 900000),
      status: "Completed"
    }
  ];

  const initialBalance = 2000.0 - 450.0 - 25.0; // E 1,525.00

  const newCard: VehicleVirtualCard = {
    id: cardId,
    cardNumber,
    cvv,
    expiryDate: "09/31",
    vehicleReg: regNorm,
    vic,
    cardholderName: holderName,
    driverId: driver?.id || vehicle.driverId,
    driverName: driver?.fullName,
    status: "Active",
    balanceSZL: initialBalance,
    registrationFeePaid: true,
    registrationFeeAmount: 450.0,
    registrationFeeDate: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString().split("T")[0],
    registrationReceiptRef: regFeeReceipt,
    cardTier: "Commercial Concession",
    dailySpendLimitSZL: 1500.0,
    createdAt: now.toISOString(),
    qrPayload: "",
    transactions: initialTransactions
  };

  newCard.qrPayload = generateCardQRPayload(newCard);

  allCards[regNorm] = newCard;
  saveAllVirtualCards(allCards);

  return newCard;
}

// Top up virtual card balance
export function topUpVirtualCard(
  vehicleReg: string,
  amount: number,
  notes: string = "Account Reload (MTN MoMo / e-Mlangeni)"
): VehicleVirtualCard {
  const allCards = getAllVirtualCards();
  const regNorm = vehicleReg.trim().toUpperCase();
  const card = allCards[regNorm];

  if (!card) {
    throw new Error(`Virtual card for ${vehicleReg} not found`);
  }

  const newTx: VirtualCardTransaction = {
    id: "tx_topup_" + Date.now(),
    timestamp: new Date().toISOString(),
    type: "TOP_UP",
    description: notes,
    amountSZL: amount,
    direction: "CREDIT",
    receiptNumber: "TOP-" + Math.floor(100000 + Math.random() * 900000),
    status: "Completed"
  };

  card.balanceSZL += amount;
  card.transactions.unshift(newTx);
  card.qrPayload = generateCardQRPayload(card);

  allCards[regNorm] = card;
  saveAllVirtualCards(allCards);

  return card;
}

// Charge virtual card for rank fee or other transactions
export function chargeVirtualCard(
  vehicleReg: string,
  amount: number,
  type: VirtualCardTransaction["type"] = "RANK_FEE",
  description: string = "Terminal Departure Rank Fee",
  marshalOrTerminal?: string
): { success: boolean; card: VehicleVirtualCard; receiptRef?: string; error?: string } {
  const allCards = getAllVirtualCards();
  const regNorm = vehicleReg.trim().toUpperCase();
  const card = allCards[regNorm];

  if (!card) {
    return { success: false, card: null as any, error: `No virtual card found for ${vehicleReg}` };
  }

  if (card.status !== "Active") {
    return { success: false, card, error: `Virtual card is ${card.status}` };
  }

  if (card.balanceSZL < amount) {
    return {
      success: false,
      card,
      error: `Insufficient balance (E ${card.balanceSZL.toFixed(2)} available, E ${amount.toFixed(2)} required)`
    };
  }

  const receiptRef = "PAY-" + Math.floor(100000 + Math.random() * 900000);
  const newTx: VirtualCardTransaction = {
    id: "tx_pay_" + Date.now(),
    timestamp: new Date().toISOString(),
    type,
    description,
    amountSZL: amount,
    direction: "DEBIT",
    terminalOrMarshal: marshalOrTerminal,
    receiptNumber: receiptRef,
    status: "Completed"
  };

  card.balanceSZL -= amount;
  card.transactions.unshift(newTx);
  card.qrPayload = generateCardQRPayload(card);

  allCards[regNorm] = card;
  saveAllVirtualCards(allCards);

  return { success: true, card, receiptRef };
}

// Toggle Freeze / Unfreeze
export function toggleFreezeVirtualCard(vehicleReg: string): VehicleVirtualCard {
  const allCards = getAllVirtualCards();
  const regNorm = vehicleReg.trim().toUpperCase();
  const card = allCards[regNorm];

  if (!card) {
    throw new Error(`Virtual card for ${vehicleReg} not found`);
  }

  card.status = card.status === "Active" ? "Frozen" : "Active";
  card.qrPayload = generateCardQRPayload(card);

  allCards[regNorm] = card;
  saveAllVirtualCards(allCards);

  return card;
}
