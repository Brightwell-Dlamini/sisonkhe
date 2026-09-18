import React, { useState } from "react";
import { 
  User, Plus, Search, Eye, EyeOff, Copy, Check, MessageSquare, 
  Send, Phone, ShieldCheck, AlertTriangle, Car, FileBadge, 
  Key, Clock, Sparkles, CreditCard, QrCode
} from "lucide-react";
import { Driver, Vehicle } from "../../types";
import { getOrCreateVehicleVirtualCard } from "../../utils/virtualCards";

interface DriverCredentialsChatSubTabProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onOpenAddDriver: () => void;
  onOpenEditDriver: (driver: Driver) => void;
  onUpdateDrivers: (drivers: Driver[]) => void;
  onOpenVirtualCard?: (vehicle: Vehicle, driver: Driver) => void;
}

export default function DriverCredentialsChatSubTab({
  drivers,
  vehicles,
  onOpenAddDriver,
  onOpenEditDriver,
  onUpdateDrivers,
  onOpenVirtualCard
}: DriverCredentialsChatSubTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Cab Chat State
  const [selectedChatDriverId, setSelectedChatDriverId] = useState<string>(drivers[0]?.id || "");
  const [chatMessages, setChatMessages] = useState<{
    id: string;
    sender: "dispatcher" | "driver";
    driverId: string;
    text: string;
    timestamp: string;
    driverPhoto?: string;
  }[]>([
    {
      id: "m_1",
      sender: "driver",
      driverId: drivers[0]?.id || "d_1",
      text: "Sawubona Dispatcher. Bay 01 loaded with 15 passengers, departing for Manzini now.",
      timestamp: "08:14 AM",
      driverPhoto: drivers[0]?.profilePictureUrl
    },
    {
      id: "m_2",
      sender: "dispatcher",
      driverId: drivers[0]?.id || "d_1",
      text: "Clear to depart. Weather is clear along MR3 highway. Drive safely.",
      timestamp: "08:15 AM"
    }
  ]);
  const [newMsgText, setNewMsgText] = useState("");

  const togglePasswordVisibility = (driverId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [driverId]: !prev[driverId] }));
  };

  const copyCredentials = (driver: Driver) => {
    const credText = `DRIVER CAB CREDENTIALS\nName: ${driver.fullName}\nUsername: ${driver.username || `driver_${driver.fullName.toLowerCase().replace(/\s+/g, "_")}`}\nPassword: ${driver.password || "kombi2026"}\nPDP: ${driver.pdpNumber || "Valid"}`;
    navigator.clipboard.writeText(credText);
    setCopiedId(driver.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredDrivers = drivers.filter(d => 
    d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.phone && d.phone.includes(searchQuery)) ||
    (d.licenseNumber && d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.pdpNumber && d.pdpNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.assignedVehicleReg && d.assignedVehicleReg.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedChatDriver = drivers.find(d => d.id === selectedChatDriverId) || drivers[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim() || !selectedChatDriver) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: "dispatcher" as const,
      driverId: selectedChatDriver.id,
      text: newMsgText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setNewMsgText("");

    // Simulate instant driver acknowledgement
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg_reply_${Date.now()}`,
          sender: "driver" as const,
          driverId: selectedChatDriver.id,
          text: "Received and acknowledged, Dispatch! Terminal cleared.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          driverPhoto: selectedChatDriver.profilePictureUrl
        }
      ]);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            <span>Driver Registry, Cab Credentials & Live Dispatch Chat</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage verified driver credentials, photo ID verification, PDP validity dates, and real-time cab communication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddDriver}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Driver</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Drivers List + Right Live Cab Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DRIVER CREDENTIALS CARDS (8 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search drivers by name, PDP number, phone, license, or vehicle plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Drivers Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {filteredDrivers.map((driver) => {
              const assignedVehicle = vehicles.find(
                v => v.driverId === driver.id || v.registrationNumber === driver.assignedVehicleReg
              );
              const isPasswordShown = !!visiblePasswords[driver.id];
              const isCopied = copiedId === driver.id;

              return (
                <div
                  key={driver.id}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 shadow-sm transition-all space-y-3 ${
                    selectedChatDriverId === driver.id
                      ? "border-blue-500 ring-1 ring-blue-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* Top row: Photo, Name, PDP Badge, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Driver Avatar with Photo upload indicator */}
                      <div className="relative shrink-0">
                        <img
                          src={driver.profilePictureUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"}
                          alt={driver.fullName}
                          className="w-12 h-12 rounded-xl object-cover border-2 border-zinc-200 dark:border-zinc-700 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                          driver.pdpStatus === "Valid" ? "bg-emerald-500" : "bg-amber-500"
                        }`} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                            {driver.fullName}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            driver.pdpStatus === "Valid"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                          }`}>
                            PDP {driver.pdpStatus || "Valid"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{driver.phone || "+268 7600 0000"}</span>
                          <span>•</span>
                          <span>ID: {driver.nationalId || "020101-8100-24"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedChatDriverId(driver.id)}
                        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Open Cab Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>

                      <button
                        onClick={() => onOpenEditDriver(driver)}
                        className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Middle row: Assigned Vehicle & PDP Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-750 font-mono">
                    <div>
                      <span className="text-[9px] uppercase text-zinc-400 block">Assigned Kombi / Bus</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {assignedVehicle ? `${assignedVehicle.registrationNumber} (${assignedVehicle.loadingBay})` : "Unassigned"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase text-zinc-400 block">PDP Expiry Date</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {driver.pdpExpiryDate || "2028-07-14"} ({driver.pdpIssuingAuthority || "Mbabane"})
                      </strong>
                    </div>
                  </div>

                  {/* Bottom row: Cab App Logins Box */}
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs font-mono">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Key className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-zinc-500 text-[10px]">Username:</span>{" "}
                        <strong className="text-zinc-900 dark:text-white">
                          {driver.username || `driver_${driver.fullName.toLowerCase().replace(/\s+/g, "_")}`}
                        </strong>
                      </div>
                      <div className="truncate">
                        <span className="text-zinc-500 text-[10px]">Pass:</span>{" "}
                        <strong className="text-zinc-900 dark:text-white">
                          {isPasswordShown ? (driver.password || "kombi2026") : "••••••••"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => togglePasswordVisibility(driver.id)}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-700 cursor-pointer"
                        title={isPasswordShown ? "Hide Password" : "Show Password"}
                      >
                        {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => copyCredentials(driver)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? "Copied" : "Copy Logins"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Linked Vehicle Virtual Card on Driver Profile */}
                  {assignedVehicle && (() => {
                    const vCard = getOrCreateVehicleVirtualCard(assignedVehicle, driver);
                    return (
                      <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-zinc-900/5 dark:from-amber-950/30 dark:to-zinc-900 border border-amber-300/60 dark:border-amber-700/50 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                                Virtual Card ({assignedVehicle.registrationNumber})
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-mono font-bold">
                                Reg Fee Paid
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                              {vCard.cardNumber} • Balance: <span className="font-bold text-emerald-600 dark:text-emerald-400">E{vCard.balanceSZL.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => onOpenVirtualCard?.(assignedVehicle, driver)}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>Card & QR</span>
                        </button>
                      </div>
                    );
                  })()}

                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE DRIVER CAB DISPATCH CHAT (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 sticky top-6">
            
            {/* Chat Target Driver Header */}
            {selectedChatDriver ? (
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedChatDriver.profilePictureUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"}
                    alt={selectedChatDriver.fullName}
                    className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>{selectedChatDriver.fullName}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {selectedChatDriver.assignedVehicleReg || "Fleet Driver"} • Mobile Cab Connected
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-600">
                  Live Dispatch
                </span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Select a driver to start chatting</div>
            )}

            {/* Messages Feed */}
            <div className="h-80 overflow-y-auto space-y-3 p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-150 dark:border-zinc-800 text-xs">
              {chatMessages
                .filter(m => m.driverId === selectedChatDriver?.id)
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      msg.sender === "dispatcher" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.sender === "driver" && (
                      <img
                        src={msg.driverPhoto || selectedChatDriver?.profilePictureUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"}
                        alt="Driver Avatar"
                        className="w-6 h-6 rounded-full object-cover shrink-0 mb-1 border border-zinc-300"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div
                      className={`max-w-[78%] p-3 rounded-2xl shadow-xs space-y-1 ${
                        msg.sender === "dispatcher"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-none border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className={`text-[9px] block text-right font-mono ${
                        msg.sender === "dispatcher" ? "text-blue-200" : "text-zinc-400"
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Dispatch message to ${selectedChatDriver?.fullName || "Driver"}...`}
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-[10px] text-zinc-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                Drivers receive real-time dispatch alerts and lane calls instantly in their Driver Cab mobile view.
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
