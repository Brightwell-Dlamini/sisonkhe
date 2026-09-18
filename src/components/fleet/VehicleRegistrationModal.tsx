import React, { useState, useRef } from "react";
import { 
  Car, Camera, Upload, Shield, Check, AlertCircle, X, 
  Layers, User, MapPin, Hash, FileText, Calendar 
} from "lucide-react";
import { Vehicle, Route, Driver, EswatiniRegion, KombiStatus } from "../../types";
import { generateVIC } from "../../utils/helper";

interface VehicleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vehicleData: Partial<Vehicle>) => void;
  editingVehicle?: Vehicle | null;
  routes: Route[];
  drivers: Driver[];
  associations: string[];
}

export default function VehicleRegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  editingVehicle,
  routes,
  drivers,
  associations
}: VehicleRegistrationModalProps) {
  if (!isOpen) return null;

  // Initialize form state
  const isEditing = !!editingVehicle;
  
  const [formData, setFormData] = useState({
    registrationNumber: editingVehicle?.registrationNumber || "",
    fleetNumber: editingVehicle?.fleetNumber || editingVehicle?.vic || "",
    vic: editingVehicle?.vic || editingVehicle?.fleetNumber || "",
    make: editingVehicle?.make || "Toyota",
    model: editingVehicle?.model || "Quantum",
    seatingCapacity: editingVehicle?.seatingCapacity || 15,
    classification: (editingVehicle?.classification || "kombi") as "kombi" | "midbus" | "bus",
    routeAssignmentId: editingVehicle?.routeAssignmentId || routes[0]?.id || "",
    loadingBay: editingVehicle?.loadingBay || "Bay 01",
    ownerName: editingVehicle?.ownerName || "",
    ownerPhone: editingVehicle?.ownerPhone || "+268 7600 0000",
    driverId: editingVehicle?.driverId || "",
    association: editingVehicle?.association || associations[0] || "Mbabane Highway Transport Association (MHTA)",
    permitNumber: editingVehicle?.permitNumber || "",
    permitStatus: (editingVehicle?.permitStatus || "Active") as "Active" | "Expired" | "Suspended",
    permitIssueDate: editingVehicle?.permitIssueDate || "2026-08-01",
    permitExpiryDate: editingVehicle?.permitExpiryDate || "2027-08-01",
    cofNumber: editingVehicle?.cofNumber || "",
    cofIssueDate: editingVehicle?.cofIssueDate || "2026-08-01",
    cofExpiryDate: editingVehicle?.cofExpiryDate || "2027-08-01",
    lastInspectionDate: editingVehicle?.lastInspectionDate || "2026-08-01",
    vehiclePhotoUrl: editingVehicle?.vehiclePhotoUrl || "",
    isMidMonthAddition: editingVehicle?.isMidMonthAddition || false
  });

  // Camera & file upload state
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-generate all dependent fields (VIC, Permit #, COF #) from registration plate
  const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase();
    const autoVIC = generateVIC(rawVal);
    const cleanPlate = rawVal.replace(/\s+/g, "");
    
    setFormData(prev => ({
      ...prev,
      registrationNumber: rawVal,
      vic: autoVIC || prev.vic,
      fleetNumber: autoVIC || prev.fleetNumber,
      permitNumber: isEditing ? prev.permitNumber : (cleanPlate ? `RPT-${cleanPlate}` : ""),
      cofNumber: isEditing ? prev.cofNumber : (cleanPlate ? `COF-${cleanPlate}` : "")
    }));
  };

  // Re-generate individual fields on demand
  const handleAutoGenerateVIC = () => {
    const autoVIC = generateVIC(formData.registrationNumber);
    if (autoVIC) {
      setFormData(prev => ({ ...prev, vic: autoVIC, fleetNumber: autoVIC }));
    }
  };

  const handleAutoGeneratePermitNum = () => {
    const clean = formData.registrationNumber.replace(/\s+/g, "").toUpperCase();
    if (clean) {
      setFormData(prev => ({ ...prev, permitNumber: `RPT-${clean}` }));
    }
  };

  const handleAutoGenerateCOFNum = () => {
    const clean = formData.registrationNumber.replace(/\s+/g, "").toUpperCase();
    if (clean) {
      setFormData(prev => ({ ...prev, cofNumber: `COF-${clean}` }));
    }
  };

  // Auto-calculate +1 year expiry date for permit issue date
  const handlePermitIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIssueDate = e.target.value;
    try {
      const d = new Date(newIssueDate);
      d.setFullYear(d.getFullYear() + 1);
      const nextYear = d.toISOString().split("T")[0];
      setFormData(prev => ({
        ...prev,
        permitIssueDate: newIssueDate,
        permitExpiryDate: nextYear
      }));
    } catch {
      setFormData(prev => ({ ...prev, permitIssueDate: newIssueDate }));
    }
  };

  // Auto-calculate +1 year expiry date for COF issue date
  const handleCOFIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCOFIssueDate = e.target.value;
    try {
      const d = new Date(newCOFIssueDate);
      d.setFullYear(d.getFullYear() + 1);
      const nextYear = d.toISOString().split("T")[0];
      setFormData(prev => ({
        ...prev,
        cofIssueDate: newCOFIssueDate,
        cofExpiryDate: nextYear
      }));
    } catch {
      setFormData(prev => ({ ...prev, cofIssueDate: newCOFIssueDate }));
    }
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB. Please select a smaller photo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setFormData(prev => ({ ...prev, vehiclePhotoUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Start Live Webcam
  const startWebcam = async () => {
    setWebcamError("");
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.error(err);
      setWebcamError("Could not access camera device. Please grant camera permission.");
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

  // Capture Snapshot from Webcam
  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setFormData(prev => ({ ...prev, vehiclePhotoUrl: dataUrl }));
      }
      stopWebcam();
    }
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber.trim()) {
      alert("Registration Number is required.");
      return;
    }

    const regClean = formData.registrationNumber.trim().toUpperCase();
    const cleanPlate = regClean.replace(/\s+/g, "");
    const vicClean = formData.vic.trim() || generateVIC(regClean);
    const permitClean = formData.permitNumber.trim() || `RPT-${cleanPlate}`;
    const cofClean = formData.cofNumber.trim() || `COF-${cleanPlate}`;

    onSubmit({
      ...formData,
      registrationNumber: regClean,
      vic: vicClean,
      fleetNumber: vicClean,
      permitNumber: permitClean,
      cofNumber: cofClean,
      seatingCapacity: Number(formData.seatingCapacity) || 15
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
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 dark:text-white text-base">
                {isEditing ? `Edit Vehicle: ${editingVehicle.registrationNumber}` : "Register New Fleet Vehicle & Permit"}
              </h3>
              <p className="text-xs text-zinc-500">
                National Road Transport Compliance & Secure QR Plaque Registration
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
          
          {/* SECTION 1: VEHICLE IDENTIFICATION & REGISTRATION */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              <span>Vehicle Identification & Fleet Registration</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ASD 001 BH"
                  value={formData.registrationNumber}
                  onChange={handleRegChange}
                  disabled={isEditing}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-white uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    FLEET-VIC (Vehicle ID)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateVIC}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                  >
                    ⚡ Auto-Fill
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Auto-generated"
                  value={formData.vic}
                  onChange={(e) => setFormData({ ...formData, vic: e.target.value.toUpperCase(), fleetNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Permit Number
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePermitNum}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                  >
                    ⚡ Auto-Fill
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. RPT-ASD001BH"
                  value={formData.permitNumber}
                  onChange={(e) => setFormData({ ...formData, permitNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={formData.seatingCapacity}
                  onChange={(e) => setFormData({ ...formData, seatingCapacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Classification
                </label>
                <select
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="kombi">Kombi (15 Seats)</option>
                  <option value="midbus">Midibus (22-35 Seats)</option>
                  <option value="bus">Standard Bus (65+ Seats)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: OPERATOR & TRANSPORT ASSOCIATION */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Operator & Association Credentials</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Owner / Operator Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sibusiso Dlamini"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Owner Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+268 7600 0000"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Transport Association
                </label>
                <select
                  value={formData.association}
                  onChange={(e) => setFormData({ ...formData, association: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  {associations.map((assoc) => (
                    <option key={assoc} value={assoc}>
                      {assoc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={formData.driverId}
                  onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  <option value="">-- Assign Driver Later --</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.fullName} (PDP: {driver.pdpNumber || "Valid"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: ROUTE & BAY ASSIGNMENT */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Corridor Route & Terminal Bay</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Assigned Corridor Route
                </label>
                <select
                  value={formData.routeAssignmentId}
                  onChange={(e) => setFormData({ ...formData, routeAssignmentId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.region}: {r.origin} ➔ {r.destination} (E{r.fare || r.baseFareE})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Terminal Loading Bay
                </label>
                <select
                  value={formData.loadingBay}
                  onChange={(e) => setFormData({ ...formData, loadingBay: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const bayNum = (i + 1).toString().padStart(2, "0");
                    return <option key={bayNum} value={`Bay ${bayNum}`}>{`Bay ${bayNum}`}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: PERMITS & CERTIFICATE OF FITNESS (COF) */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>National Permit Dates & Certificate of Fitness (COF)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Permit Status
                </label>
                <select
                  value={formData.permitStatus}
                  onChange={(e) => setFormData({ ...formData, permitStatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white"
                >
                  <option value="Active">Active / Valid</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Permit Issue Date
                </label>
                <input
                  type="date"
                  value={formData.permitIssueDate}
                  onChange={handlePermitIssueDateChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Permit Expiry Date (+1 Yr Auto)
                </label>
                <input
                  type="date"
                  value={formData.permitExpiryDate}
                  onChange={(e) => setFormData({ ...formData, permitExpiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    COF Number
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateCOFNum}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                  >
                    ⚡ Auto-Fill
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. COF-ASD001BH"
                  value={formData.cofNumber}
                  onChange={(e) => setFormData({ ...formData, cofNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  COF Issue Date
                </label>
                <input
                  type="date"
                  value={formData.cofIssueDate}
                  onChange={handleCOFIssueDateChange}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  COF Expiry Date (+1 Yr Auto)
                </label>
                <input
                  type="date"
                  value={formData.cofExpiryDate}
                  onChange={(e) => setFormData({ ...formData, cofExpiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: VEHICLE PHOTO (FILE UPLOAD & LIVE CAMERA) */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              <span>Vehicle Photo & Visual Identification (Upload / Live Camera)</span>
            </span>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 flex items-center justify-center overflow-hidden shrink-0 shadow">
                {formData.vehiclePhotoUrl ? (
                  <img
                    src={formData.vehiclePhotoUrl}
                    alt="Vehicle Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Car className="w-8 h-8 text-zinc-400" />
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
                    <span>Upload Image File</span>
                  </button>

                  <button
                    type="button"
                    onClick={startWebcam}
                    className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Snapshot (Camera)</span>
                  </button>

                  {formData.vehiclePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, vehiclePhotoUrl: "" }))}
                      className="px-2.5 py-2 text-red-500 hover:text-red-700 text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-zinc-500">
                  Provide a clear photo of the commercial vehicle showing the front and license plate.
                </p>
              </div>
            </div>

            {/* Live Camera Viewport */}
            {isWebcamActive && (
              <div className="p-3 bg-black rounded-2xl border border-zinc-700 space-y-2">
                <div className="relative aspect-video max-h-56 w-full overflow-hidden rounded-xl bg-zinc-900">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                {webcamError && (
                  <p className="text-xs text-red-400">{webcamError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
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
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: 30-DAY MONTHLY QUEUE ROTATION RULE */}
          <div className="p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 flex items-start gap-3">
            <input
              type="checkbox"
              id="mid-month-vehicle-checkbox"
              checked={formData.isMidMonthAddition}
              onChange={(e) => setFormData({ ...formData, isMidMonthAddition: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="mid-month-vehicle-checkbox" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <span className="font-bold text-purple-700 dark:text-purple-300 block">
                Added Mid-Month (National 30-Day Queuing Rule)
              </span>
              Check this if the vehicle is joining during the active 30-day month. It will be marked with a mid-month badge and held at the tail of the queue sequence for the remainder of the month. Next month, it will graduate to the regular rotation sequence.
            </label>
          </div>

          {/* Submit Actions */}
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
              <span>{isEditing ? "Save Changes" : "Register Fleet Vehicle"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
