import React, { useState, useRef } from "react";
import { 
  User, Camera, Upload, Shield, Check, Eye, EyeOff, X, 
  Phone, Key, FileBadge, Car, AlertCircle, MapPin, MessageSquare, PhoneCall, Calendar
} from "lucide-react";
import { Driver, Vehicle } from "../../types";

interface DriverRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (driverData: Partial<Driver>) => void;
  editingDriver?: Driver | null;
  vehicles: Vehicle[];
}

export default function DriverRegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  editingDriver,
  vehicles
}: DriverRegistrationModalProps) {
  if (!isOpen) return null;

  const isEditing = !!editingDriver;

  const initialCell = editingDriver?.cellPhone || (editingDriver?.phone ? editingDriver.phone.replace("+268 ", "").trim() : "");

  const [formData, setFormData] = useState({
    fullName: editingDriver?.fullName || "",
    nationalId: editingDriver?.nationalId || "",
    phone: editingDriver?.phone || (initialCell ? `+268 ${initialCell}` : "+268 7600 0000"),
    residentialAddress: editingDriver?.residentialAddress || "",
    cellPhone: initialCell || "",
    whatsappPhone: editingDriver?.whatsappPhone || initialCell || "",
    sameAsCell: editingDriver?.sameAsCell !== undefined ? editingDriver.sameAsCell : true,
    homeTel: editingDriver?.homeTel || "",
    dateOfBirth: editingDriver?.dateOfBirth || "",
    gender: editingDriver?.gender || "Male",
    licenseNumber: editingDriver?.licenseNumber || "",
    licenseClass: editingDriver?.licenseClass || "Heavy Duty / Class C1",
    pdpNumber: editingDriver?.pdpNumber || "",
    pdpIssueDate: editingDriver?.pdpIssueDate || "2026-07-14",
    pdpExpiryDate: editingDriver?.pdpExpiryDate || "2028-07-14",
    pdpIssuingAuthority: editingDriver?.pdpIssuingAuthority || "Mbabane",
    pdpStatus: (editingDriver?.pdpStatus || "Valid") as "Valid" | "Expired" | "Suspended",
    emergencyContactName: editingDriver?.emergencyContactName || "",
    emergencyContactPhone: editingDriver?.emergencyContactPhone || "+268 7600 0000",
    emergencyContactRelation: editingDriver?.emergencyContactRelation || "Next of Kin",
    assignedVehicleReg: editingDriver?.assignedVehicleReg || "",
    username: editingDriver?.username || "",
    password: editingDriver?.password || "",
    profilePictureUrl: editingDriver?.profilePictureUrl || ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto calculate +2 years for PDP expiry
  const handlePDPIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const issueDate = e.target.value;
    try {
      const d = new Date(issueDate);
      d.setFullYear(d.getFullYear() + 2);
      const expiry = d.toISOString().split("T")[0];
      setFormData(prev => ({
        ...prev,
        pdpIssueDate: issueDate,
        pdpExpiryDate: expiry
      }));
    } catch {
      setFormData(prev => ({ ...prev, pdpIssueDate: issueDate }));
    }
  };

  // Handle File Upload for Driver Profile Photo
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
        video: { facingMode: "user" } // Selfie camera for driver
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

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      alert("Driver full name is required.");
      return;
    }

    // Auto-generate username/password if empty
    const cleanUsername = formData.username.trim() || `driver_${formData.fullName.toLowerCase().replace(/\s+/g, "_")}`;
    const cleanPassword = formData.password.trim() || `kombi${Math.floor(1000 + Math.random() * 9000)}`;

    const effectivePhone = formData.cellPhone 
      ? (formData.cellPhone.startsWith("+") ? formData.cellPhone : `+268 ${formData.cellPhone.replace(/^\+?268\s*/, "")}`) 
      : formData.phone;

    onSubmit({
      ...formData,
      phone: effectivePhone,
      username: cleanUsername,
      password: cleanPassword
    });

    stopWebcam();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white text-base">
                {isEditing ? `Edit Driver Profile: ${editingDriver.fullName}` : "Register Driver & Cab Access Credentials"}
              </h3>
              <p className="text-xs text-zinc-500">
                Official PDP Certification, Driver Portal Logins, and Photo Verification
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

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SECTION 1: DRIVER PHOTO UPLOAD & LIVE SNAPSHOT */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Driver Profile Picture & Verification Photo</span>
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 flex items-center justify-center overflow-hidden shrink-0 shadow">
                {formData.profilePictureUrl ? (
                  <img
                    src={formData.profilePictureUrl}
                    alt="Driver Photo Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-10 h-10 text-zinc-400" />
                )}
              </div>

              <div className="space-y-2 flex-1 w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo File</span>
                  </button>

                  <button
                    type="button"
                    onClick={startWebcam}
                    className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Selfie (Camera)</span>
                  </button>

                  {formData.profilePictureUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, profilePictureUrl: "" }))}
                      className="px-2.5 py-2 text-red-500 hover:text-red-700 text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-zinc-500">
                  This picture appears on the Driver's Cab, chat system, official permit verification, and commuter safety lookups.
                </p>
              </div>
            </div>

            {/* Live Camera Viewport */}
            {isWebcamActive && (
              <div className="p-3 bg-black rounded-2xl border border-zinc-700 space-y-2">
                <div className="relative aspect-square max-h-52 w-full max-w-xs mx-auto overflow-hidden rounded-xl bg-zinc-900">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                {webcamError && (
                  <p className="text-xs text-red-400 text-center">{webcamError}</p>
                )}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Selfie</span>
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
                  placeholder="e.g. Sipho Ndlovu"
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
                  placeholder="e.g. 020101-8100-24"
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
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
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
                  placeholder="e.g. Mary Ndlovu"
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
                  placeholder="e.g. Spouse / Sibling"
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

          {/* SECTION 3: DRIVER CAB ACCESS CREDENTIALS */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>Driver Cab App Login Credentials</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Driver Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. driver_sipho"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Driver Cab Password
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

          {/* SECTION 4: PROFESSIONAL DRIVING PERMIT (PDP) & LICENSING */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <FileBadge className="w-3.5 h-3.5" />
              <span>PDP Certification & Driving License</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Driver License Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-88912-SZ"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  License Class
                </label>
                <select
                  value={formData.licenseClass}
                  onChange={(e) => setFormData({ ...formData, licenseClass: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="Heavy Duty / Class C1">Heavy Duty / Class C1</option>
                  <option value="Class C (Heavy Rigid)">Class C (Heavy Rigid)</option>
                  <option value="Class EC (Articulated Bus)">Class EC (Articulated Bus)</option>
                  <option value="Class B (Light Commercial)">Class B (Light Commercial)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP Status
                </label>
                <select
                  value={formData.pdpStatus}
                  onChange={(e) => setFormData({ ...formData, pdpStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white"
                >
                  <option value="Valid">Valid / Compliant</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. PDP-2026-9912"
                  value={formData.pdpNumber}
                  onChange={(e) => setFormData({ ...formData, pdpNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP Issue Date
                </label>
                <input
                  type="date"
                  value={formData.pdpIssueDate}
                  onChange={handlePDPIssueDateChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  PDP Expiry Date (+2 Yrs Auto)
                </label>
                <input
                  type="date"
                  value={formData.pdpExpiryDate}
                  onChange={(e) => setFormData({ ...formData, pdpExpiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Issuing Licensing Office
                </label>
                <select
                  value={formData.pdpIssuingAuthority}
                  onChange={(e) => setFormData({ ...formData, pdpIssuingAuthority: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="Mbabane">Mbabane Ministry Hub</option>
                  <option value="Manzini">Manzini Commercial Center</option>
                  <option value="Siteki">Siteki Regional Office</option>
                  <option value="Nhlangano">Nhlangano Transport Center</option>
                  <option value="Piggs Peak">Piggs Peak District Office</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Assigned Fleet Vehicle
                </label>
                <select
                  value={formData.assignedVehicleReg}
                  onChange={(e) => setFormData({ ...formData, assignedVehicleReg: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="">-- No Vehicle Assigned --</option>
                  {vehicles.map((v) => (
                    <option key={v.registrationNumber} value={v.registrationNumber}>
                      {v.registrationNumber} ({v.make} {v.model}) - {v.loadingBay}
                    </option>
                  ))}
                </select>
              </div>
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
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? "Save Driver Profile" : "Register Driver Credentials"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
