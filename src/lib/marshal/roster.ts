/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 30-day circular rotation roster computation.
 *
 * Rules:
 *   - Day 1: vehicles ordered by their current sequence index.
 *   - Day N: order shifts by (N-1) % count. The Day 1 #1 is last on Day 2.
 *   - Mid-month additions pinned to tail.
 *   - On rollover, previous #1 rotates to bottom.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { MarshalContext } from "./queries";

export interface RosterVehicle {
  position: number;
  registrationNumber: string;
  vic: string | null;
  driverName: string | null;
  loadingBay: string | null;
  isLead: boolean;
  isMidMonth: boolean;
  metadata: string;
}

export interface RosterDay {
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  dayOfWeekShort: string;
  isToday: boolean;
  vehicles: RosterVehicle[];
}

export interface RouteRoster {
  routeId: string;
  routeOrigin: string;
  routeDestination: string;
  region: string;
  month: string;
  monthName: string;
  year: number;
  totalDays: number;
  cycleEndDate: string;
  vehicles: RosterVehicle[];
  dailyRoster: RosterDay[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function computeRouteRoster(
  context: MarshalContext,
  monthStr?: string
): Promise<RouteRoster | null> {
  if (!context.assignedRouteId) return null;

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const parts = (monthStr ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`).split("-");
  const year = parseInt(parts[0], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = `${MONTH_NAMES[monthIndex]} ${year}`;
  const cycleEndDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`;

  // Fetch route
  const { data: route } = await admin
    .from("routes")
    .select("id, origin, destination, region_code")
    .eq("id", context.assignedRouteId)
    .maybeSingle();

  if (!route) return null;

  // Fetch vehicles on route
  const { data: vehicles } = await admin
    .from("vehicles")
    .select(
      "registration_number, vic, loading_bay, driver_id, current_queue_position, is_mid_month_addition, month_registered, mid_month_join_day"
    )
    .eq("route_assignment_id", context.assignedRouteId)
    .neq("status", "Offline")
    .order("current_queue_position", { ascending: true });

  const vehicleList = vehicles ?? [];

  // Fetch driver names
  const driverIds = vehicleList
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  const driverMap = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name")
      .in("id", driverIds);
    for (const d of drivers ?? []) {
      driverMap.set(d.id as string, d.full_name as string);
    }
  }

  // Partition regular vs mid-month
  const regulars = vehicleList.filter((v) => !v.is_mid_month_addition);
  const midMonth = vehicleList.filter((v) => v.is_mid_month_addition);

  // Build the daily roster
  const dailyRoster: RosterDay[] = [];

  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, monthIndex, day);
    const jsDay = dateObj.getDay();
    const weekdayIdx = (jsDay + 6) % 7;
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday =
      now.getFullYear() === year &&
      now.getMonth() === monthIndex &&
      now.getDate() === day;

    // Circular shift
    const shift = regulars.length > 0 ? (day - 1) % regulars.length : 0;
    const rotated =
      regulars.length > 0
        ? [...regulars.slice(shift), ...regulars.slice(0, shift)]
        : [];

    const queue: RosterVehicle[] = [];

    rotated.forEach((v, idx) => {
      const driverId = v.driver_id as string | null;
      const isLead = idx === 0;
      queue.push({
        position: idx + 1,
        registrationNumber: v.registration_number as string,
        vic: (v.vic as string | null) ?? null,
        driverName: driverId ? driverMap.get(driverId) ?? null : null,
        loadingBay: (v.loading_bay as string | null) ?? null,
        isLead,
        isMidMonth: false,
        metadata: isLead
          ? day === 1
            ? `Day 1 lead for ${monthName}`
            : `Lead (advanced from #2 on Day ${day - 1})`
          : day === 2 && v.registration_number === regulars[0]?.registration_number
          ? `Rotated from Day 1 #1 to last on Day 2`
          : `Position #${idx + 1} on Day ${day}`,
      });
    });

    midMonth.forEach((v, idx) => {
      const driverId = v.driver_id as string | null;
      queue.push({
        position: rotated.length + idx + 1,
        registrationNumber: v.registration_number as string,
        vic: (v.vic as string | null) ?? null,
        driverName: driverId ? driverMap.get(driverId) ?? null : null,
        loadingBay: (v.loading_bay as string | null) ?? null,
        isLead: false,
        isMidMonth: true,
        metadata: `Mid-month addition, locked to tail for ${monthName}`,
      });
    });

    dailyRoster.push({
      dayNumber: day,
      date: dateStr,
      dayOfWeek: DAYS[weekdayIdx],
      dayOfWeekShort: DAYS_SHORT[weekdayIdx],
      isToday,
      vehicles: queue,
    });
  }

  return {
    routeId: route.id as string,
    routeOrigin: route.origin as string,
    routeDestination: route.destination as string,
    region: route.region_code as string,
    month: monthStr ?? `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthName,
    year,
    totalDays,
    cycleEndDate,
    vehicles: regulars.map((v, idx) => ({
      position: idx + 1,
      registrationNumber: v.registration_number as string,
      vic: (v.vic as string | null) ?? null,
      driverName: (v.driver_id as string | null)
        ? driverMap.get(v.driver_id as string) ?? null
        : null,
      loadingBay: (v.loading_bay as string | null) ?? null,
      isLead: idx === 0,
      isMidMonth: false,
      metadata: `Base position #${idx + 1}`,
    })),
    dailyRoster,
  };
}
