import React, { useState } from "react";
import { 
  Download, Printer, Filter, Calendar, FileText, CheckCircle, AlertTriangle, XCircle, MapPin, User, Shield
} from "lucide-react";
import { Vehicle, Route, Driver, EswatiniRegion, PermitRenewalRequest } from "../types";

interface ComplianceReportsSubTabProps {
  vehicles: Vehicle[];
  routes: Route[];
  drivers: Driver[];
  renewalRequests: PermitRenewalRequest[];
}

type ReportType = 
  | "expiring_permits"
  | "expired_permits"
  | "renewals_region"
  | "renewals_operator"
  | "renewals_driver"
  | "cof_expiry"
  | "vehicle_status"
  | "renewal_approval";

export default function ComplianceReportsSubTab({
  vehicles,
  routes,
  drivers,
  renewalRequests
}: ComplianceReportsSubTabProps) {
  const [activeReport, setActiveReport] = useState<ReportType>("expiring_permits");

  // Helper to calculate days remaining
  const calculateDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 0;
    const expiry = new Date(expiryDateStr);
    const today = new Date("2026-07-14"); // Baseline system date
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Compute stats and reports data in real-time
  const expiringSoonList = vehicles.filter(v => {
    const daysLeft = calculateDaysRemaining(v.permitExpiryDate);
    return daysLeft >= 0 && daysLeft <= 30 && v.permitStatus !== "Suspended";
  });

  const expiredList = vehicles.filter(v => {
    const daysLeft = calculateDaysRemaining(v.permitExpiryDate);
    return daysLeft < 0 && v.permitStatus !== "Suspended";
  });

  const regionGroupReport = Object.values(EswatiniRegion).map(reg => {
    const regVehicles = vehicles.filter(v => {
      const route = routes.find(r => r.id === v.routeAssignmentId);
      return route?.region === reg;
    });
    const pending = renewalRequests.filter(r => r.status === "Pending Admin Approval" && regVehicles.some(v => v.registrationNumber === r.vehicleReg)).length;
    const expired = regVehicles.filter(v => calculateDaysRemaining(v.permitExpiryDate) < 0).length;
    return {
      region: reg,
      totalCount: regVehicles.length,
      activeCount: regVehicles.filter(v => v.permitStatus === "Active").length,
      pendingCount: pending,
      expiredCount: expired
    };
  });

  const operatorGroupReport = Array.from(new Set(vehicles.map(v => v.ownerName || "Unknown"))).map(opName => {
    const opVehicles = vehicles.filter(v => v.ownerName === opName);
    const pending = renewalRequests.filter(r => r.status === "Pending Admin Approval" && r.operator === opName).length;
    const expired = opVehicles.filter(v => calculateDaysRemaining(v.permitExpiryDate) < 0).length;
    return {
      operatorName: opName,
      totalCount: opVehicles.length,
      pendingCount: pending,
      expiredCount: expired
    };
  });

  const driverGroupReport = drivers.map(d => {
    const assignedVeh = vehicles.find(v => v.driverId === d.id);
    return {
      fullName: d.fullName,
      licenseNumber: d.licenseNumber || "N/A",
      pdpNumber: d.pdpNumber || "N/A",
      vehicleReg: assignedVeh ? assignedVeh.registrationNumber : "Unassigned",
      permitExpiry: assignedVeh ? assignedVeh.permitExpiryDate : "N/A",
      daysLeft: assignedVeh ? calculateDaysRemaining(assignedVeh.permitExpiryDate) : 999
    };
  });

  const cofExpiryReport = vehicles.map(v => {
    const d = calculateDaysRemaining(v.cofExpiryDate);
    return {
      registrationNumber: v.registrationNumber,
      fleetNumber: v.fleetNumber,
      cofNumber: v.cofNumber || "N/A",
      cofExpiryDate: v.cofExpiryDate || "N/A",
      daysRemaining: d
    };
  });

  const vehicleStatusReport = vehicles.map(v => {
    const daysLeft = calculateDaysRemaining(v.permitExpiryDate);
    let validity = "Valid";
    if (daysLeft < 0) validity = "Expired";
    else if (daysLeft <= 30) validity = "Expiring Soon";
    if (v.permitStatus === "Suspended") validity = "Suspended";

    return {
      registrationNumber: v.registrationNumber,
      fleetNumber: v.fleetNumber,
      classification: v.classification,
      ownerName: v.ownerName,
      status: v.status,
      permitNumber: v.permitNumber || "N/A",
      permitExpiryDate: v.permitExpiryDate || "N/A",
      validity
    };
  });

  const renewalApprovalReport = renewalRequests;

  // Handle Export CSV
  const handleExportCSV = (reportId: ReportType) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for Excel Hebrew/UTF8 support
    
    if (reportId === "expiring_permits" || reportId === "expired_permits") {
      const data = reportId === "expiring_permits" ? expiringSoonList : expiredList;
      csvContent += "Registration Number,Fleet ID,Permit Number,Expiry Date,Owner,Driver,Route,Region\n";
      data.forEach(v => {
        const route = routes.find(r => r.id === v.routeAssignmentId);
        const routeStr = route ? `${route.origin} - ${route.destination}` : "N/A";
        const regionStr = route ? route.region : "N/A";
        const dName = drivers.find(d => d.id === v.driverId)?.fullName || "N/A";
        csvContent += `${v.registrationNumber},${v.fleetNumber},${v.permitNumber || "N/A"},${v.permitExpiryDate || "N/A"},"${v.ownerName}","${dName}","${routeStr}","${regionStr}"\n`;
      });
    } else if (reportId === "renewals_region") {
      csvContent += "Region,Total Fleet Count,Active Permits,Pending Approval,Expired Permits\n";
      regionGroupReport.forEach(row => {
        csvContent += `"${row.region}",${row.totalCount},${row.activeCount},${row.pendingCount},${row.expiredCount}\n`;
      });
    } else if (reportId === "renewals_operator") {
      csvContent += "Operator Name,Total Managed Vehicles,Pending Renewals,Expired Permits\n";
      operatorGroupReport.forEach(row => {
        csvContent += `"${row.operatorName}",${row.totalCount},${row.pendingCount},${row.expiredCount}\n`;
      });
    } else if (reportId === "renewals_driver") {
      csvContent += "Driver Name,License Number,PDP Card Number,Vehicle Registration,Permit Expiry Date\n";
      driverGroupReport.forEach(row => {
        csvContent += `"${row.fullName}","${row.licenseNumber}","${row.pdpNumber}","${row.vehicleReg}","${row.permitExpiry}"\n`;
      });
    } else if (reportId === "cof_expiry") {
      csvContent += "Registration Number,Fleet Number,COF Number,COF Expiry Date,Days Remaining,Status\n";
      cofExpiryReport.forEach(row => {
        const st = row.daysRemaining < 0 ? "Expired" : row.daysRemaining <= 30 ? "Expiring Soon" : "Valid";
        csvContent += `${row.registrationNumber},${row.fleetNumber},${row.cofNumber},${row.cofExpiryDate},${row.daysRemaining},${st}\n`;
      });
    } else if (reportId === "vehicle_status") {
      csvContent += "Registration Number,Fleet Number,Classification,Licensed Operator,Queue Status,Permit Number,Permit Expiry,Permit Validity\n";
      vehicleStatusReport.forEach(row => {
        csvContent += `${row.registrationNumber},${row.fleetNumber},${row.classification},"${row.ownerName}",${row.status},${row.permitNumber},${row.permitExpiryDate},${row.validity}\n`;
      });
    } else if (reportId === "renewal_approval") {
      csvContent += "Request ID,Vehicle Reg,Operator Name,Submitted Date,Approval Status,Processed Date,Approved By,Manual Entry Notes\n";
      renewalApprovalReport.forEach(row => {
        csvContent += `${row.id},${row.vehicleReg},"${row.operator}",${row.requestDate},${row.status},${row.approvalDate || "N/A"},"${row.approvedBy || "N/A"}","${row.renewalNotes || ""}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kombiflow_${reportId}_compliance_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle local trigger to open standard print dialogue
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Informative Report Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-zinc-100 font-space tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Ministry Compliance Reporting Engine
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
            Audit compliance levels of transport operators, certificates of fitness (COF), and pending/expired permit statuses. Print directly or download tabular CSV logs.
          </p>
        </div>
      </div>

      {/* Reports Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
          <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase p-2 block">Choose Report Query</span>
          {[
            { id: "expiring_permits", label: "⏳ Expiring Permits (30d)", desc: "Permits expiring within 30 days" },
            { id: "expired_permits", label: "🚨 Expired Permits", desc: "Non-compliant expired registrations" },
            { id: "renewals_region", label: "🗺️ Renewals by Region", desc: "Regional compliance densities" },
            { id: "renewals_operator", label: "💼 Renewals by Operator", desc: "Operator registration audit" },
            { id: "renewals_driver", label: "🚐 Renewals by Driver", desc: "Driver license and PDP checklist" },
            { id: "cof_expiry", label: "🔧 COF Expiry Report", desc: "Certificates of Fitness registry" },
            { id: "vehicle_status", label: "📊 Vehicle Status Report", desc: "Real-time queue and permit validity" },
            { id: "renewal_approval", label: "📋 Renewal Approval Log", desc: "History of processed approvals" }
          ].map((rep) => (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as ReportType)}
              className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col ${
                activeReport === rep.id
                  ? "bg-emerald-600 text-white shadow-md font-bold"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="text-xs font-semibold">{rep.label}</span>
              <span className={`text-[9px] mt-0.5 ${activeReport === rep.id ? "text-emerald-100" : "text-zinc-400"}`}>
                {rep.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Display Content Pane */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Report Header Action buttons */}
            <div className="flex justify-between items-center pb-3 border-b border-zinc-150 dark:border-zinc-800 flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black uppercase text-zinc-900 dark:text-zinc-100 font-space tracking-tight">
                  {activeReport.replace("_", " ").toUpperCase()} REPORT
                </h4>
                <p className="text-[11px] text-zinc-450 mt-0.5">Live database telemetry formatted in real-time.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print PDF
                </button>
                <button
                  onClick={() => handleExportCSV(activeReport)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Excel (CSV)
                </button>
              </div>
            </div>

            {/* TABULAR REPORTS RENDERING */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-zinc-150 dark:border-zinc-850 rounded-xl">
              
              {/* 1. Expiring Permits Table */}
              {activeReport === "expiring_permits" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Vehicle Reg</th>
                      <th className="p-3">Fleet ID</th>
                      <th className="p-3">Permit Number</th>
                      <th className="p-3 text-amber-500">Expiry Date</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Days Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {expiringSoonList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center italic text-zinc-500">No permits expiring within 30 days.</td>
                      </tr>
                    ) : (
                      expiringSoonList.map(v => (
                        <tr key={v.registrationNumber} className="hover:bg-zinc-100/50">
                          <td className="p-3 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{v.registrationNumber}</td>
                          <td className="p-3 font-mono-jb text-zinc-500">{v.fleetNumber}</td>
                          <td className="p-3 font-mono-jb text-zinc-600">{v.permitNumber || "N/A"}</td>
                          <td className="p-3 font-mono-jb text-amber-500 font-bold">{v.permitExpiryDate}</td>
                          <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">{v.ownerName}</td>
                          <td className="p-3 font-semibold text-zinc-700">{calculateDaysRemaining(v.permitExpiryDate)} Days</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 2. Expired Permits Table */}
              {activeReport === "expired_permits" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Vehicle Reg</th>
                      <th className="p-3">Fleet ID</th>
                      <th className="p-3">Permit Number</th>
                      <th className="p-3 text-red-500">Expiry Date</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Overdue Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {expiredList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center italic text-zinc-500">All registered vehicle permits are fully valid.</td>
                      </tr>
                    ) : (
                      expiredList.map(v => (
                        <tr key={v.registrationNumber} className="hover:bg-zinc-100/50">
                          <td className="p-3 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{v.registrationNumber}</td>
                          <td className="p-3 font-mono-jb text-zinc-500">{v.fleetNumber}</td>
                          <td className="p-3 font-mono-jb text-zinc-600">{v.permitNumber || "N/A"}</td>
                          <td className="p-3 font-mono-jb text-red-500 font-bold">{v.permitExpiryDate}</td>
                          <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">{v.ownerName}</td>
                          <td className="p-3 font-semibold text-red-600">{Math.abs(calculateDaysRemaining(v.permitExpiryDate))} Days Overdue</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 3. Renewals by Region */}
              {activeReport === "renewals_region" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Region</th>
                      <th className="p-3 text-center">Total Vehicles</th>
                      <th className="p-3 text-center text-emerald-500">Active Permits</th>
                      <th className="p-3 text-center text-amber-500">Pending Requests</th>
                      <th className="p-3 text-center text-red-500">Expired Permits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {regionGroupReport.map(row => (
                      <tr key={row.region} className="hover:bg-zinc-100/50 font-medium text-zinc-800 dark:text-zinc-200">
                        <td className="p-3 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400" />{row.region}</td>
                        <td className="p-3 text-center font-bold">{row.totalCount}</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">{row.activeCount}</td>
                        <td className="p-3 text-center text-amber-500 font-bold">{row.pendingCount}</td>
                        <td className="p-3 text-center text-red-500 font-bold">{row.expiredCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 4. Renewals by Operator */}
              {activeReport === "renewals_operator" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Operator Name</th>
                      <th className="p-3 text-center">Managed Fleet Count</th>
                      <th className="p-3 text-center text-amber-500">Pending Renewals</th>
                      <th className="p-3 text-center text-red-500">Expired Permits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {operatorGroupReport.map(row => (
                      <tr key={row.operatorName} className="hover:bg-zinc-100/50">
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-zinc-400" />{row.operatorName}</td>
                        <td className="p-3 text-center font-bold text-zinc-700">{row.totalCount}</td>
                        <td className="p-3 text-center text-amber-500 font-bold">{row.pendingCount}</td>
                        <td className="p-3 text-center text-red-500 font-bold">{row.expiredCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 5. Renewals by Driver */}
              {activeReport === "renewals_driver" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Driver Name</th>
                      <th className="p-3">License Number</th>
                      <th className="p-3">PDP Card</th>
                      <th className="p-3">Assigned Plate</th>
                      <th className="p-3">Permit Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {driverGroupReport.map(row => (
                      <tr key={row.fullName} className="hover:bg-zinc-100/50">
                        <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{row.fullName}</td>
                        <td className="p-3 font-mono-jb text-zinc-500">{row.licenseNumber}</td>
                        <td className="p-3 font-mono-jb text-zinc-500">{row.pdpNumber}</td>
                        <td className="p-3 font-mono-jb text-zinc-800 font-semibold">{row.vehicleReg}</td>
                        <td className={`p-3 font-mono-jb font-semibold ${row.daysLeft < 0 ? "text-red-500" : row.daysLeft <= 30 ? "text-amber-500" : "text-zinc-650"}`}>
                          {row.permitExpiry}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 6. COF Expiry Report */}
              {activeReport === "cof_expiry" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Vehicle Reg</th>
                      <th className="p-3">Fleet ID</th>
                      <th className="p-3">COF Certificate</th>
                      <th className="p-3">COF Expiry Date</th>
                      <th className="p-3">Days Remaining</th>
                      <th className="p-3">Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {cofExpiryReport.map(row => (
                      <tr key={row.registrationNumber} className="hover:bg-zinc-100/50">
                        <td className="p-3 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{row.registrationNumber}</td>
                        <td className="p-3 font-mono-jb text-zinc-500">{row.fleetNumber}</td>
                        <td className="p-3 font-mono-jb text-zinc-600">{row.cofNumber}</td>
                        <td className="p-3 font-mono-jb font-semibold">{row.cofExpiryDate}</td>
                        <td className="p-3 font-semibold text-zinc-700">{row.daysRemaining} Days</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            row.daysRemaining < 0
                              ? "bg-red-500/10 border-red-500/20 text-red-500"
                              : row.daysRemaining <= 30
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          }`}>
                            {row.daysRemaining < 0 ? "Expired" : row.daysRemaining <= 30 ? "Urgent Renewal" : "Compliant"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 7. Vehicle Status Report */}
              {activeReport === "vehicle_status" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Vehicle Reg</th>
                      <th className="p-3">Fleet ID</th>
                      <th className="p-3">Classification</th>
                      <th className="p-3">Licensed Operator</th>
                      <th className="p-3">Queue Status</th>
                      <th className="p-3">Permit Number</th>
                      <th className="p-3">Permit Validity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {vehicleStatusReport.map(row => (
                      <tr key={row.registrationNumber} className="hover:bg-zinc-100/50">
                        <td className="p-3 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{row.registrationNumber}</td>
                        <td className="p-3 font-mono-jb text-zinc-500">{row.fleetNumber}</td>
                        <td className="p-3 capitalize text-zinc-650">{row.classification}</td>
                        <td className="p-3 font-medium text-zinc-850 dark:text-zinc-200">{row.ownerName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-850 rounded font-bold text-[9px] uppercase text-zinc-600">
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono-jb text-zinc-500">{row.permitNumber}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            row.validity === "Expired" || row.validity === "Suspended"
                              ? "bg-red-500/10 border-red-500/20 text-red-500"
                              : row.validity === "Expiring Soon"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          }`}>
                            {row.validity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 8. Renewal Approval Log */}
              {activeReport === "renewal_approval" && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 font-bold text-[10px] text-zinc-450 uppercase sticky top-0">
                    <tr>
                      <th className="p-3">Request ID</th>
                      <th className="p-3">Vehicle Plate</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Petition Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Approval Date</th>
                      <th className="p-3">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                    {renewalApprovalReport.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center italic text-zinc-500">No permit approvals logged in history.</td>
                      </tr>
                    ) : (
                      renewalApprovalReport.map(row => (
                        <tr key={row.id} className="hover:bg-zinc-100/50">
                          <td className="p-3 font-mono-jb font-black text-emerald-600">{row.id}</td>
                          <td className="p-3 font-bold font-mono-jb text-zinc-900 dark:text-zinc-100">{row.vehicleReg}</td>
                          <td className="p-3 font-medium text-zinc-800 dark:text-zinc-200">{row.operator}</td>
                          <td className="p-3 font-mono-jb text-zinc-500">{row.requestDate}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              row.status === "Approved"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : row.status === "Rejected"
                                ? "bg-red-500/10 border-red-500/20 text-red-500"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono-jb text-zinc-650">{row.approvalDate || "N/A"}</td>
                          <td className="p-3 font-semibold text-zinc-800 dark:text-zinc-300">{row.approvedBy || "N/A"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
