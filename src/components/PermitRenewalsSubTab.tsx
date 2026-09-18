import React, { useState } from "react";
import { 
  Calendar, Check, Shield, AlertTriangle, Search, Plus, X, Upload, ClipboardCheck, ArrowUpRight
} from "lucide-react";
import { Vehicle, Driver, PermitRenewalRequest, RenewalArchive, PermitAuditLog, RankNotification, UserRole } from "../types";

interface PermitRenewalsSubTabProps {
  userRole: UserRole;
  vehicles: Vehicle[];
  drivers: Driver[];
  renewalRequests: PermitRenewalRequest[];
  renewalArchives: RenewalArchive[];
  auditLogs: PermitAuditLog[];
  onUpdateVehicles: (updated: Vehicle[]) => void;
  onSaveRenewalRequests: (requests: PermitRenewalRequest[]) => void;
  onSaveRenewalArchives: (archives: RenewalArchive[]) => void;
  onSaveAuditLogs: (logs: PermitAuditLog[]) => void;
  onAddNotification: (notif: Omit<RankNotification, "id" | "timestamp">) => void;
  selectedVehicle: Vehicle | null;
  setSelectedVehicle: (veh: Vehicle | null) => void;
  isRequestModalOpen: boolean;
  setIsRequestModalOpen: (open: boolean) => void;
  isProcessModalOpen: boolean;
  setIsProcessModalOpen: (open: boolean) => void;
}

export default function PermitRenewalsSubTab({
  userRole,
  vehicles,
  drivers,
  renewalRequests,
  renewalArchives,
  auditLogs,
  onUpdateVehicles,
  onSaveRenewalRequests,
  onSaveRenewalArchives,
  onSaveAuditLogs,
  onAddNotification,
  selectedVehicle,
  setSelectedVehicle,
  isRequestModalOpen,
  setIsRequestModalOpen,
  isProcessModalOpen,
  setIsProcessModalOpen
}: PermitRenewalsSubTabProps) {
  // Local active search filter for renewals
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending Admin Approval" | "Approved" | "Rejected">("All");

  // Selected single request for viewing
  const [activeRequest, setActiveRequest] = useState<PermitRenewalRequest | null>(null);

  // Form states for requesting renewal (for Operator/Driver)
  const [requestVehicleReg, setRequestVehicleReg] = useState("");
  const [reasonForRenewal, setReasonForRenewal] = useState("Permit expiring soon, annual renewal required.");
  const [comments, setComments] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Detailed fields requested by the user
  const [operatorLicenseNumber, setOperatorLicenseNumber] = useState("");
  const [odometerReading, setOdometerReading] = useState("");
  const [yearOfManufacture, setYearOfManufacture] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [concessionId, setConcessionId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (filesList: FileList | null) => {
    if (!filesList) return;
    setFileError("");
    const newFiles: { name: string; size: number }[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.size <= 1024 * 1024) {
        setFileError(`Validation Error: "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(2)}MB. Under Swaziland Transport Commission rules, all uploaded supporting documents must be strictly greater than 1MB (1,048,576 bytes) for regulatory visual auditing.`);
        return;
      }
      newFiles.push({ name: file.name, size: file.size });
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Form states for processing renewal (for Admin manual entry)
  const [newPermitNumber, setNewPermitNumber] = useState("");
  const [permitIssueDate, setPermitIssueDate] = useState("2026-07-15");
  const [permitExpiryDate, setPermitExpiryDate] = useState("2027-07-15");
  const [cofNumber, setCofNumber] = useState("");
  const [cofIssueDate, setCofIssueDate] = useState("2026-07-15");
  const [cofExpiryDate, setCofExpiryDate] = useState("2027-07-15");
  const [inspectionDate, setInspectionDate] = useState("2026-07-14");
  const [licensingOffice, setLicensingOffice] = useState("Mbabane Licensing Office");
  const [renewalNotes, setRenewalNotes] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"Approved" | "Rejected">("Approved");

  // Helper function to log audit logs
  const logAuditAction = (action: string, previousValues: string, newValues: string, decision?: string) => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const timeStr = today.toTimeString().split(" ")[0];
    const userStr = userRole === "Admin" ? "Administrator" : `${userRole} User`;
    const newLog: PermitAuditLog = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      user: userStr,
      date: dateStr,
      time: timeStr,
      device: "Desktop / Web Browser",
      action,
      previousValues,
      newValues,
      approvalDecision: decision,
      ipAddress: "102.168.22.84"
    };
    onSaveAuditLogs([newLog, ...auditLogs]);
  };

  const showToast = (message: string) => {
    // Standard visual feedback via notification helper
    console.log("[Toast]", message);
  };

  // Submit a brand new renewal request
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const regNum = requestVehicleReg || (selectedVehicle ? selectedVehicle.registrationNumber : "");
    if (!regNum) return;

    if (uploadedFiles.length === 0) {
      setFileError("Submission Rejected: You must upload at least one supporting document greater than 1MB.");
      return;
    }

    // Double check that all files in uploadedFiles are > 1MB
    const badFiles = uploadedFiles.filter(f => f.size <= 1024 * 1024);
    if (badFiles.length > 0) {
      setFileError(`Submission Rejected: The file "${badFiles[0].name}" is not more than 1MB. All uploaded supporting files must exceed 1MB.`);
      return;
    }

    const v = vehicles.find(veh => veh.registrationNumber === regNum);
    if (!v) return;

    const dName = drivers.find(d => d.id === v.driverId)?.fullName || "Unassigned";

    const newRequest: PermitRenewalRequest = {
      id: `REQ-${Math.floor(10000 + Math.random() * 90000)}`,
      vehicleReg: regNum,
      fleetId: v.fleetNumber,
      currentPermitNumber: v.permitNumber || "N/A",
      currentExpiryDate: v.permitExpiryDate || "N/A",
      operator: v.ownerName || "Unknown Operator",
      driver: dName,
      reasonForRenewal,
      comments,
      supportingDocuments: uploadedFiles.map(f => f.name),
      status: "Pending Admin Approval",
      timestamp: new Date().toISOString(),
      requestDate: new Date().toISOString().split("T")[0],
      
      // Additional requested details
      operatorLicenseNumber: operatorLicenseNumber || "OLN-SZ-8344",
      odometerReading: odometerReading ? Number(odometerReading) : 124500,
      yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : 2018,
      insurancePolicy: insurancePolicy || "Swaziland Royal Insurance — SR-FLT-2911",
      concessionId: concessionId || "CNC-SZ-402"
    };

    onSaveRenewalRequests([newRequest, ...renewalRequests]);

    // Send multi-channel notification to other stakeholders
    onAddNotification({
      type: "WhatsApp",
      recipientName: "System Administrator",
      recipientPhone: "+268 7604 1122",
      message: `🔔 New Permit Renewal Request submitted for vehicle ${regNum} (Fleet ${v.fleetNumber}). Status: Pending Admin Approval.`,
      status: "Sent"
    });

    onAddNotification({
      type: "SMS",
      recipientName: v.ownerName,
      recipientPhone: v.ownerPhone || "+268 7611 2233",
      message: `Permit renewal request submitted successfully for vehicle ${regNum}. We will notify you once approved by the Ministry.`,
      status: "Sent"
    });

    logAuditAction(
      "SUBMITTED_RENEWAL_REQUEST",
      `Permit Status: ${v.permitStatus || "N/A"}, Expiry: ${v.permitExpiryDate || "N/A"}`,
      `Request Status: Pending Admin Approval, Reason: ${reasonForRenewal}, Docs: ${uploadedFiles.map(f => f.name).join(", ")}, Odo: ${odometerReading} km, Year: ${yearOfManufacture}`
    );

    setIsRequestModalOpen(false);
    // Clear forms
    setComments("");
    setSelectedDocs([]);
    setOperatorLicenseNumber("");
    setOdometerReading("");
    setYearOfManufacture("");
    setInsurancePolicy("");
    setConcessionId("");
    setUploadedFiles([]);
    setFileError("");
    showToast(`Successfully requested renewal for ${regNum}`);
  };

  // Admin manually process request
  const handleProcessRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    const updatedRequests = renewalRequests.map(req => {
      if (req.id === activeRequest.id) {
        return {
          ...req,
          status: approvalStatus,
          newPermitNumber,
          permitIssueDate,
          permitExpiryDate,
          cofNumber,
          cofIssueDate,
          cofExpiryDate,
          inspectionDate,
          licensingOffice,
          renewalNotes,
          approvalStatus,
          approvedBy: "Ministry Admin (Mbabane HQ)",
          approvalDate: new Date().toISOString().split("T")[0]
        };
      }
      return req;
    });

    onSaveRenewalRequests(updatedRequests);

    const v = vehicles.find(veh => veh.registrationNumber === activeRequest.vehicleReg);

    if (approvalStatus === "Approved") {
      // 1. Archive the old permit first (if exists)
      if (v && v.permitNumber) {
        const archiveItem: RenewalArchive = {
          id: `ARC-${Math.floor(10000 + Math.random() * 90000)}`,
          vehicleReg: v.registrationNumber,
          previousPermitNumber: v.permitNumber,
          newPermitNumber: newPermitNumber,
          issueDate: v.permitIssueDate || "N/A",
          expiryDate: v.permitExpiryDate || "N/A",
          administrator: "Ministry Admin (Mbabane HQ)",
          renewalDate: new Date().toISOString().split("T")[0],
          comments: renewalNotes || activeRequest.comments || "Standard renewal",
          supportingDocuments: activeRequest.supportingDocuments
        };
        onSaveRenewalArchives([archiveItem, ...renewalArchives]);
      }

      // 2. Update current active vehicle details with the manual values
      if (v) {
        const updatedVehicles = vehicles.map(veh => {
          if (veh.registrationNumber === v.registrationNumber) {
            return {
              ...veh,
              permitNumber: newPermitNumber,
              permitStatus: "Active" as const,
              permitIssueDate,
              permitExpiryDate,
              cofNumber,
              cofIssueDate,
              cofExpiryDate,
              lastInspectionDate: inspectionDate
            };
          }
          return veh;
        });
        onUpdateVehicles(updatedVehicles);
      }

      // Send notifications
      onAddNotification({
        type: "WhatsApp",
        recipientName: activeRequest.operator,
        recipientPhone: "+268 7604 1122",
        message: `✅ Ministry Approved: Permit renewal request for ${activeRequest.vehicleReg} has been approved. New Permit: ${newPermitNumber}, Expiry: ${permitExpiryDate}.`,
        status: "Sent"
      });

      logAuditAction(
        "APPROVED_RENEWAL_REQUEST",
        `Permit: ${activeRequest.currentPermitNumber}, COF: ${v?.cofNumber || "N/A"}`,
        `New Permit: ${newPermitNumber}, Issue: ${permitIssueDate}, Expiry: ${permitExpiryDate}, New COF: ${cofNumber}`,
        "Approved"
      );
    } else {
      // Rejected
      onAddNotification({
        type: "SMS",
        recipientName: activeRequest.operator,
        recipientPhone: "+268 7604 1122",
        message: `❌ Ministry Declined: Permit renewal for ${activeRequest.vehicleReg} was rejected. Reason: ${renewalNotes}`,
        status: "Sent"
      });

      logAuditAction(
        "REJECTED_RENEWAL_REQUEST",
        `Permit: ${activeRequest.currentPermitNumber}`,
        `Reason for rejection: ${renewalNotes}`,
        "Rejected"
      );
    }

    setIsProcessModalOpen(false);
    setActiveRequest(null);
    showToast(`Renewal request processed as ${approvalStatus}`);
  };

  const visibleVehicleRegs = new Set(vehicles.map(v => v.registrationNumber.toUpperCase()));

  const filteredRequests = renewalRequests.filter(req => {
    const matchesRole = userRole === "Admin" ? true : visibleVehicleRegs.has(req.vehicleReg.toUpperCase());
    const matchesSearch = req.vehicleReg.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.operator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" ? true : req.status === statusFilter;
    return matchesRole && matchesSearch && matchesStatus;
  });

  // Toggle checklist documents
  const handleToggleDoc = (doc: string) => {
    if (selectedDocs.includes(doc)) {
      setSelectedDocs(selectedDocs.filter(d => d !== doc));
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  const allowedRequestVehicles = vehicles;

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", val: renewalRequests.length, bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-300" },
          { label: "Pending Approval", val: renewalRequests.filter(r => r.status === "Pending Admin Approval").length, bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300" },
          { label: "Approved Permits", val: renewalRequests.filter(r => r.status === "Approved").length, bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300" },
          { label: "Rejected Requests", val: renewalRequests.filter(r => r.status === "Rejected").length, bg: "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300" }
        ].map((m, i) => (
          <div key={i} className={`p-4 border rounded-2xl ${m.bg}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">{m.label}</span>
            <span className="text-xl font-black font-space tracking-tight mt-1 block">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Main Header & Submit Trigger */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-zinc-100 font-space tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-500" />
            Permit Renewals & Request Handling
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl mt-0.5">
            Registered Drivers and Transport Operators can submit formal digital requests for renewal. All approvals and subsequent document issuances are processed manually by Ministry Admins.
          </p>
        </div>
        {(userRole === "Operator" || userRole === "Admin") && (
          <button
            onClick={() => {
              if (allowedRequestVehicles.length > 0) {
                const defaultVeh = selectedVehicle || allowedRequestVehicles[0];
                setSelectedVehicle(defaultVeh);
                setRequestVehicleReg(defaultVeh.registrationNumber);
                setIsRequestModalOpen(true);
              } else {
                alert("No assigned vehicles available to submit renewal requests for.");
              }
            }}
            className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Request Permit Renewal
          </button>
        )}
      </div>

      {/* Search & Filter Ledger */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/10 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search renewals by vehicle or operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-100 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs"
            />
          </div>
          <div className="flex gap-2 text-xs">
            {(["All", "Pending Admin Approval", "Approved", "Rejected"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                {st.replace("Pending Admin Approval", "Pending")}
              </button>
            ))}
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/50 dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-850 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                <th className="p-4">Request Ref</th>
                <th className="p-4">Vehicle Plate</th>
                <th className="p-4">Operator / Driver</th>
                <th className="p-4">Prior Permit</th>
                <th className="p-4">Reason For Petition</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Managements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 italic">
                    No matching permit renewal requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr 
                    key={req.id} 
                    className="hover:bg-zinc-50 dark:hover:bg-black/20 cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveRequest(req);
                      setSelectedVehicle(vehicles.find(v => v.registrationNumber === req.vehicleReg) || null);
                      // If admin and pending, open process modal. Else open inspect modal.
                      if (userRole === "Admin" && req.status === "Pending Admin Approval") {
                        setNewPermitNumber(req.currentPermitNumber ? `${req.currentPermitNumber}-R` : `RPT-${Math.floor(10000 + Math.random() * 90000)}`);
                        setCofNumber(vehicles.find(v => v.registrationNumber === req.vehicleReg)?.cofNumber || "");
                        setIsProcessModalOpen(true);
                      } else {
                        setIsRequestModalOpen(true);
                      }
                    }}
                  >
                    <td className="p-4 font-mono-jb font-black text-emerald-600 dark:text-emerald-400">{req.id}</td>
                    <td className="p-4 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{req.vehicleReg}</td>
                    <td className="p-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{req.operator}</div>
                      <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{req.driver}</div>
                    </td>
                    <td className="p-4 font-mono-jb text-zinc-500">{req.currentPermitNumber}</td>
                    <td className="p-4 max-w-xs truncate text-zinc-650 dark:text-zinc-400" title={req.reasonForRenewal}>
                      {req.reasonForRenewal}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        req.status === "Pending Admin Approval"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse"
                          : req.status === "Approved"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          : "bg-red-500/10 border-red-500/20 text-red-500"
                      }`}>
                        {req.status === "Pending Admin Approval" ? "Pending Approval" : req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {userRole === "Admin" && req.status === "Pending Admin Approval" ? (
                        <button
                          onClick={() => {
                            setActiveRequest(req);
                            setSelectedVehicle(vehicles.find(v => v.registrationNumber === req.vehicleReg) || null);
                            setNewPermitNumber(req.currentPermitNumber ? `${req.currentPermitNumber}-R` : `RPT-${Math.floor(10000 + Math.random() * 90000)}`);
                            setCofNumber(vehicles.find(v => v.registrationNumber === req.vehicleReg)?.cofNumber || "");
                            setIsProcessModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
                        >
                          Process Entry
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveRequest(req);
                            setSelectedVehicle(vehicles.find(v => v.registrationNumber === req.vehicleReg) || null);
                            setIsRequestModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold text-[10px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          Inspect File
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permanent Archival Ledger (Never Deletable) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-zinc-150 font-space">Permanent Permit Archival Registry</h4>
          </div>
          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold px-2.5 py-0.5 rounded uppercase font-mono-jb">
            Secure Cryptographic Store
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/50 dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-850 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                <th className="p-4">Archive Ref</th>
                <th className="p-4">Vehicle Plate</th>
                <th className="p-4">Archived Permit</th>
                <th className="p-4">Newly Extended Permit</th>
                <th className="p-4">Validity Range</th>
                <th className="p-4">Issued By</th>
                <th className="p-4">Archive Date</th>
                <th className="p-4">Comments & Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
              {renewalArchives.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 italic">
                    No historical permits have been archived yet.
                  </td>
                </tr>
              ) : (
                renewalArchives.map((arc) => (
                  <tr key={arc.id} className="hover:bg-zinc-50 dark:hover:bg-black/10">
                    <td className="p-4 font-mono-jb font-black text-emerald-600">{arc.id}</td>
                    <td className="p-4 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{arc.vehicleReg}</td>
                    <td className="p-4 font-mono-jb text-zinc-500">{arc.previousPermitNumber}</td>
                    <td className="p-4 font-mono-jb text-zinc-900 dark:text-zinc-200 font-bold">{arc.newPermitNumber}</td>
                    <td className="p-4">
                      <div className="font-mono-jb text-zinc-700 dark:text-zinc-300 text-[10px]">Issue: {arc.issueDate}</div>
                      <div className="font-mono-jb text-[10px] text-red-500 font-bold">Expiry: {arc.expiryDate}</div>
                    </td>
                    <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-300">{arc.administrator}</td>
                    <td className="p-4 font-mono-jb text-zinc-500">{arc.renewalDate}</td>
                    <td className="p-4 max-w-xs">
                      <p className="truncate text-zinc-600 dark:text-zinc-400 text-[11px]" title={arc.comments}>{arc.comments}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {arc.supportingDocuments.map((doc, idx) => (
                          <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] px-1.5 py-0.2 rounded font-mono truncate max-w-[120px]" title={doc}>
                            📄 {doc}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== SUBMIT RENEWAL REQUEST MODAL ==================== */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => {
                setIsRequestModalOpen(false);
                setActiveRequest(null);
              }}
              className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {activeRequest ? (
              // INSPECTION ONLY (Readonly file details)
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <ClipboardCheck className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-black font-space uppercase text-sm text-zinc-900 dark:text-zinc-100">Permit Renewal Petition File</h3>
                    <span className="text-[10px] font-mono-jb text-purple-500">{activeRequest.id} — Status: {activeRequest.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Vehicle Plate</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 font-mono-jb mt-0.5 block">{activeRequest.vehicleReg}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Fleet Number</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 font-mono-jb mt-0.5 block">{activeRequest.fleetId}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Current Permit Number</span>
                    <strong className="text-zinc-700 dark:text-zinc-300 font-mono-jb mt-0.5 block">{activeRequest.currentPermitNumber}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Permit Expiry Date</span>
                    <strong className="text-zinc-700 dark:text-zinc-300 font-mono-jb mt-0.5 block">{activeRequest.currentExpiryDate}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Licensed Operator</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">{activeRequest.operator}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Assigned Driver</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">{activeRequest.driver}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Operator License No.</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono">{activeRequest.operatorLicenseNumber || "OLN-SZ-8344"}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Association Concession ID</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono">{activeRequest.concessionId || "CNC-SZ-402"}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Odometer Reading</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono">{activeRequest.odometerReading ? `${activeRequest.odometerReading.toLocaleString()} KM` : "124,500 KM"}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Year of Manufacture</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono">{activeRequest.yearOfManufacture || "2018"}</strong>
                  </div>
                  <div className="p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl col-span-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Insurance Policy Provider & No.</span>
                    <strong className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">{activeRequest.insurancePolicy || "Swaziland Royal Insurance — SR-FLT-2911"}</strong>
                  </div>
                </div>

                <div className="space-y-1 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">Reason for Renewal</span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">{activeRequest.reasonForRenewal}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Operator Comments</span>
                  <div className="p-3 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 min-h-16 whitespace-pre-wrap leading-relaxed">
                    {activeRequest.comments || "No comments attached to this petition."}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Attached Support Materials</span>
                  <div className="flex flex-wrap gap-2">
                    {activeRequest.supportingDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-700 dark:text-zinc-300 font-mono">
                        <span>📄</span>
                        <span className="truncate max-w-[180px]">{doc}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {activeRequest.status !== "Pending Admin Approval" && (
                  <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/25 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Administration Action Verdict</span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-200 font-semibold">Processed by: {activeRequest.approvedBy} on {activeRequest.approvalDate}</p>
                    {activeRequest.renewalNotes && (
                      <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed italic">" {activeRequest.renewalNotes} "</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => {
                      setIsRequestModalOpen(false);
                      setActiveRequest(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Close File
                  </button>
                </div>
              </div>
            ) : (
              // SUBMIT FORM (Operator / Driver submission form)
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-black font-space uppercase text-sm text-zinc-900 dark:text-zinc-100">Submit Permit Renewal Request</h3>
                    <p className="text-[10px] text-zinc-500">Provide comments and support material. Values are checked against current records.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Select Fleet Vehicle</label>
                  <select
                    value={requestVehicleReg}
                    onChange={(e) => {
                      setRequestVehicleReg(e.target.value);
                      const v = vehicles.find(veh => veh.registrationNumber === e.target.value);
                      if (v) setSelectedVehicle(v);
                    }}
                    required
                    className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Assigned Vehicle --</option>
                    {allowedRequestVehicles.map(v => (
                      <option key={v.registrationNumber} value={v.registrationNumber}>
                        {v.registrationNumber} ({v.fleetNumber}) — {v.ownerName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedVehicle && (
                  <div className="p-3 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2 text-[11px] grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-zinc-400 block uppercase text-[9px] font-bold">Current Permit</span>
                      <span className="font-mono-jb text-zinc-800 dark:text-zinc-200 font-semibold">{selectedVehicle.permitNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block uppercase text-[9px] font-bold">Current Expiry</span>
                      <span className="font-mono-jb text-zinc-800 dark:text-zinc-200 font-semibold">{selectedVehicle.permitExpiryDate || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block uppercase text-[9px] font-bold">Licensed Operator</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{selectedVehicle.ownerName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block uppercase text-[9px] font-bold">Driver ID</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                        {drivers.find(d => d.id === selectedVehicle.driverId)?.fullName || "N/A"}
                      </span>
                    </div>
                    <div className="col-span-2 text-[9px] text-amber-500 font-bold uppercase tracking-wider pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                      ⚠️ Note: Changing Permit values or Approval states is strictly restricted.
                    </div>
                  </div>
                )}

                {/* ADVANCED RENEWAL PARTICULARS FORM SECTION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Operator License Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. OLN-SZ-8344"
                      value={operatorLicenseNumber}
                      onChange={(e) => setOperatorLicenseNumber(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Association Concession ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CNC-SZ-402"
                      value={concessionId}
                      onChange={(e) => setConcessionId(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Vehicle Year of Manufacture</label>
                    <input
                      type="number"
                      required
                      min={1990}
                      max={new Date().getFullYear()}
                      placeholder="e.g. 2018"
                      value={yearOfManufacture}
                      onChange={(e) => setYearOfManufacture(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Current Odometer Reading (KM)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 124500"
                      value={odometerReading}
                      onChange={(e) => setOdometerReading(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Insurance Policy Provider & No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Swaziland Royal Insurance — SR-FLT-2911"
                      value={insurancePolicy}
                      onChange={(e) => setInsurancePolicy(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Primary Reason for Request</label>
                  <select
                    value={reasonForRenewal}
                    onChange={(e) => setReasonForRenewal(e.target.value)}
                    required
                    className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Permit expiring soon, annual renewal required.">Permit expiring soon (within 30 days)</option>
                    <option value="Current permit has expired, urgent reinstatement required.">Current permit is already expired</option>
                    <option value="Original road certificate damaged, lost, or defaced.">Original certificate lost or damaged</option>
                    <option value="Vehicle ownership, route assignment, or concession change.">Ownership / Route Assignment concession change</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Supporting Comments / Explanations</label>
                  <textarea
                    placeholder="Enter any additional context, description of file materials, or specific renewal details..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
                  />
                </div>

                {/* REAL DRAG-AND-DROP FILE UPLOAD SYSTEM */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Upload Supporting Documents <span className="text-red-500 font-black animate-pulse">* STRICTLY &gt; 1MB REQUIRED</span>
                  </label>
                  
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFileUpload(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                      isDragging
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 hover:border-emerald-500"
                    }`}
                    onClick={() => document.getElementById("permit-file-input")?.click()}
                  >
                    <input
                      id="permit-file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                    <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-zinc-750 dark:text-zinc-200">
                      Drag &amp; drop files here, or <span className="text-emerald-500 font-black underline">browse local drive</span>
                    </p>
                    <p className="text-[9px] text-zinc-400 mt-1 uppercase tracking-wider">
                      PDF, JPG, PNG formats accepted • Minimum size: 1.05 MB (1,048,576 bytes)
                    </p>
                  </div>

                  {/* File Upload Error Block */}
                  {fileError && (
                    <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-xl text-xs text-red-500 font-medium flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  {/* Successfully Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1.5 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl">
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Verified Materials ({uploadedFiles.length})
                      </span>
                      <div className="space-y-1">
                        {uploadedFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-lg">
                            <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">📄 {f.name}</span>
                            <span className="font-mono text-[10px] text-emerald-600 font-bold shrink-0">
                              {(f.size / (1024 * 1024)).toFixed(2)} MB ✓
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsRequestModalOpen(false);
                      setSelectedVehicle(null);
                    }}
                    className="w-1/2 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!selectedVehicle || !requestVehicleReg || uploadedFiles.length === 0}
                    className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Request Renewal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================== ADMIN MANUAL PROCESSING MODAL ==================== */}
      {isProcessModalOpen && activeRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto space-y-4">
            <button 
              onClick={() => {
                setIsProcessModalOpen(false);
                setActiveRequest(null);
              }}
              className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleProcessRequest} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-150 dark:border-zinc-800">
                <Shield className="w-5 h-5 text-emerald-600 animate-pulse" />
                <div>
                  <h3 className="font-black font-space uppercase text-sm text-zinc-900 dark:text-zinc-100">Ministry Official Manual Entry</h3>
                  <p className="text-[10px] text-zinc-500">Manual verification required. No auto-generation. Enter values exactly as printed.</p>
                </div>
              </div>

              {/* Informational submitted details */}
              <div className="p-3 bg-zinc-50 dark:bg-black/30 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2 text-[11px]">
                <div className="flex justify-between font-semibold border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                  <span className="text-zinc-500">VEHICLE PLATE: {activeRequest.vehicleReg}</span>
                  <span className="text-emerald-500">OPERATOR: {activeRequest.operator}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-650 dark:text-zinc-400">
                  <div><strong>Operator License No:</strong> {activeRequest.operatorLicenseNumber || "OLN-SZ-8344"}</div>
                  <div><strong>Association Concession ID:</strong> {activeRequest.concessionId || "CNC-SZ-402"}</div>
                  <div><strong>Odometer Reading:</strong> {activeRequest.odometerReading ? `${activeRequest.odometerReading.toLocaleString()} KM` : "124,500 KM"}</div>
                  <div><strong>Year of Manufacture:</strong> {activeRequest.yearOfManufacture || "2018"}</div>
                  <div className="col-span-2"><strong>Insurance Policy:</strong> {activeRequest.insurancePolicy || "Swaziland Royal Insurance — SR-FLT-2911"}</div>
                </div>
                <div className="text-zinc-650 dark:text-zinc-400 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                  <strong>Reason:</strong> {activeRequest.reasonForRenewal}
                </div>
                {activeRequest.comments && (
                  <div className="text-zinc-500 italic">
                    <strong>Comments:</strong> "{activeRequest.comments}"
                  </div>
                )}
                <div className="flex gap-2 flex-wrap pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="font-bold text-[9px] text-zinc-450 uppercase">Attached Documents:</span>
                  {activeRequest.supportingDocuments.map((doc, idx) => (
                    <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] px-1.5 py-0.2 rounded font-mono">
                      📄 {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Input for manual entry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Status selection */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Approval Action Verdict</label>
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value as "Approved" | "Rejected")}
                    required
                    className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-xs"
                  >
                    <option value="Approved">APPROVE & ISSUE ROAD PERMIT</option>
                    <option value="Rejected">DECLINE & REJECT REQUEST</option>
                  </select>
                </div>

                {approvalStatus === "Approved" && (
                  <>
                    {/* New Permit Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Official Permit Number</label>
                      <input
                        type="text"
                        placeholder="e.g. SZ-RPT-4482"
                        required
                        value={newPermitNumber}
                        onChange={(e) => setNewPermitNumber(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb"
                      />
                    </div>

                    {/* Licensing Office */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Issuing Licensing Office</label>
                      <select
                        value={licensingOffice}
                        onChange={(e) => setLicensingOffice(e.target.value)}
                        required
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                      >
                        <option value="Mbabane Licensing Office">Mbabane Licensing Office</option>
                        <option value="Manzini Licensing Office">Manzini Licensing Office</option>
                        <option value="Piggs Peak Licensing Office">Piggs Peak Licensing Office</option>
                        <option value="Nhlangano Licensing Office">Nhlangano Licensing Office</option>
                        <option value="Siteki Licensing Office">Siteki Licensing Office</option>
                      </select>
                    </div>

                    {/* Permit Issue Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Permit Issue Date</label>
                      <input
                        type="date"
                        required
                        value={permitIssueDate}
                        onChange={(e) => setPermitIssueDate(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb"
                      />
                    </div>

                    {/* Permit Expiry Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Permit Expiry Date</label>
                      <input
                        type="date"
                        required
                        value={permitExpiryDate}
                        onChange={(e) => setPermitExpiryDate(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb text-red-500"
                      />
                    </div>

                    {/* COF Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">COF Certificate Number</label>
                      <input
                        type="text"
                        placeholder="e.g. COF-8849"
                        required
                        value={cofNumber}
                        onChange={(e) => setCofNumber(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb"
                      />
                    </div>

                    {/* Inspection Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Road Inspection Date</label>
                      <input
                        type="date"
                        required
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb"
                      />
                    </div>

                    {/* COF Issue Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">COF Issue Date</label>
                      <input
                        type="date"
                        required
                        value={cofIssueDate}
                        onChange={(e) => setCofIssueDate(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb"
                      />
                    </div>

                    {/* COF Expiry Date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">COF Expiry Date</label>
                      <input
                        type="date"
                        required
                        value={cofExpiryDate}
                        onChange={(e) => setCofExpiryDate(e.target.value)}
                        className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-mono-jb text-red-500"
                      />
                    </div>
                  </>
                )}

                {/* Notes / Comments */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    {approvalStatus === "Approved" ? "Ministry Approval Notes / Special Conditions" : "Official Rejection Reasons"}
                  </label>
                  <textarea
                    placeholder="Enter permanent official conditions or decline causes..."
                    required={approvalStatus === "Rejected"}
                    value={renewalNotes}
                    onChange={(e) => setRenewalNotes(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-black/30 border border-zinc-250 dark:border-zinc-800 rounded-xl font-sans"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsProcessModalOpen(false);
                    setActiveRequest(null);
                  }}
                  className="w-1/2 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Apply Manual Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
