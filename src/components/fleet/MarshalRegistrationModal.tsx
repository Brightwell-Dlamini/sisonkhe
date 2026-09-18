import React, { useState, useRef, useEffect } from "react";
import { 
  User, Camera, Upload, Shield, Check, Eye, EyeOff, X, 
  Phone, Key, FileBadge, AlertCircle, MapPin, MessageSquare, PhoneCall, Calendar, Building2, BadgeCheck
} from "lucide-react";
import { MarshalAccount, Route, EswatiniRegion } from "../../types";

interface MarshalRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (marshalData: MarshalAccount) => void;
  editingMarshal?: MarshalAccount | null;
  routes: Route[];
  terminalsByRegion?: Record<string, string[]>;
}

const DEFAULT_TERMINALS: Record<string, string[]> = {
  Hhohho: [
    "Mbabane Bus Terminus (Main)",
    "Mbabane West Rank",
    "Piggs Peak District Terminal",
    "Ezulwini Valley Station"
  ],
  Manzini: [
    "Manzini Satellite Rank",
    "Manzini Central Bus Terminal",
    "Matsapha Industrial Rank",
    "Mafutseni Junction Hub"
  ],
  Lubombo: [
    "Siteki Central Rank",
    "Simunye Terminal",
    "Big Bend Station",
    "Lomahasha Border Rank"
  ],
  Shiselweni: [
    "Nhlangano Bus Station",
    "Hlatikulu Terminal",
    "Lavumisa Border Rank"
  ]
};

export default function MarshalRegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  editingMarshal,
  routes,
  terminalsByRegion = DEFAULT_TERMINALS
}: MarshalRegistrationModalProps) {
  if (!isOpen) return null;

  const isEditing = !!editingMarshal;

  // Helper to generate unique 16-digit card number
  const generateCardNumber = () => {
    const p1 = "9820";
    const p2 = Math.floor(1000 + Math.random() * 9000).toString();
    const p3 = Math.floor(1000 + Math.random() * 9000).toString();
    const p4 = Math.floor(1000 + Math.random() * 9000).toString();
    return `${p1} ${p2} ${p3} ${p4}`;
  };

  // Helper to generate badge number
  const generateBadgeNumber = (region: string) => {
    const regCode = region.substring(0, 2).toUpperCase();
    const randomNum = Math.floor(10 + Math.random() * 89);
    return `MSH-${regCode}-${randomNum}`;
  };

  const initialCell = editingMarshal?.cellPhone || (editingMarshal?.phone ? editingMarshal.phone.replace("+268 ", "").trim() : "");
  const defaultRegion = (editingMarshal?.region as EswatiniRegion) || EswatiniRegion.Hhohho;

  const [formData, setFormData] = useState<MarshalAccount>(() => ({
    id: editingMarshal?.id || `mar_${Date.now()}`,
    fullName: editingMarshal?.fullName || "",
    nationalId: editingMarshal?.nationalId || "",
    phone: editingMarshal?.phone || (initialCell ? `+268 ${initialCell}` : "+268 7600 0000"),
    residentialAddress: editingMarshal?.residentialAddress || "",
    cellPhone: initialCell || "",
    whatsappPhone: editingMarshal?.whatsappPhone || initialCell || "",
    sameAsCell: editingMarshal?.sameAsCell !== undefined ? editingMarshal.sameAsCell : true,
    homeTel: editingMarshal?.homeTel || "",
    dateOfBirth: editingMarshal?.dateOfBirth || "",
    gender: editingMarshal?.gender || "Male",
    region: editingMarshal?.region || defaultRegion,
    terminalName: editingMarshal?.terminalName || terminalsByRegion[defaultRegion]?.[0] || "Mbabane Bus Terminus (Main)",
    assignedRouteId: editingMarshal?.assignedRouteId || routes[0]?.id || "h_mb_mz",
    badgeNumber: editingMarshal?.badgeNumber || generateBadgeNumber(defaultRegion),
    emergencyContactName: editingMarshal?.emergencyContactName || "",
    emergencyContactPhone: editingMarshal?.emergencyContactPhone || "+268 7800 0000",
    emergencyContactRelation: editingMarshal?.emergencyContactRelation || "Next of Kin",
    username: editingMarshal?.username || "",
    password: editingMarshal?.password || "",
    status: editingMarshal?.status || "Active",
    shiftAssignment: editingMarshal?.shiftAssignment || "Morning / Day Shift (05:00 - 14:00)",
    marshalRole: editingMarshal?.marshalRole || "Station Dispatch Marshal",
    stationOffice: editingMarshal?.stationOffice || `${editingMarshal?.terminalName || "Mbabane"} Dispatch Office`,
    issueDate: editingMarshal?.issueDate || new Date().toISOString().split("T")[0],
    expiryDate: editingMarshal?.expiryDate || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      return d.toISOString().split("T")[0];
    })(),
    issuingAuthority: editingMarshal?.issuingAuthority || "National Road Transport Council (NRTC)",
    cardNumber: editingMarshal?.cardNumber || generateCardNumber(),
    cardBalanceSZL: editingMarshal?.cardBalanceSZL || 0,
    avatarSeed: editingMarshal?.avatarSeed || "marshal",
    profilePictureUrl: editingMarshal?.profilePictureUrl || ""
  }));

  const [showPassword, setShowPassword] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // When Region changes, update available terminals and default badge
  const handleRegionChange = (newRegion: string) => {
    const availableTerminals = terminalsByRegion[newRegion] || [];
    const firstTerm = availableTerminals[0] || `${newRegion} Main Rank`;
    setFormData(prev => ({
      ...prev,
      region: newRegion,
      terminalName: firstTerm,
      stationOffice: `${firstTerm} Dispatch Office`,
      badgeNumber: prev.badgeNumber?.startsWith("MSH-") ? generateBadgeNumber(newRegion) : prev.badgeNumber
    }));
  };

  // Auto calculate +2 years for Expiry date
  const handleIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const issueDate = e.target.value;
    try {
      const d = new Date(issueDate);
      d.setFullYear(d.getFullYear() + 2);
      const expiry = d.toISOString().split("T")[0];
      setFormData(prev => ({
        ...prev,
        issueDate,
        expiryDate: expiry
      }));
    } catch {
      setFormData(prev => ({ ...prev, issueDate }));
    }
  };

  // Cell and WhatsApp sync handlers
  const handleCellPhoneChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      cellPhone: val,
      phone: val ? (val.startsWith("+") ? val : `+268 ${val}`) : prev.phone,
      whatsappPhone: prev.sameAsCell ? val : prev.whatsappPhone
    }));
  };

  const handleSameAsCellToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sameAsCell: checked,
      whatsappPhone: checked ? prev.cellPhone : prev.whatsappPhone
    }));
  };

  // Handle File Upload for Marshal Profile Photo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB. Please choose a smaller photo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData(prev => ({ ...prev, profilePictureUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Start Webcam
  const startWebcam = async () => {
    setWebcamError("");
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.error(err);
      setWebcamError("Could not access camera device. Please check permissions.");
      setIsWebcamActive(false);
    }
  };

  // Stop Webcam
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  // Capture Snapshot
  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setFormData(prev => ({ ...prev, profilePictureUrl: dataUrl }));
      }
      stopWebcam();
    }
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      alert("Marshal full name is required.");
      return;
    }

    // Auto-generate username/password if empty
    const cleanUsername = formData.username?.trim() || `marshal_${formData.fullName.toLowerCase().replace(/\s+/g, "_")}`;
    const cleanPassword = formData.password?.trim() || `rank${Math.floor(1000 + Math.random() * 9000)}`;

    const effectivePhone = formData.cellPhone 
      ? (formData.cellPhone.startsWith("+") ? formData.cellPhone : `+268 ${formData.cellPhone.replace(/^\+?268\s*/, "")}`) 
      : formData.phone;

    const finalMarshal: MarshalAccount = {
      ...formData,
      phone: effectivePhone,
      username: cleanUsername,
      password: cleanPassword,
      avatarSeed: formData.fullName.toLowerCase().replace(/\s+/g, "_"),
      cardNumber: formData.cardNumber || generateCardNumber()
    };

    onSubmit(finalMarshal);
    stopWebcam();
    onClose();
  };

  const currentTerminals = terminalsByRegion[formData.region] || DEFAULT_TERMINALS[formData.region] || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white text-base">
                {isEditing ? `Edit Rank Marshal: ${editingMarshal.fullName}` : "Register Rank Marshal & Generate Official Card"}
              </h3>
              <p className="text-xs text-zinc-500">
                Official Station Dispatch Credentials, NRTC Commercial Card, and Digital Pass
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* SECTION 1: PHOTO & LIVE CAMERA SNAPSHOT */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Official Verification Photo</span>
            </span>

            <div className="flex items-center gap-4">
              {/* Photo Preview */}
              <div className="relative w-20 h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                {formData.profilePictureUrl ? (
                  <img
                    src={formData.profilePictureUrl}
                    alt="Marshal Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-zinc-400" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={isWebcamActive ? stopWebcam : startWebcam}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
                      isWebcamActive 
                        ? "bg-rose-500 hover:bg-rose-600 text-white" 
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isWebcamActive ? "Cancel Camera" : "Take Selfie"}</span>
                  </button>

                  {formData.profilePictureUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, profilePictureUrl: "" })}
                      className="px-2.5 py-1.5 text-zinc-500 hover:text-rose-600 text-xs font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400">
                  Used on the official physical marshal badge, digital QR dispatch pass, and rank terminal login.
                </p>
              </div>
            </div>

            {/* Webcam Live Stream Area */}
            {isWebcamActive && (
              <div className="mt-3 p-3 bg-zinc-900 rounded-2xl border border-zinc-700 space-y-2">
                <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden bg-black mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                </div>
                {webcamError && (
                  <p className="text-rose-400 text-[10px] text-center">{webcamError}</p>
                )}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PERSONAL IDENTITY */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Personal Identity</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nomvula Gamedze"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  National ID (PIN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 940812-4211-18"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: CONTACT & ADDRESS INFORMATION */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Contact & Address Information</span>
            </span>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Residential Address *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ndlavane"
                value={formData.residentialAddress}
                onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Cell Phone No. *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 76704181"
                    value={formData.cellPhone}
                    onChange={(e) => handleCellPhoneChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">MTN / Eswatini Mobile (8 digits)</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    WhatsApp No. (if applicable)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.sameAsCell}
                      onChange={(e) => handleSameAsCellToggle(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-semibold text-[10px]">Same as Cell</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 76704181 or +268..."
                    value={formData.whatsappPhone}
                    onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                    disabled={formData.sameAsCell}
                    className={`w-full pl-9 pr-3.5 py-2 border rounded-xl text-sm font-mono ${
                      formData.sameAsCell 
                        ? "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-500 cursor-not-allowed" 
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    }`}
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Optional • For Association WhatsApp notices & groups</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                Home Tel No.
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. 2404 1234"
                  value={formData.homeTel}
                  onChange={(e) => setFormData({ ...formData, homeTel: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">Optional landline number</p>
            </div>
          </div>

          {/* SECTION 4: EMERGENCY CONTACT */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>Emergency Contact</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bongani Gamedze"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spouse / Brother"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Emergency Phone *
                </label>
                <input
                  type="text"
                  placeholder="+268 7800 0000"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: MARSHAL STATION ACCESS CREDENTIALS */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>Marshal Portal & Station App Login Credentials</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Marshal Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. marshal_nomvula"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Station Access Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: RANK TERMINAL & CORRIDOR DUTY ASSIGNMENT */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <FileBadge className="w-3.5 h-3.5" />
              <span>Rank Terminal Assignment & Badge Certification</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Assigned Region *
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white"
                >
                  <option value={EswatiniRegion.Hhohho}>Hhohho</option>
                  <option value={EswatiniRegion.Manzini}>Manzini</option>
                  <option value={EswatiniRegion.Lubombo}>Lubombo</option>
                  <option value={EswatiniRegion.Shiselweni}>Shiselweni</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Station Terminal *
                </label>
                <select
                  value={formData.terminalName}
                  onChange={(e) => setFormData({ ...formData, terminalName: e.target.value, stationOffice: `${e.target.value} Dispatch Office` })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white truncate"
                >
                  {currentTerminals.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Assigned Corridor Route
                </label>
                <select
                  value={formData.assignedRouteId}
                  onChange={(e) => setFormData({ ...formData, assignedRouteId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.origin} ➔ {r.destination} (E{r.baseFareE || 50})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Badge / Rank ID # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MSH-HH-041"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Dispatcher Role / Title
                </label>
                <select
                  value={formData.marshalRole}
                  onChange={(e) => setFormData({ ...formData, marshalRole: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="Station Dispatch Marshal">Station Dispatch Marshal</option>
                  <option value="Senior Rank Marshal">Senior Rank Marshal</option>
                  <option value="Terminal Queue Controller">Terminal Queue Controller</option>
                  <option value="Chief Dispatch Officer">Chief Dispatch Officer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Shift Assignment
                </label>
                <select
                  value={formData.shiftAssignment}
                  onChange={(e) => setFormData({ ...formData, shiftAssignment: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="Morning / Day Shift (05:00 - 14:00)">Morning Shift (05:00 - 14:00)</option>
                  <option value="Afternoon Shift (14:00 - 22:00)">Afternoon Shift (14:00 - 22:00)</option>
                  <option value="Full Day Dispatch (05:00 - 20:00)">Full Day Dispatch</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Appointment Date
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={handleIssueDateChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Badge Expiry (+2 Yrs Auto)
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Duty Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white"
                >
                  <option value="Active">Active / On Duty</option>
                  <option value="Off-Duty">Off-Duty</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-500">
                Official Virtual Pass Card: <strong className="font-mono text-zinc-900 dark:text-zinc-100">{formData.cardNumber}</strong>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">
                ✓ Card will be generated & ready to view immediately upon registration
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? "Save Marshal Profile" : "Register Marshal & Issue Card"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
