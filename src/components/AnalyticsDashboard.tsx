/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Vehicle, Driver, Route, Trip, IncidentReport } from "../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { TrendingUp, Users, DollarSign, Award, ThumbsUp, MapPin, ShieldAlert, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface AnalyticsDashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  routes: Route[];
  trips: Trip[];
  incidents?: IncidentReport[];
}

export default function AnalyticsDashboard({
  vehicles,
  drivers,
  routes,
  trips,
  incidents = []
}: AnalyticsDashboardProps) {

  // 1. General Analytics calculation
  const totalVehicles = vehicles.length;
  // Active means anything except Offline
  const activeVehicles = vehicles.filter((v) => v.status !== "Offline").length;
  const delayedVehicles = vehicles.filter((v) => v.status === "Delayed").length;
  const departedVehiclesTodayCount = trips.filter(t => t.date === "2026-06-16").length;

  const totalPassengersToday = trips
    .filter((t) => t.date === "2026-06-16" && t.status !== "Cancelled")
    .reduce((sum, t) => sum + t.passengerCount, 0);

  const totalEstRevenueToday = trips
    .filter((t) => t.date === "2026-06-16" && t.status !== "Cancelled")
    .reduce((sum, t) => sum + t.revenueSZL, 0);

  // 2. Prepare visual charts data
  // Group trips count & passengers by route
  const routeStats = routes.map((r) => {
    const routeTrips = trips.filter((t) => t.routeId === r.id);
    const passengersCount = routeTrips.reduce((sum, t) => sum + t.passengerCount, 0);
    const revenueCount = routeTrips.reduce((sum, t) => sum + t.revenueSZL, 0);

    return {
      name: `${r.origin}→${r.destination}`,
      trips: routeTrips.length,
      passengers: passengersCount,
      revenue: revenueCount,
      region: r.region
    };
  }).filter(stat => stat.passengers > 0); // only show routes that actually had data

  // Region revenue shares
  const regions = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"];
  const regionShareData = regions.map((reg) => {
    const regionRoutes = routes.filter((r) => r.region === reg);
    const regionTrips = trips.filter((t) => regionRoutes.some((rr) => rr.id === t.routeId));
    const revenue = regionTrips.reduce((sum, t) => sum + t.revenueSZL, 0);

    return {
      name: `${reg} Region`,
      value: revenue
    };
  }).filter(d => d.value > 0);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Download Feature */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-805">
        <div>
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-150 uppercase tracking-widest font-space flex items-center gap-2">
            📊 NATIONAL TRANSIT INTELLIGENCE DASHBOARD
          </h2>
          <p className="text-[10px] text-zinc-400 font-medium">Real-time telemetry, commuter throughput, revenue distribution, and region-wide diagnostics.</p>
        </div>

        <button
          onClick={() => {
            // Compile a summary report CSV
            const lines = [];
            lines.push("=== ESWATINI NATIONAL TRANSIT OPERATIONS REPORT ===");
            lines.push(`Generated: ${new Date().toLocaleString()}`);
            lines.push("");
            lines.push("--- KEY OPERATIONAL METRICS ---");
            lines.push(`Total Vehicles Registered,${totalVehicles}`);
            lines.push(`Active Fleet Count,${activeVehicles}`);
            lines.push(`Delayed Vehicles Count,${delayedVehicles}`);
            lines.push(`Total Passengers Dispatched Today,${totalPassengersToday}`);
            lines.push(`Est. Gross Revenue Generated Today,SZL ${totalEstRevenueToday}`);
            lines.push("");
            lines.push("--- REGIONAL REVENUE SHARE ---");
            regionShareData.forEach(r => {
              lines.push(`${r.name},SZL ${r.value}`);
            });
            lines.push("");
            lines.push("--- ROUTE PERFORMANCE MATRIX ---");
            lines.push("Route,Trips Completed,Passengers Carried,Gross Revenue SZL");
            routeStats.forEach(r => {
              lines.push(`"${r.name}",${r.trips},${r.passengers},SZL ${r.revenue}`);
            });
            
            const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
            const link = document.createElement("a");
            link.setAttribute("href", csvContent);
            link.setAttribute("download", `eswatini_national_transit_analytics_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer border border-emerald-500 self-start sm:self-auto"
        >
          📥 Download Analytics CSV Report
        </button>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div id="stat-card-trips" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-blue-500/10 text-blue-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Voyages Completed</span>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono-jb mt-1">{departedVehiclesTodayCount}</h3>
            <span className="text-[10px] text-zinc-400">Live operational count</span>
          </div>
        </div>

        <div id="stat-card-passengers" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Commuters</span>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono-jb mt-1">{totalPassengersToday}</h3>
            <span className="text-[10px] text-zinc-400">SZ commuters transported</span>
          </div>
        </div>

        <div id="stat-card-revenue" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Est. Day Income</span>
            <h3 className="text-2xl font-black text-emerald-500 font-mono-jb mt-1">E {totalEstRevenueToday}</h3>
            <span className="text-[10px] text-zinc-400">SZL Emalangeni total</span>
          </div>
        </div>

        <div id="stat-card-fleet" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
          <div className="p-3.5 bg-purple-500/10 text-purple-500 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Fleet Utilization</span>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono-jb mt-1">
              {totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0}%
            </h3>
            <span className="text-[10px] text-zinc-400">{activeVehicles} on {totalVehicles} registered</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Layout using Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Busiest route bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 p-6 rounded-2xl">
          <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Route Passenger Load Distribution
              </h4>
              <p className="text-zinc-500 text-xs mt-0.5">Trips and passengers served across Eswatini corridors</p>
            </div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">SZL Index</span>
          </div>

          <div className="h-80 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeStats} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888888" />
                <YAxis tick={{ fontSize: 10 }} stroke="#888888" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e1b4b", color: "#fff", borderRadius: "10px", border: "none" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="passengers" name="Passengers" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {routeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Region Share Pie chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-zinc-150 dark:border-zinc-800">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Regional Share Revenue (SZL)
              </h4>
              <p className="text-zinc-500 text-xs mt-0.5">Income distributions based on origin regions</p>
            </div>

            <div className="h-48 w-full mt-6 flex justify-center items-center">
              {regionShareData.length === 0 ? (
                <div className="text-center text-zinc-400 text-xs">No revenue data. Conduct a trip first!</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionShareData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {regionShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1f2937", color: "#fff", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800 font-sans text-xs">
            {regionShareData.map((d, index) => (
              <div key={d.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="text-zinc-650 dark:text-zinc-300 font-medium">{d.name}</span>
                </div>
                <span className="font-bold font-mono-jb text-[11px]">E {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Driver Cards */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-250 dark:border-zinc-800">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider pb-3 border-b border-zinc-150 dark:border-zinc-800 mb-6">
          🏆 Top Transporter Drivers of the Day
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {drivers.slice(0, 3).map((drv) => {
            const drvTrips = trips.filter((t) => t.driverId === drv.id);
            const drvPassengers = drvTrips.reduce((sum, t) => sum + t.passengerCount, 0);
            const drvRevenue = drvTrips.reduce((sum, t) => sum + t.revenueSZL, 0);

            return (
              <div key={drv.id} className="p-4 bg-zinc-50 dark:bg-black/32 border border-zinc-200 dark:border-zinc-850 rounded-xl relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-space font-bold text-sm text-zinc-900 dark:text-zinc-100">{drv.fullName}</h5>
                    <p className="text-[10px] text-zinc-400 font-mono-jb mt-0.5">V: {drv.assignedVehicleReg}</p>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Excellent
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-550 border-t border-zinc-150 dark:border-zinc-800 mt-6 pt-3">
                  <div>
                    <span>Trips</span>
                    <strong className="block font-mono-jb text-zinc-800 dark:text-zinc-200 text-xs mt-0.5">{drvTrips.length}</strong>
                  </div>
                  <div>
                    <span>Passengers</span>
                    <strong className="block font-mono-jb text-zinc-800 dark:text-zinc-200 text-xs mt-0.5">{drvPassengers}</strong>
                  </div>
                  <div>
                    <span>Revenue</span>
                    <strong className="block font-mono-jb text-emerald-500 text-xs mt-0.5">E {drvRevenue}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
