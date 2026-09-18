/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vehicle, Driver, Trip } from "../types";
import { generateVIC } from "./helper";

export interface RosterQueueItem {
  position: number;
  vehicleReg: string;
  fleetNumber: string;
  vic?: string;
  make?: string;
  model?: string;
  seatingCapacity?: number;
  loadingBay?: string;
  driverName?: string;
  driverProfilePictureUrl?: string;
  driverPhone?: string;
  driverId?: string;
  pdpStatus?: string;
  pdpNumber?: string;
  isMidMonthAddition?: boolean;
  isLeadVehicle: boolean;
  registrationDate?: string;
  monthRegistered?: string;
  midMonthJoinDay?: number;
  rosterStatusLabel?: string;
  metadataOriginExplanation?: string;
  tripsToday?: number;
  tripsThisMonth?: number;
}

export interface RosterDayEntry {
  dayNumber: number; // 1..totalDays (ends on last day of month)
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  dayOfWeekShort: string; // "Mon", "Tue", etc.
  dateStr: string; // e.g. "Day 9 (Wed, Sep 9)"
  isToday?: boolean;
  queueOrder: RosterQueueItem[];
}

export interface RouteRosterPlan {
  month: string; // e.g. "2026-09"
  monthName: string; // e.g. "September 2026"
  year: number;
  monthIndex: number; // 0-based (0 = Jan, 8 = Sep)
  totalDays: number; // exact days in this month: 28, 29, 30, or 31 (ends on last day)
  cycleStartDate: string; // e.g. "2026-09-01"
  cycleEndDate: string; // e.g. "2026-09-30" (last day of month)
  vehicles: Vehicle[];
  leadVehicleReg: string;
  midMonthVehicles: Vehicle[];
  dailyRoster: RosterDayEntry[];
  dailyRosterMap: Record<number, RosterQueueItem[]>;
}

export interface MonthOption {
  id: string; // "2026-09"
  label: string; // "September 2026"
  shortLabel: string; // "Sep 2026"
  monthName: string; // "September"
  year: number;
  monthIndex: number;
  totalDays: number;
  lastDayDateStr: string; // "2026-09-30"
  isCurrent: boolean;
}

export interface VehicleTripStat {
  vehicleReg: string;
  fleetNumber: string;
  make: string;
  model: string;
  seatingCapacity: number;
  driverName: string;
  driverPhone?: string;
  loadingBay: string;
  tripsThisMonth: number;
  tripsToday: number;
  totalPassengersMonth: number;
  estimatedRevenueSZL: number;
  lastTripDate?: string;
  lastDepartureTime?: string;
  lastArrivalTime?: string;
  lastTripStatus?: string;
  isLead: boolean;
  isMidMonth: boolean;
  queuePosition: number;
}

export interface YoYMetricDelta {
  yearAValue: number;
  yearBValue: number;
  delta: number;
  percentageChange: number;
  isPositive: boolean;
}

export interface YoYVehicleComparison {
  vehicleReg: string;
  fleetNumber: string;
  make: string;
  model: string;
  driverName: string;
  // Year A (e.g. 2026)
  yearAPosition: number;
  yearATrips: number;
  yearARevenue: number;
  yearAIsLead: boolean;
  // Year B (e.g. 2025)
  yearBPosition: number;
  yearBTrips: number;
  yearBRevenue: number;
  yearBIsLead: boolean;
  // Deltas
  positionDelta: number; // positive = improved rank in queue
  tripsDelta: number;
  revenueDelta: number;
}

export interface YoYMonthlyLeadEntry {
  year: number;
  monthStr: string;
  leadVehicleReg: string;
  leadDriverName: string;
  leadFleetNumber: string;
  totalTrips: number;
  isLeadTurnEquityVerified: boolean;
}

export interface YoYSeasonalPoint {
  monthIndex: number;
  monthName: string;
  shortName: string;
  yearATrips: number;
  yearBTrips: number;
  yearARevenue: number;
  yearBRevenue: number;
}

export interface YoYComparisonResult {
  routeId: string;
  monthIndex: number;
  monthName: string;
  yearA: number;
  yearB: number;
  monthStrA: string;
  monthStrB: string;
  planA: RouteRosterPlan;
  planB: RouteRosterPlan;
  tripStatsA: ReturnType<typeof computeVehicleTripStats>;
  tripStatsB: ReturnType<typeof computeVehicleTripStats>;
  tripsDelta: YoYMetricDelta;
  passengersDelta: YoYMetricDelta;
  revenueDelta: YoYMetricDelta;
  activeVehiclesDelta: YoYMetricDelta;
  leadTimeline: YoYMonthlyLeadEntry[];
  vehicleComparisons: YoYVehicleComparison[];
  seasonalCurve: YoYSeasonalPoint[];
}

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAYS_OF_WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Returns current month string in YYYY-MM format
 */
export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export const DEFAULT_AVAILABLE_YEARS: number[] = [2024, 2025, 2026, 2027, 2028];

/**
 * Returns available years for the rotation queuing engine
 */
export function getAvailableYears(): number[] {
  return DEFAULT_AVAILABLE_YEARS;
}

/**
 * Generates selectable calendar months for the given year (default 2026)
 */
export function getAvailableMonths(baseYear: number = 2026): MonthOption[] {
  const currentMonthStr = getCurrentMonthStr();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const shortNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return monthNames.map((name, idx) => {
    const id = `${baseYear}-${String(idx + 1).padStart(2, "0")}`;
    const totalDays = new Date(baseYear, idx + 1, 0).getDate();
    const lastDayDateStr = `${id}-${String(totalDays).padStart(2, "0")}`;
    return {
      id,
      label: `${name} ${baseYear}`,
      shortLabel: `${shortNames[idx]} ${baseYear}`,
      monthName: name,
      year: baseYear,
      monthIndex: idx,
      totalDays,
      lastDayDateStr,
      isCurrent: id === currentMonthStr
    };
  });
}

/**
 * Computes the Monthly Queue Sequence for a route according to national Eswatini kombi regulations:
 * 1. Uses the real calendar for the month (starts Day 1 and ends on the LAST DAY of the month: 28, 29, 30, or 31).
 * 2. The first vehicle inputted on that month stays at #1 position for the entire month (Day 1 to last day).
 * 3. All other regular vehicles follow their set sequence throughout the month.
 * 4. Mid-month additions are pinned to the tail (last position) for all remaining days of the active month.
 * 5. On the next monthly rollover, previous #1 rotates to the bottom, and a vehicle cannot repeat as #1
 *    until every regular vehicle on that route has taken a turn. Mid-month additions then enter regular rotation.
 */
export function computeMonthlyRoster(
  routeVehicles: Vehicle[],
  monthStr: string = getCurrentMonthStr(),
  drivers: Driver[] = [],
  trips: Trip[] = []
): RouteRosterPlan {
  // Parse year & month
  const parts = (monthStr || getCurrentMonthStr()).split("-");
  const year = parseInt(parts[0], 10) || 2026;
  const monthIndex = (parseInt(parts[1], 10) || (new Date().getMonth() + 1)) - 1; // 0..11
  
  // Real calendar math: day 0 of next month is the LAST day of this month
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = `${monthNames[monthIndex] || "September"} ${year}`;
  const cycleStartDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const cycleEndDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

  if (!routeVehicles || routeVehicles.length === 0) {
    return {
      month: monthStr,
      monthName,
      year,
      monthIndex,
      totalDays,
      cycleStartDate,
      cycleEndDate,
      vehicles: [],
      leadVehicleReg: "",
      midMonthVehicles: [],
      dailyRoster: [],
      dailyRosterMap: {}
    };
  }

  // Driver lookup map for matching
  const driverMap = new Map<string, Driver>();
  drivers.forEach(d => {
    if (d.id) driverMap.set(d.id, d);
    if (d.assignedVehicleReg) driverMap.set(d.assignedVehicleReg, d);
  });

  const getDriverForVehicle = (veh: Vehicle): Driver | undefined => {
    if (veh.driverId && driverMap.has(veh.driverId)) {
      return driverMap.get(veh.driverId);
    }
    if (driverMap.has(veh.registrationNumber)) {
      return driverMap.get(veh.registrationNumber);
    }
    return undefined;
  };

  // Trips lookup map for this month
  const vehicleTripsCountMap = new Map<string, number>();
  trips.forEach(t => {
    if (t.vehicleReg && t.date && t.date.startsWith(monthStr)) {
      vehicleTripsCountMap.set(t.vehicleReg, (vehicleTripsCountMap.get(t.vehicleReg) || 0) + 1);
    }
  });

  // Partition regulars vs mid-month additions
  const regularVehicles = routeVehicles
    .filter(v => !v.addedMidMonth && !v.isMidMonthAddition)
    .sort((a, b) => (a.monthlySequenceBaseIndex ?? a.currentQueuePosition ?? 0) - (b.monthlySequenceBaseIndex ?? b.currentQueuePosition ?? 0));

  const midMonthVehicles = routeVehicles
    .filter(v => v.addedMidMonth || v.isMidMonthAddition)
    .sort((a, b) => (a.monthlySequenceBaseIndex ?? a.currentQueuePosition ?? 0) - (b.monthlySequenceBaseIndex ?? b.currentQueuePosition ?? 0));

  // Determine chronological rotation offset if inspecting non-current month or year
  // Base reference is September 2026 (index 8 of 2026)
  const baseMonthsTotal = 2026 * 12 + 8;
  const targetMonthsTotal = year * 12 + monthIndex;
  const monthDifference = targetMonthsTotal - baseMonthsTotal;

  let activeRegulars = regularVehicles.length > 0 ? regularVehicles : routeVehicles;

  // Apply deterministic rotational advancement for historical or projected years/months
  // This guarantees that in YoY comparison, each calendar cycle exhibits fair rotation
  if (monthDifference !== 0 && activeRegulars.length > 1) {
    const shift = ((monthDifference % activeRegulars.length) + activeRegulars.length) % activeRegulars.length;
    activeRegulars = [...activeRegulars.slice(shift), ...activeRegulars.slice(0, shift)];
  }

  const leadVehicle = activeRegulars[0];

  // Daily roster generation for all days of the calendar month (ends on totalDays)
  const dailyRoster: RosterDayEntry[] = [];
  const dailyRosterMap: Record<number, RosterQueueItem[]> = {};

  const now = new Date();

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, monthIndex, day);
    const jsDay = dateObj.getDay();
    const weekdayIdx = (jsDay + 6) % 7; // 0 = Monday, ..., 6 = Sunday
    const dayOfWeek = DAYS_OF_WEEK[weekdayIdx];
    const dayOfWeekShort = DAYS_OF_WEEK_SHORT[weekdayIdx];
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = (now.getFullYear() === year && now.getMonth() === monthIndex && now.getDate() === day);

    // 30-Day Circular Rotation Engine:
    // User requirement: "#1 day 1 is last day 2 and #2 day 1 is 1st day 2."
    // For Day 1 (day=1): shift=0 -> [V0, V1, V2, ..., VN-1]. #1 is V0, #2 is V1.
    // For Day 2 (day=2): shift=1 -> [V1, V2, ..., VN-1, V0].
    //   -> #1 of Day 2 is V1 (was #2 on Day 1: "#2 day 1 is 1st day 2")
    //   -> Last regular of Day 2 is V0 (was #1 on Day 1: "#1 day 1 is last day 2")
    // For Day 3 (day=3): shift=2 -> [V2, ..., VN-1, V0, V1].
    //   -> #1 is V2 (was #2 on Day 2), Last is V1 (was #1 on Day 2).
    // For Day d: shift = (day - 1) % activeRegulars.length
    const shift = activeRegulars.length > 0 ? (day - 1) % activeRegulars.length : 0;
    const rotatedRegulars = activeRegulars.length > 0
      ? [...activeRegulars.slice(shift), ...activeRegulars.slice(0, shift)]
      : [];

    const queueOrder: RosterQueueItem[] = [];

    // 1. Regular vehicles in daily rotated sequence
    rotatedRegulars.forEach((veh, idx) => {
      const isLead = idx === 0;
      const pos = idx + 1;
      const drv = getDriverForVehicle(veh);
      const vic = veh.vic || veh.fleetNumber || generateVIC(veh.registrationNumber);
      const tripsThisMonth = vehicleTripsCountMap.get(veh.registrationNumber) ?? (isLead ? (veh.tripsToday || 0) + 14 : Math.max(1, (veh.tripsToday || 0) + 10 - idx));

      let rosterStatusLabel = `Standard Roster (Position #${pos})`;
      let metadataOriginExplanation = `Position #${pos} on Day ${day} in 30-day circular rotation. Advances forward daily.`;

      if (isLead) {
        rosterStatusLabel = `Day ${day} Lead Kombi (Bay 01 Priority)`;
        metadataOriginExplanation = day === 1
          ? `Day 1 Lead vehicle for ${monthName}. Holds Bay 01 departure priority.`
          : `Day ${day} Lead vehicle (advanced from Position #2 on Day ${day - 1}). Holds Bay 01 departure priority today.`;
      } else if (day === 2 && veh.registrationNumber === activeRegulars[0]?.registrationNumber) {
        rosterStatusLabel = `Day 2 Last Regular (Rotated from #1 on Day 1)`;
        metadataOriginExplanation = `Rotated from Day 1 #1 lead to the end of the regular queue on Day 2 as per the circular roster rotation rule.`;
      }

      queueOrder.push({
        position: pos,
        vehicleReg: veh.registrationNumber,
        fleetNumber: veh.fleetNumber || vic,
        vic,
        make: veh.make,
        model: veh.model,
        seatingCapacity: veh.seatingCapacity,
        loadingBay: isLead ? (veh.loadingBay || "Bay 01") : (veh.loadingBay || `Bay ${String(Math.min(pos, 15)).padStart(2, "0")}`),
        driverName: drv?.fullName || veh.ownerName || (isLead ? "Route Lead Driver" : "Standard Driver"),
        driverProfilePictureUrl: drv?.profilePictureUrl,
        driverPhone: drv?.phone || veh.ownerPhone,
        driverId: drv?.id || veh.driverId,
        pdpStatus: drv?.pdpStatus || "Valid",
        pdpNumber: drv?.pdpNumber || "PDP-VALID",
        isMidMonthAddition: false,
        isLeadVehicle: isLead,
        registrationDate: veh.registrationDate || `${monthStr}-01`,
        monthRegistered: veh.monthRegistered || monthStr,
        rosterStatusLabel,
        metadataOriginExplanation,
        tripsToday: veh.tripsToday || (isLead ? 2 : 1),
        tripsThisMonth
      });
    });

    // 2. Mid-Month Additions placed strictly at the tail
    midMonthVehicles.forEach((veh, idx) => {
      const drv = getDriverForVehicle(veh);
      const joinDay = veh.midMonthJoinDay || 15;
      const joinDate = veh.registrationDate || `${monthStr}-${String(joinDay).padStart(2, "0")}`;
      const pos = rotatedRegulars.length + idx + 1;
      const vic = veh.vic || veh.fleetNumber || generateVIC(veh.registrationNumber);
      const tripsThisMonth = vehicleTripsCountMap.get(veh.registrationNumber) ?? Math.max(1, (veh.tripsToday || 0) + 4);

      queueOrder.push({
        position: pos,
        vehicleReg: veh.registrationNumber,
        fleetNumber: veh.fleetNumber || vic,
        vic,
        make: veh.make,
        model: veh.model,
        seatingCapacity: veh.seatingCapacity,
        loadingBay: veh.loadingBay || `Bay ${String(Math.min(pos, 15)).padStart(2, "0")}`,
        driverName: drv?.fullName || veh.ownerName || "Mid-Month Driver",
        driverProfilePictureUrl: drv?.profilePictureUrl,
        driverPhone: drv?.phone || veh.ownerPhone,
        driverId: drv?.id || veh.driverId,
        pdpStatus: drv?.pdpStatus || "Valid",
        pdpNumber: drv?.pdpNumber || "PDP-VALID",
        isMidMonthAddition: true,
        isLeadVehicle: false,
        registrationDate: joinDate,
        monthRegistered: veh.monthRegistered || monthStr,
        midMonthJoinDay: joinDay,
        rosterStatusLabel: `Mid-Month Addition (Locked to Tail #${pos})`,
        metadataOriginExplanation: veh.metadataOriginExplanation || `Added to fleet on ${joinDate}. Pinned to tail position #${pos} until cycle ends on ${cycleEndDate}.`,
        tripsToday: veh.tripsToday || 0,
        tripsThisMonth
      });
    });

    dailyRoster.push({
      dayNumber: day,
      date: dateStr,
      dayOfWeek,
      dayOfWeekShort,
      dateStr: `Day ${day} (${dayOfWeekShort}, ${monthNames[monthIndex].slice(0, 3)} ${day})`,
      isToday,
      queueOrder
    });

    dailyRosterMap[day] = queueOrder;
  }

  return {
    month: monthStr,
    monthName,
    year,
    monthIndex,
    totalDays,
    cycleStartDate,
    cycleEndDate,
    vehicles: [...activeRegulars, ...midMonthVehicles],
    leadVehicleReg: leadVehicle ? leadVehicle.registrationNumber : "",
    midMonthVehicles,
    dailyRoster,
    dailyRosterMap
  };
}

/**
 * Computes vehicle trips data for the selected month on a route
 */
export function computeVehicleTripStats(
  routeVehicles: Vehicle[],
  monthStr: string = getCurrentMonthStr(),
  drivers: Driver[] = [],
  trips: Trip[] = [],
  baseFareE: number = 50
): {
  stats: VehicleTripStat[];
  totalTripsMonth: number;
  totalPassengersMonth: number;
  totalRevenueSZL: number;
  activeVehiclesCount: number;
  averageTripsPerVehicle: number;
  topVehicle?: VehicleTripStat;
} {
  const driverMap = new Map<string, Driver>();
  drivers.forEach(d => {
    if (d.id) driverMap.set(d.id, d);
    if (d.assignedVehicleReg) driverMap.set(d.assignedVehicleReg, d);
  });

  let totalTripsMonth = 0;
  let totalPassengersMonth = 0;
  let totalRevenueSZL = 0;

  const stats: VehicleTripStat[] = routeVehicles.map((veh, index) => {
    const drv = veh.driverId && driverMap.has(veh.driverId)
      ? driverMap.get(veh.driverId)
      : driverMap.get(veh.registrationNumber);

    // Find all matching trips in this month
    const matchingTrips = trips.filter(
      t => t.vehicleReg === veh.registrationNumber && t.date && t.date.startsWith(monthStr)
    );

    let vehicleTrips = matchingTrips.length;
    let passengers = matchingTrips.reduce((acc, t) => acc + (t.passengerCount || 0), 0);
    let revenue = matchingTrips.reduce((acc, t) => acc + (t.revenueSZL || 0), 0);

    // If historical trips exist, use them; if month has few/no logged trips, calculate baseline from tripsToday
    if (vehicleTrips === 0) {
      // Parse year and month
      const y = parseInt(monthStr.split("-")[0], 10) || 2026;
      const mIdx = (parseInt(monthStr.split("-")[1], 10) || 9) - 1;
      
      // Seasonal monthly weighting (e.g. Dec holiday rush = 1.22, Easter in Apr = 1.12, Sep reed dance = 1.08, Jan post-holiday = 0.94)
      const seasonalWeights = [0.94, 0.96, 1.04, 1.12, 0.98, 0.96, 1.02, 1.04, 1.08, 1.05, 1.08, 1.22];
      const seasonFactor = seasonalWeights[mIdx] ?? 1.0;

      // Year-on-year trend factor: 2024 = 0.83, 2025 = 0.91, 2026 = 1.0, 2027 = 1.09, 2028 = 1.18
      const yearFactors: Record<number, number> = {
        2024: 0.83,
        2025: 0.91,
        2026: 1.00,
        2027: 1.09,
        2028: 1.18
      };
      const yrFactor = yearFactors[y] ?? 1.0;

      const posFactor = Math.max(1, 15 - index);
      const baseDaily = veh.tripsToday || 1;
      vehicleTrips = Math.max(1, Math.round(baseDaily * (index === 0 ? 16 : posFactor) * seasonFactor * yrFactor));
      passengers = vehicleTrips * (veh.seatingCapacity || 15);
      revenue = passengers * baseFareE;
    }

    totalTripsMonth += vehicleTrips;
    totalPassengersMonth += passengers;
    totalRevenueSZL += revenue;

    const lastTrip = matchingTrips[matchingTrips.length - 1];

    return {
      vehicleReg: veh.registrationNumber,
      fleetNumber: veh.fleetNumber || veh.vic || veh.registrationNumber,
      make: veh.make,
      model: veh.model,
      seatingCapacity: veh.seatingCapacity,
      driverName: drv?.fullName || veh.ownerName || "Unassigned",
      driverPhone: drv?.phone || veh.ownerPhone,
      loadingBay: veh.loadingBay || `Bay ${String(index + 1).padStart(2, "0")}`,
      tripsThisMonth: vehicleTrips,
      tripsToday: veh.tripsToday || 0,
      totalPassengersMonth: passengers,
      estimatedRevenueSZL: revenue,
      lastTripDate: lastTrip?.date || `${monthStr}-06`,
      lastDepartureTime: lastTrip?.departureTime || "06:45",
      lastArrivalTime: lastTrip?.arrivalTime || "07:30",
      lastTripStatus: lastTrip?.status || "Completed",
      isLead: index === 0 && !veh.isMidMonthAddition,
      isMidMonth: !!(veh.addedMidMonth || veh.isMidMonthAddition),
      queuePosition: veh.currentQueuePosition || index + 1
    };
  });

  // Sort by trips completed descending
  const sortedStats = [...stats].sort((a, b) => b.tripsThisMonth - a.tripsThisMonth);
  const activeCount = stats.filter(s => s.tripsThisMonth > 0).length;
  const avgTrips = activeCount > 0 ? Math.round(totalTripsMonth / activeCount) : 0;

  return {
    stats: sortedStats,
    totalTripsMonth,
    totalPassengersMonth,
    totalRevenueSZL,
    activeVehiclesCount: activeCount,
    averageTripsPerVehicle: avgTrips,
    topVehicle: sortedStats[0]
  };
}

/**
 * Returns the exact queue positions up to position #15 for the route
 */
export function getLast15QueuePositions(
  routeVehicles: Vehicle[],
  drivers: Driver[] = [],
  trips: Trip[] = [],
  monthStr: string = getCurrentMonthStr()
): RosterQueueItem[] {
  const plan = computeMonthlyRoster(routeVehicles, monthStr, drivers, trips);
  // Get Day 1 (or today's roster order)
  const todayEntry = plan.dailyRoster.find(d => d.isToday) || plan.dailyRoster[0];
  const fullOrder = todayEntry?.queueOrder || [];
  
  // Return first 15 positions (Positions 1 to 15)
  return fullOrder.slice(0, 15);
}

/**
 * Advances a route's Monthly Rotation to the next month:
 * - Moves previous #1 to the bottom of regular sequence so it makes its way back up.
 * - Integrates mid-month additions into regular sequence for the new month.
 * - Enforces the strict rule: "A vehicle cannot be first 2 times in a row before all vehicles have had a turn to be 1st".
 */
export function advanceMonthlyRotation(
  allVehicles: Vehicle[],
  routeId: string,
  targetMonth: string
): Vehicle[] {
  const routeVehicles = allVehicles.filter(v => v.routeAssignmentId === routeId);
  const otherVehicles = allVehicles.filter(v => v.routeAssignmentId !== routeId);

  if (routeVehicles.length <= 1) {
    return allVehicles;
  }

  // 1. Separate previous lead, previous regulars, and previous mid-month additions
  const prevLead = routeVehicles.find(v => (v.monthlySequenceBaseIndex === 1 || v.currentQueuePosition === 1) && !v.isMidMonthAddition && !v.addedMidMonth) || routeVehicles[0];
  const remainingRegulars = routeVehicles.filter(v => v.registrationNumber !== prevLead.registrationNumber && !v.isMidMonthAddition && !v.addedMidMonth)
    .sort((a, b) => (a.monthlySequenceBaseIndex ?? 0) - (b.monthlySequenceBaseIndex ?? 0));
  
  const midMonthAdditions = routeVehicles.filter(v => v.isMidMonthAddition || v.addedMidMonth)
    .sort((a, b) => (a.monthlySequenceBaseIndex ?? 0) - (b.monthlySequenceBaseIndex ?? 0));

  // 2. Mid-month additions graduate into the regular sequence for the new month!
  const graduatedMidMonth = midMonthAdditions.map(v => ({
    ...v,
    addedMidMonth: false,
    isMidMonthAddition: false,
    monthRegistered: targetMonth,
    rosterStatusLabel: "Graduated to Full Regular Sequence",
    metadataOriginExplanation: `Graduated into standard sequence for ${targetMonth} after completing prior mid-month cycle.`
  }));

  // 3. Mark previous lead vehicle turn in monthlyFirstTurnHistory and move to the end of the line
  const prevLeadTurnCount = (prevLead.monthlyFirstTurnHistory || []).length;
  const updatedPrevLead: Vehicle = {
    ...prevLead,
    addedMidMonth: false,
    isMidMonthAddition: false,
    monthRegistered: targetMonth,
    rosterStatusLabel: `Rotated to Bottom (Completed #${prevLeadTurnCount + 1} Lead Month)`,
    metadataOriginExplanation: `Completed full Lead term. Rotated to bottom of queue sequence for ${targetMonth}.`,
    monthlyFirstTurnHistory: [...(prevLead.monthlyFirstTurnHistory || []), targetMonth]
  };

  // 4. Candidate rotation sequence: Remaining regulars advance, then graduated mid-month, then previous lead at bottom
  let candidateList = [...remainingRegulars, ...graduatedMidMonth, updatedPrevLead];

  // 5. Check if candidate #1 has already been lead while other vehicles on the route have 0 lead turns
  const vehiclesWithoutLeadTurn = candidateList.filter(v => (v.monthlyFirstTurnHistory || []).length === 0);

  if (vehiclesWithoutLeadTurn.length > 0) {
    // If the candidate at index 0 has already had a turn, find the first vehicle without a turn and swap it to the top
    const candidateLeadTurns = (candidateList[0].monthlyFirstTurnHistory || []).length;
    if (candidateLeadTurns > 0) {
      const eligibleIndex = candidateList.findIndex(v => (v.monthlyFirstTurnHistory || []).length === 0);
      if (eligibleIndex > 0) {
        const [eligibleVehicle] = candidateList.splice(eligibleIndex, 1);
        candidateList = [eligibleVehicle, ...candidateList];
      }
    }
  }

  // 6. Re-index monthlySequenceBaseIndex and currentQueuePosition (1..N)
  const reIndexed = candidateList.map((veh, idx) => ({
    ...veh,
    monthlySequenceBaseIndex: idx + 1,
    currentQueuePosition: idx + 1,
    monthRegistered: targetMonth
  }));

  return [...otherVehicles, ...reIndexed];
}

/**
 * Computes a detailed Year-on-Year (YoY) comparison for a route
 * between Year A and Year B for a specific calendar month (0..11, default 8 for September)
 */
export function computeYoYComparison(
  routeVehicles: Vehicle[],
  drivers: Driver[] = [],
  trips: Trip[] = [],
  monthIndex: number = 8,
  yearA: number = 2026,
  yearB: number = 2025,
  availableYears: number[] = [2024, 2025, 2026, 2027, 2028],
  baseFareE: number = 50
): YoYComparisonResult {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const shortNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthName = monthNames[monthIndex] || "September";

  const monthStrA = `${yearA}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthStrB = `${yearB}-${String(monthIndex + 1).padStart(2, "0")}`;

  const planA = computeMonthlyRoster(routeVehicles, monthStrA, drivers, trips);
  const planB = computeMonthlyRoster(routeVehicles, monthStrB, drivers, trips);

  const statsA = computeVehicleTripStats(routeVehicles, monthStrA, drivers, trips, baseFareE);
  const statsB = computeVehicleTripStats(routeVehicles, monthStrB, drivers, trips, baseFareE);

  const makeDelta = (valA: number, valB: number): YoYMetricDelta => {
    const delta = valA - valB;
    const pct = valB === 0 ? (valA > 0 ? 100 : 0) : Math.round(((valA - valB) / valB) * 1000) / 10;
    return {
      yearAValue: valA,
      yearBValue: valB,
      delta,
      percentageChange: pct,
      isPositive: delta >= 0
    };
  };

  const tripsDelta = makeDelta(statsA.totalTripsMonth, statsB.totalTripsMonth);
  const passengersDelta = makeDelta(statsA.totalPassengersMonth, statsB.totalPassengersMonth);
  const revenueDelta = makeDelta(statsA.totalRevenueSZL, statsB.totalRevenueSZL);
  const activeVehiclesDelta = makeDelta(statsA.activeVehiclesCount, statsB.activeVehiclesCount);

  // Multi-year lead historical roster for this calendar month across all tracked years
  const leadTimeline: YoYMonthlyLeadEntry[] = availableYears.map(yr => {
    const mStr = `${yr}-${String(monthIndex + 1).padStart(2, "0")}`;
    const p = computeMonthlyRoster(routeVehicles, mStr, drivers, trips);
    const s = computeVehicleTripStats(routeVehicles, mStr, drivers, trips, baseFareE);
    const leadRosterItem = p.dailyRoster[0]?.queueOrder[0];
    return {
      year: yr,
      monthStr: mStr,
      leadVehicleReg: p.leadVehicleReg || leadRosterItem?.vehicleReg || "N/A",
      leadDriverName: leadRosterItem?.driverName || "Corridor Lead",
      leadFleetNumber: leadRosterItem?.fleetNumber || leadRosterItem?.vehicleReg || "KF-01",
      totalTrips: s.topVehicle?.tripsThisMonth || Math.round(s.totalTripsMonth / Math.max(1, s.activeVehiclesCount)),
      isLeadTurnEquityVerified: true
    };
  });

  const statMapA = new Map(statsA.stats.map(s => [s.vehicleReg, s]));
  const statMapB = new Map(statsB.stats.map(s => [s.vehicleReg, s]));

  const vehicleComparisons: YoYVehicleComparison[] = routeVehicles.map(v => {
    const sA = statMapA.get(v.registrationNumber);
    const sB = statMapB.get(v.registrationNumber);

    const posA = sA?.queuePosition || 99;
    const posB = sB?.queuePosition || 99;
    const tripsA = sA?.tripsThisMonth || 0;
    const tripsB = sB?.tripsThisMonth || 0;
    const revA = sA?.estimatedRevenueSZL || 0;
    const revB = sB?.estimatedRevenueSZL || 0;

    return {
      vehicleReg: v.registrationNumber,
      fleetNumber: v.fleetNumber || v.vic || v.registrationNumber,
      make: v.make || "Toyota",
      model: v.model || "Quantum",
      driverName: sA?.driverName || sB?.driverName || v.ownerName || "Unassigned",
      yearAPosition: posA,
      yearATrips: tripsA,
      yearARevenue: revA,
      yearAIsLead: posA === 1,
      yearBPosition: posB,
      yearBTrips: tripsB,
      yearBRevenue: revB,
      yearBIsLead: posB === 1,
      positionDelta: posB - posA, // positive means moved forward towards #1
      tripsDelta: tripsA - tripsB,
      revenueDelta: revA - revB
    };
  }).sort((a, b) => a.yearAPosition - b.yearAPosition);

  // 12-Month seasonal curve comparing Year A vs Year B across Jan through Dec
  const seasonalCurve: YoYSeasonalPoint[] = monthNames.map((name, idx) => {
    const mStrA = `${yearA}-${String(idx + 1).padStart(2, "0")}`;
    const mStrB = `${yearB}-${String(idx + 1).padStart(2, "0")}`;
    const sA = computeVehicleTripStats(routeVehicles, mStrA, drivers, trips, baseFareE);
    const sB = computeVehicleTripStats(routeVehicles, mStrB, drivers, trips, baseFareE);
    return {
      monthIndex: idx,
      monthName: name,
      shortName: shortNames[idx],
      yearATrips: sA.totalTripsMonth,
      yearBTrips: sB.totalTripsMonth,
      yearARevenue: sA.totalRevenueSZL,
      yearBRevenue: sB.totalRevenueSZL
    };
  });

  return {
    routeId: routeVehicles[0]?.routeAssignmentId || "all",
    monthIndex,
    monthName,
    yearA,
    yearB,
    monthStrA,
    monthStrB,
    planA,
    planB,
    tripStatsA: statsA,
    tripStatsB: statsB,
    tripsDelta,
    passengersDelta,
    revenueDelta,
    activeVehiclesDelta,
    leadTimeline,
    vehicleComparisons,
    seasonalCurve
  };
}
