import React, { useState, useEffect } from "react";
import {
  CreditCard,
  ShieldCheck,
  X,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Printer,
  Download,
  AlertCircle,
  Lock,
  Unlock,
  Sparkles,
  Receipt,
  User,
  Fuel,
  Coins
} from "lucide-react";
import { Vehicle, Driver, VehicleVirtualCard, VirtualCardTransaction } from "../../types";
import {
  getOrCreateVehicleVirtualCard,
  topUpVirtualCard,
  chargeVirtualCard,
  toggleFreezeVirtualCard
} from "../../utils/virtualCards";
import QRCodeView from "../common/QRCodeView";
import VirtualTransitCard from "../common/VirtualTransitCard";

interface VehicleVirtualCardModalProps {
  vehicle: Vehicle;
  driver?: Driver;
  onClose: () => void;
  isNewRegistration?: boolean;
}

export default function VehicleVirtualCardModal({
  vehicle,
  driver,
  onClose,
  isNewRegistration = false
}: VehicleVirtualCardModalProps) {
  const [card, setCard] = useState<VehicleVirtualCard>(() =>
    getOrCreateVehicleVirtualCard(vehicle, driver)
  );
  const [activeTab, setActiveTab] = useState<"card" | "transactions" | "qr">("card");
  const [showSensitive, setShowSensitive] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(250);
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(
    isNewRegistration
      ? "🎉 Vehicle registered! Unique virtual transit card issued with registration fee recorded."
      : null
  );

  // Sync when card changes in storage
  useEffect(() => {
    const handleUpdate = () => {
      setCard(getOrCreateVehicleVirtualCard(vehicle, driver));
    };
    window.addEventListener("sisonkhe_virtual_cards_updated", handleUpdate);
    return () => {
      window.removeEventListener("sisonkhe_virtual_cards_updated", handleUpdate);
    };
  }, [vehicle, driver]);

  const handleCopyCardNumber = () => {
    navigator.clipboard.writeText(card.cardNumber.replace(/\s+/g, ""));
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleQuickTopUp = (amount: number) => {
    setIsProcessingTopUp(true);
    setTimeout(() => {
      const updated = topUpVirtualCard(
        card.vehicleReg,
        amount,
        `Mobile Money Reload (+E${amount.toFixed(2)}) via MTN MoMo`
      );
      setCard({ ...updated });
      setIsProcessingTopUp(false);
      setToastMessage(`✓ Successfully added E ${amount.toFixed(2)} to card balance!`);
      setTimeout(() => setToastMessage(null), 3000);
    }, 600);
  };

  const handleSimulateMarshalRankScan = () => {
    const res = chargeVirtualCard(
      card.vehicleReg,
      25.0,
      "RANK_FEE",
      "Rank Marshal QR Tap Payment (E 25.00)",
      "Marshal Nomvula Gamedze"
    );
    if (res.success) {
      setCard({ ...res.card });
      setToastMessage(`✓ Paid E25.00 Rank Fee via QR scan! Receipt Ref: ${res.receiptRef}`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage(`⚠️ Payment failed: ${res.error}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleToggleFreeze = () => {
    const updated = toggleFreezeVirtualCard(card.vehicleReg);
    setCard({ ...updated });
    setToastMessage(
      updated.status === "Frozen"
        ? "🔒 Virtual Card temporarily frozen for security."
        : "🔓 Virtual Card reactivated and ready for transactions."
    );
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-6 text-zinc-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  Vehicle Virtual Transit Card
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  VIC: {card.vic}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  card.status === "Active"
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                }`}>
                  {card.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Dedicated digital smart card for commercial registration fee, rank levies & fuel allowances.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast feedback */}
        {toastMessage && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300 text-xs underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab("card")}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "card"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-500" />
            <span>Digital Card & Top-Up</span>
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "transactions"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span>Transactions ({card.transactions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "qr"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-purple-500" />
            <span>Transit QR Pass</span>
          </button>
        </div>

        {/* TAB 1: DIGITAL CARD & CONTROLS */}
        {activeTab === "card" && (
          <div className="space-y-6">
            {/* The Standardized Commercial Virtual Transit Pass */}
            <VirtualTransitCard
              card={card}
              driver={driver}
              vehicle={vehicle}
            />

            {/* Registration Fee Status Card */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-300">
                      Concession Registration Fee
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      PAID & RECORDED
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Amount: <strong className="text-zinc-900 dark:text-white font-mono">E {card.registrationFeeAmount.toFixed(2)}</strong> • Ref: <strong className="font-mono text-zinc-900 dark:text-white">{card.registrationReceiptRef}</strong>
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-zinc-500 text-right">
                Paid Date: {card.registrationFeeDate}
              </span>
            </div>

            {/* Quick Balance Top-Up Section */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Quick Top-Up (MTN MoMo / e-Mlangeni)
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Fund the card for rank departures, fuel allowances, and municipal permits.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  Balance: E {card.balanceSZL.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    disabled={isProcessingTopUp || card.status === "Frozen"}
                    onClick={() => handleQuickTopUp(amt)}
                    className="px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3 text-amber-500" />
                    <span>+E {amt}</span>
                  </button>
                ))}

                <button
                  onClick={handleSimulateMarshalRankScan}
                  disabled={card.status === "Frozen"}
                  className="px-3 py-2 bg-zinc-900 hover:bg-black text-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                  title="Simulate Rank Marshal scanning QR to pay E25 rank fee"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Simulate E25 Rank Fee Pay</span>
                </button>
              </div>
            </div>

            {/* Card Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleToggleFreeze}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  card.status === "Active"
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 hover:bg-red-100"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100"
                }`}
              >
                {card.status === "Active" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{card.status === "Active" ? "Freeze Card" : "Unfreeze Card"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("qr")}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Show Card QR</span>
                </button>
                <button
                  onClick={handlePrintCard}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Pass</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSACTION LEDGER */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Transaction History</h3>
                <p className="text-xs text-zinc-500">
                  Verified debits and credits linked to this vehicle's virtual account.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">
                {card.transactions.length} Records
              </span>
            </div>

            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
              {card.transactions.map((tx) => {
                const isCredit = tx.direction === "CREDIT";
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 flex items-center justify-between bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${
                          tx.type === "REGISTRATION_FEE"
                            ? "bg-amber-600"
                            : isCredit
                            ? "bg-emerald-600"
                            : "bg-blue-600"
                        }`}
                      >
                        {tx.type === "REGISTRATION_FEE" ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {tx.description}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {tx.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                          Ref: {tx.receiptNumber} {tx.terminalOrMarshal ? `• ${tx.terminalOrMarshal}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-mono font-bold text-sm ${
                          isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-white"
                        }`}
                      >
                        {isCredit ? "+" : "-"}E {tx.amountSZL.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TRANSIT QR PASS */}
        {activeTab === "qr" && (
          <div className="space-y-4 text-center">
            <div>
              <h3 className="text-sm font-bold">Encrypted Transit Scannable QR Pass</h3>
              <p className="text-xs text-zinc-500">
                Present to rank marshals and highway inspection checkpoints for instant tap-to-pay and concession verification.
              </p>
            </div>

            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3">
              <QRCodeView
                value={card.qrPayload || card.cardNumber}
                size={220}
                showDownload={true}
                showCopyValue={true}
              />

              <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-bold text-zinc-900 dark:text-white">
                  {card.vehicleReg} (VIC: {card.vic})
                </span>
                <span className="block text-[11px] text-zinc-500">
                  Card Ref: {card.cardNumber.slice(0, 9)} •••• {card.cardNumber.slice(-4)}
                </span>
                <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  ✓ Annual Concession Registration Fee: PAID
                </span>
              </div>
            </div>

            <button
              onClick={handleSimulateMarshalRankScan}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all shadow-sm cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>Test Scanner Tap (Deduct E25.00 Rank Fee)</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
