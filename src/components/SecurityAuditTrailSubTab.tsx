import React, { useState } from "react";
import { Shield, Search, Info } from "lucide-react";
import { PermitAuditLog } from "../types";

interface SecurityAuditTrailSubTabProps {
  auditLogs: PermitAuditLog[];
}

export default function SecurityAuditTrailSubTab({ auditLogs }: SecurityAuditTrailSubTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = auditLogs.filter(log => {
    return (
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.previousValues.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.newValues.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Informative Security Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-zinc-100 font-space tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500 animate-pulse" />
            Immutable Security Audit Ledger
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
            This module registers cryptographic logs of all administrative modifications, permit generation, renewals, suspensions, and manual entries. In accordance with Ministry protocol, **nothing on this register may be modified or permanently deleted**.
          </p>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold px-3 py-1.5 rounded-full uppercase tracking-wider font-mono-jb shrink-0">
          ● Secure Records: {auditLogs.length}
        </span>
      </div>

      {/* Search Logs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by user, action type, changes, or registration plates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/50 dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-850 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                <th className="p-4">Log ID</th>
                <th className="p-4 font-space">Operating User</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Regulatory Action</th>
                <th className="p-4">Previous State parameters</th>
                <th className="p-4">New State Parameters</th>
                <th className="p-4">Terminal Device</th>
                <th className="p-4">IP Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 italic">
                    No matching audit records found in the security vault.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-black/25 transition-colors">
                    <td className="p-4 font-mono-jb font-black text-emerald-600 dark:text-emerald-400">{log.id}</td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{log.user}</td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-mono-jb font-semibold">{log.date}</div>
                      <div className="text-[10px] text-zinc-400">{log.time}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono-jb font-black uppercase ${
                        log.action.includes("APPROVED") || log.action.includes("REGISTERED")
                          ? "bg-emerald-500/10 text-emerald-500"
                          : log.action.includes("REJECTED") || log.action.includes("REVOKE") || log.action.includes("DELETE")
                          ? "bg-red-500/10 text-red-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {log.action}
                      </span>
                      {log.approvalDecision && (
                        <div className="text-[9px] text-zinc-450 mt-1">Decision: <span className="font-bold">{log.approvalDecision}</span></div>
                      )}
                    </td>
                    <td className="p-4 max-w-xs font-mono text-[10px] text-zinc-500 break-words leading-relaxed">
                      {log.previousValues}
                    </td>
                    <td className="p-4 max-w-xs font-mono text-[10px] text-zinc-800 dark:text-zinc-200 font-bold break-words leading-relaxed">
                      {log.newValues}
                    </td>
                    <td className="p-4 text-zinc-500 truncate max-w-[150px] font-medium" title={log.device}>
                      {log.device}
                    </td>
                    <td className="p-4 font-mono-jb text-zinc-400 font-medium">{log.ipAddress || "102.168.1.1"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
