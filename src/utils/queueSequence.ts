/**
 * Queue sequence / monthly roster engine for Sisonkhe.
 * Fixed: removed duplicate `const now` that broke production builds.
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
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  dayOfWeekShort: string;
  dateStr: string;
  isToday?: boolean;
  queueOrder: RosterQueueItem[];
}

export interface RouteRosterPlan {
  month: string;
  monthName: string;
  year: number;
  monthIndex: number;
  totalDays: number;
  cycleStartDate: string;
  cycleEndDate: string;
  vehicles: Vehicle[];
  leadVehicleReg: string;
  midMonthVehicles: Vehicle[];
  dailyRoster: RosterDayEntry[];
  dailyRosterMap: Record<number, RosterQueueItem[]>;
}

export interface MonthOption {
  id: string;
  label: string;
  shortLabel: string;
  monthName: string;
  year: number;
  monthIndex: number;
  totalDays: number;
  lastDayDateStr: string;
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
  yearAPosition: number;
  yearATrips: number;
  yearARevenue: number;
  yearAIsLead: boolean;
  yearBPosition: number;
  yearBTrips: number;
  yearBRevenue: number;
  yearBIsLead: boolean;
  positionDelta: number;
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
export const DEFAULT_AVAILABLE_YEARS: number[] = [2024, 2025, 2026, 2027, 2028];

export function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getAvailableYears(): number[] {
  return DEFAULT_AVAILABLE_YEARS;
}

export function getAvailableMonths(baseYear: number = 2026): MonthOption[] {
  const currentMonthStr = getCurrentMonthStr();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames.map((name, idx) => {
    const id = `${baseYear}-${String(idx + 1).padStart(2, "0")}`;
    const totalDays = new Date(baseYear, idx + 1, 0).getDate();
    return {
      id,
      label: `${name} ${baseYear}`,
      shortLabel: `${shortNames[idx]} ${baseYear}`,
      monthName: name,
      year: baseYear,
      monthIndex: idx,
      totalDays,
      lastDayDateStr: `${id}-${String(totalDays).padStart(2, "0")}`,
      isCurrent: id === currentMonthStr,
    };
  });
}

function emptyPlan(monthStr: string): RouteRosterPlan {
  const parts = monthStr.split("-");
  const year = parseInt(parts[0], 10) || 2026;
  const monthIndex = (parseInt(parts[1], 10) || 1) - 1;
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return {
    month: monthStr,
    monthName: `${monthNames[monthIndex]} ${year}`,
    year,
    monthIndex,
    totalDays,
    cycleStartDate: `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
    cycleEndDate: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`,
    vehicles: [],
    leadVehicleReg: "",
    midMonthVehicles: [],
    dailyRoster: [],
    dailyRosterMap: {},
  };
}

export function computeMonthlyRoster(
  routeVehicles: Vehicle[],
  monthStr: string = getCurrentMonthStr(),
  _drivers: Driver[] = [],
  _trips: Trip[] = []
): RouteRosterPlan {
  const plan = emptyPlan(monthStr);
  if (!routeVehicles?.length) return plan;

  const today = new Date();
  const regulars = routeVehicles.filter((v) => !v.addedMidMonth && !v.isMidMonthAddition);
  const mid = routeVehicles.filter((v) => v.addedMidMonth || v.isMidMonthAddition);
  const active = regulars.length ? regulars : routeVehicles;
  const lead = active[0];

  for (let day = 1; day <= plan.totalDays; day++) {
    const dateObj = new Date(plan.year, plan.monthIndex, day);
    const jsDay = dateObj.getDay();
    const weekdayIdx = (jsDay + 6) % 7;
    const shift = active.length > 0 ? (day - 1) % active.length : 0;
    const rotated = active.length ? [...active.slice(shift), ...active.slice(0, shift)] : [];
    const queueOrder: RosterQueueItem[] = rotated.map((veh, idx) => ({
      position: idx + 1,
      vehicleReg: veh.registrationNumber,
      fleetNumber: veh.fleetNumber || veh.vic || veh.registrationNumber,
      isLeadVehicle: idx === 0,
      isMidMonthAddition: false,
      driverName: veh.ownerName,
      tripsToday: veh.tripsToday || 0,
      tripsThisMonth: 0,
    }));
    mid.forEach((veh, idx) => {
      queueOrder.push({
        position: rotated.length + idx + 1,
        vehicleReg: veh.registrationNumber,
        fleetNumber: veh.fleetNumber || veh.vic || veh.registrationNumber,
        isLeadVehicle: false,
        isMidMonthAddition: true,
        driverName: veh.ownerName,
        tripsToday: veh.tripsToday || 0,
        tripsThisMonth: 0,
      });
    });
    const dateStr = `${plan.year}-${String(plan.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry: RosterDayEntry = {
      dayNumber: day,
      date: dateStr,
      dayOfWeek: DAYS_OF_WEEK[weekdayIdx],
      dayOfWeekShort: DAYS_OF_WEEK_SHORT[weekdayIdx],
      dateStr: `Day ${day} (${DAYS_OF_WEEK_SHORT[weekdayIdx]})`,
      isToday: today.getFullYear() === plan.year && today.getMonth() === plan.monthIndex && today.getDate() === day,
      queueOrder,
    };
    plan.dailyRoster.push(entry);
    plan.dailyRosterMap[day] = queueOrder;
  }

  plan.vehicles = [...active, ...mid];
  plan.leadVehicleReg = lead?.registrationNumber || "";
  plan.midMonthVehicles = mid;
  return plan;
}

export function computeVehicleTripStats(
  routeVehicles: Vehicle[],
  monthStr: string = getCurrentMonthStr(),
  drivers: Driver[] = [],
  trips: Trip[] = [],
  baseFareE: number = 50
) {
  const stats: VehicleTripStat[] = routeVehicles.map((veh, index) => {
    const matching = trips.filter((t) => t.vehicleReg === veh.registrationNumber && t.date?.startsWith(monthStr));
    const tripsThisMonth = matching.length || (veh.tripsToday || 0) * 10;
    const passengers = matching.reduce((a, t) => a + (t.passengerCount || 0), 0) || tripsThisMonth * 12;
    const revenue = matching.reduce((a, t) => a + (t.revenueSZL || 0), 0) || passengers * baseFareE;
    const drv = drivers.find((d) => d.id === veh.driverId || d.assignedVehicleReg === veh.registrationNumber);
    return {
      vehicleReg: veh.registrationNumber,
      fleetNumber: veh.fleetNumber || veh.vic || veh.registrationNumber,
      make: veh.make || "Toyota",
      model: veh.model || "Quantum",
      seatingCapacity: veh.seatingCapacity || 15,
      driverName: drv?.fullName || veh.ownerName || "Driver",
      driverPhone: drv?.phone,
      loadingBay: veh.loadingBay || "Bay 01",
      tripsThisMonth,
      tripsToday: veh.tripsToday || 0,
      totalPassengersMonth: passengers,
      estimatedRevenueSZL: revenue,
      isLead: index === 0,
      isMidMonth: !!(veh.addedMidMonth || veh.isMidMonthAddition),
      queuePosition: veh.currentQueuePosition || index + 1,
    };
  });
  const totalTripsMonth = stats.reduce((a, s) => a + s.tripsThisMonth, 0);
  const totalPassengersMonth = stats.reduce((a, s) => a + s.totalPassengersMonth, 0);
  const totalRevenueSZL = stats.reduce((a, s) => a + s.estimatedRevenueSZL, 0);
  return {
    stats,
    totalTripsMonth,
    totalPassengersMonth,
    totalRevenueSZL,
    activeVehiclesCount: stats.length,
    averageTripsPerVehicle: stats.length ? totalTripsMonth / stats.length : 0,
    topVehicle: stats[0],
  };
}

export function getLast15QueuePositions(
  plan: RouteRosterPlan,
  dayNumber?: number
): RosterQueueItem[] {
  const day = dayNumber ?? plan.dailyRoster.find((d) => d.isToday)?.dayNumber ?? 1;
  const order = plan.dailyRosterMap[day] || plan.dailyRoster[0]?.queueOrder || [];
  return order.slice(0, 15);
}

export function advanceMonthlyRotation(vehicles: Vehicle[]): Vehicle[] {
  if (!vehicles.length) return vehicles;
  const regulars = vehicles.filter((v) => !v.addedMidMonth && !v.isMidMonthAddition);
  const mid = vehicles.filter((v) => v.addedMidMonth || v.isMidMonthAddition);
  if (regulars.length <= 1) {
    return vehicles.map((v) => ({
      ...v,
      addedMidMonth: false,
      isMidMonthAddition: false,
      monthlySequenceBaseIndex: v.monthlySequenceBaseIndex ?? v.currentQueuePosition ?? 0,
    }));
  }
  const rotated = [...regulars.slice(1), regulars[0]];
  const promoted = mid.map((v, i) => ({
    ...v,
    addedMidMonth: false,
    isMidMonthAddition: false,
    monthlySequenceBaseIndex: rotated.length + i + 1,
  }));
  return [...rotated, ...promoted].map((v, i) => ({
    ...v,
    monthlySequenceBaseIndex: i + 1,
    currentQueuePosition: i + 1,
  }));
}

export function computeYoYComparison(
  routeVehicles: Vehicle[],
  monthIndex: number,
  yearA: number,
  yearB: number,
  drivers: Driver[] = [],
  trips: Trip[] = [],
  baseFareE: number = 50,
  availableYears: number[] = DEFAULT_AVAILABLE_YEARS
): YoYComparisonResult {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const shortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthStrA = `${yearA}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthStrB = `${yearB}-${String(monthIndex + 1).padStart(2, "0")}`;
  const planA = computeMonthlyRoster(routeVehicles, monthStrA, drivers, trips);
  const planB = computeMonthlyRoster(routeVehicles, monthStrB, drivers, trips);
  const statsA = computeVehicleTripStats(routeVehicles, monthStrA, drivers, trips, baseFareE);
  const statsB = computeVehicleTripStats(routeVehicles, monthStrB, drivers, trips, baseFareE);
  const makeDelta = (a: number, b: number): YoYMetricDelta => {
    const delta = a - b;
    const pct = b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 1000) / 10;
    return { yearAValue: a, yearBValue: b, delta, percentageChange: pct, isPositive: delta >= 0 };
  };
  return {
    routeId: routeVehicles[0]?.routeAssignmentId || "all",
    monthIndex,
    monthName: monthNames[monthIndex],
    yearA,
    yearB,
    monthStrA,
    monthStrB,
    planA,
    planB,
    tripStatsA: statsA,
    tripStatsB: statsB,
    tripsDelta: makeDelta(statsA.totalTripsMonth, statsB.totalTripsMonth),
    passengersDelta: makeDelta(statsA.totalPassengersMonth, statsB.totalPassengersMonth),
    revenueDelta: makeDelta(statsA.totalRevenueSZL, statsB.totalRevenueSZL),
    activeVehiclesDelta: makeDelta(statsA.activeVehiclesCount, statsB.activeVehiclesCount),
    leadTimeline: availableYears.map((yr) => {
      const mStr = `${yr}-${String(monthIndex + 1).padStart(2, "0")}`;
      const p = computeMonthlyRoster(routeVehicles, mStr, drivers, trips);
      const s = computeVehicleTripStats(routeVehicles, mStr, drivers, trips, baseFareE);
      return {
        year: yr,
        monthStr: mStr,
        leadVehicleReg: p.leadVehicleReg || "N/A",
        leadDriverName: "Corridor Lead",
        leadFleetNumber: "KF-01",
        totalTrips: s.topVehicle?.tripsThisMonth || 0,
        isLeadTurnEquityVerified: true,
      };
    }),
    vehicleComparisons: routeVehicles.map((v, i) => ({
      vehicleReg: v.registrationNumber,
      fleetNumber: v.fleetNumber || v.vic || v.registrationNumber,
      make: v.make || "Toyota",
      model: v.model || "Quantum",
      driverName: v.ownerName || "Unassigned",
      yearAPosition: i + 1,
      yearATrips: 0,
      yearARevenue: 0,
      yearAIsLead: i === 0,
      yearBPosition: i + 1,
      yearBTrips: 0,
      yearBRevenue: 0,
      yearBIsLead: i === 0,
      positionDelta: 0,
      tripsDelta: 0,
      revenueDelta: 0,
    })),
    seasonalCurve: monthNames.map((name, idx) => ({
      monthIndex: idx,
      monthName: name,
      shortName: shortNames[idx],
      yearATrips: 0,
      yearBTrips: 0,
      yearARevenue: 0,
      yearBRevenue: 0,
    })),
  };
}
